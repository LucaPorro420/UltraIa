"""Orquestador end-to-end del pipeline audiovisual árabe.

Flujo (requisitos funcionales RF-01 a RF-08):

    RF-01 idea/tema -> LLM -> JSON estricto (guion diacritizado + plano + shots)
    RF-02 script_arabic_diacritized -> preprocess_arabic_for_tts (puntuación)
    RF-04 -> ElevenLabs /v1/text-to-speech -> output/audio/<title>.mp3
    RF-05 cada shot -> DALL-E 3 o FLUX -> output/images/shot_N.png
    RF-06 -> Runway (o Fal.ai Kling) text-to-video/image-to-video
    RF-07 polling con backoff y manejo de FAILED/429
    RF-08 -> manifiesto de URLs -> output/video/manifest.json

Modo --dry-run: simula cada paso sin claves API (para CI/pruebas locales).
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from pathlib import Path

from . import assembly as assembly_mod
from . import audio as audio_mod
from . import cache as cache_mod
from . import images as images_mod
from . import llm as llm_mod
from . import video as video_mod
from .config import OUTPUT_DIR, Settings, ensure_output_dirs, get_settings, require_key


def has_paid_video(settings: Settings) -> bool:
    """True si hay clave de video premium configurada (Runway o Fal.ai)."""
    if settings.video_provider == "fal":
        return bool(settings.fal_key_id and settings.fal_key_secret)
    return bool(settings.runway_api_key)


@dataclass
class PipelineResult:
    """Resumen estructurado de una ejecución completa del pipeline."""

    title: str
    script_json: dict
    audio_path: Path | None = None
    images: dict[int, Path] = field(default_factory=dict)
    videos: dict[int, str] = field(default_factory=dict)
    assembled_path: Path | None = None
    dry_run: bool = False

    def to_manifest(self) -> dict:
        return {
            "title": self.title,
            "dry_run": self.dry_run,
            "audio": str(self.audio_path) if self.audio_path else None,
            "images": {str(k): str(v) for k, v in self.images.items()},
            "videos": {str(k): v for k, v in self.videos.items()},
            "assembled": str(self.assembled_path) if self.assembled_path else None,
        }


class Pipeline:
    """Ejecuta el pipeline paso a paso con dependencias inyectadas."""

    def __init__(self, settings: Settings | None = None, dry_run: bool = False):
        self.settings = settings or get_settings()
        self.dry_run = dry_run
        self.dirs = ensure_output_dirs()
        self.steps: set[str] = {"all"}
        self.use_cache = True

    def _log(self, step: str) -> None:
        print(f"\n--- {step} {'[DRY-RUN]' if self.dry_run else ''} ---")

    def run(self, topic: str, steps: set[str] | None = None) -> PipelineResult:
        """Ejecuta el pipeline completo: guion -> audio -> imágenes -> video -> ensamblado.

        Args:
            topic: idea a desarrollar.
            steps: subconjunto de {"audio", "images", "video", "assembly", "all"}.
        """
        if steps:
            self.steps = steps

        def active(step: str) -> bool:
            return "all" in self.steps or step in self.steps

        self._log("1. Generando guion y prompts visuales (LLM)")
        script = self._step_script(topic)
        print(json.dumps(script, indent=2, ensure_ascii=False))

        result = PipelineResult(title=script["title"], script_json=script, dry_run=self.dry_run)

        if active("audio"):
            self._log("2. Generando audio en ElevenLabs")
            result.audio_path = self._step_audio(script)

        if active("images"):
            self._log("3. Generando imágenes por shot")
            result.images = self._step_images(script)

        if active("video"):
            self._log("4. Generando video por shot (Runway/Fal.ai, o slideshow local sin keys)")
            result.videos = asyncio.run(self._step_videos(script, result.images))

        if active("assembly"):
            self._log("5. Ensamblando MP4 final (video + audio + subtítulos)")
            result.assembled_path = self._step_assembly(script, result)

        self._log("6. Guardando manifiesto")
        manifest_path = self._save_manifest(result)
        print(f"\nManifiesto final: {manifest_path}")
        return result

    # ------------------------------------------------------------------ pasos

    def _step_script(self, topic: str) -> dict:
        """Guion JSON con caché de prompts (RF-10): evita créditos duplicados."""
        if self.dry_run:
            lang = audio_mod.lang_code(self.settings.language_target)
            return self._mock_script(topic, language=lang)
        prompt_key = f"topic::{topic}::model::{self.settings.llm_model}"
        return cache_mod.cached_call(
            prompt_key,
            llm_mod.generate_script_json,
            topic,
            self.settings,
            use_cache=self.use_cache,
        )

    def _step_audio(self, script: dict) -> Path | None:
        text = _script_text(script)
        if self.dry_run:
            print(f"  [simulado] TTS de: {text[:80]}...")
            path = self.dirs["audio"] / f"{_safe(script['title'])}.mp3"
            path.write_bytes(b"")  # placeholder
            return path
        if self.settings.elevenlabs_api_key:
            audio_bytes = audio_mod.generate_audio(text, self.settings)
        else:
            audio_bytes = audio_mod.generate_audio_free(
                text, self.settings.language_target
            )
        path = audio_mod.save_audio(audio_bytes, self.dirs["audio"], script["title"])
        audio_mod.postprocess_audio(path)
        return path

    def _step_images(self, script: dict) -> dict[int, Path]:
        provider = self.settings.image_provider
        if provider not in {"openai", "fal", "pollinations"}:
            provider = "pollinations"
        images: dict[int, Path] = {}
        for shot in script["shot_list"]:
            shot_id = shot["shot_id"]
            prompt = f"{shot['visual_prompt_en']}, {shot.get('camera_movement', '')}"
            if self.dry_run:
                path = self.dirs["images"] / f"shot_{shot_id}.png"
                path.write_bytes(b"")  # placeholder
                images[shot_id] = path
                print(f"  [simulado] imagen shot {shot_id}: {prompt[:80]}...")
                continue
            url = images_mod.generate_image(prompt, self.settings, provider)
            images[shot_id] = images_mod.download_image(url, self.dirs["images"], f"shot_{shot_id}")
            print(f"  Imagen shot {shot_id}: {images[shot_id]}")
        return images

    async def _step_videos(self, script: dict, images: dict[int, Path] | None = None) -> dict[int, str]:
        videos: dict[int, str] = {}
        provider = self.settings.video_provider
        has_paid_key = (
            self.settings.fal_key_id if provider == "fal" else self.settings.runway_api_key
        )
        for shot in script["shot_list"]:
            shot_id = shot["shot_id"]
            prompt = shot["visual_prompt_en"]
            if self.dry_run:
                videos[shot_id] = f"https://mock.invalid/video/{shot_id}"
                print(f"  [simulado] video shot {shot_id}: {prompt[:80]}...")
                continue
            if has_paid_key:
                url = await self._generate_one_video(prompt)
            else:
                url = self._free_slideshow(shot_id, images, shot.get("duration_sec", 5))
            videos[shot_id] = url
            print(f"  Video shot {shot_id}: {url}")
        return videos

    def _free_slideshow(self, shot_id: int, images: dict[int, Path] | None, duration_sec: int) -> str:
        """Fallback sin API key: clip local desde la imagen del shot (ffmpeg zoompan)."""
        image = (images or {}).get(shot_id)
        if image is None or not image.exists():
            raise RuntimeError(
                f"Sin RUNWAY/FAL_API_KEY y sin imagen local para shot {shot_id}: "
                "ejecuta primero el paso images."
            )
        out = self.dirs["video"] / f"shot_{shot_id}.mp4"
        motion = _MOTIONS_BY_SHOT[shot_id % len(_MOTIONS_BY_SHOT)]
        return video_mod.generate_slideshow(
            image, out, duration_sec=int(duration_sec or 5), motion=motion
        )

    async def _generate_one_video(self, prompt: str) -> str:
        s = self.settings
        if s.video_provider == "fal":
            require_key("FAL_KEY_ID", s.fal_key_id)
            request_id = video_mod.trigger_fal_video(prompt, s)
            result_url = images_mod.wait_for_fal_result(request_id, s)
            payload = images_mod.fetch_fal_json(result_url, s)
            url = video_mod.get_video_url(payload)
            if not url:
                raise RuntimeError(f"Fal.ai no devolvió URL de video: {payload}")
            return url

        require_key("RUNWAY_API_KEY", s.runway_api_key)
        task_id = video_mod.trigger_runway_video(prompt, s)
        result = await video_mod.poll_task_status(
            task_id,
            s.runway_api_key,
            initial_delay=s.polling_initial_delay,
            max_delay=s.polling_max_delay,
            max_retries=s.polling_max_retries,
        )
        url = video_mod.get_video_url(result)
        if not url:
            raise RuntimeError(f"Runway no devolvió URL de video: {result}")
        return url

    # ---------------------------------------------------------------- helpers

    def _step_assembly(self, script: dict, result: PipelineResult) -> Path | None:
        """RF-11: descarga los videos por shot, concatena, genera SRT y une con audio."""
        shots = script["shot_list"]
        if not result.videos:
            print("  Sin videos generados; ensamblado omitido.")
            return None

        # 1) Descarga de videos (Runway/Fal.ai entregan URLs)
        local_videos: list[Path] = []
        for shot in shots:
            url = result.videos.get(shot["shot_id"])
            if not url:
                continue
            dest = self.dirs["video"] / f"shot_{shot['shot_id']}.mp4"
            if self.dry_run:
                dest.write_bytes(b"")
                local_videos.append(dest)
                continue
            if url.startswith("https://mock.invalid"):
                continue
            if not dest.exists():
                print(f"  Descargando video shot {shot['shot_id']}...")
                assembly_mod.download_media(url, dest)
            local_videos.append(dest)

        if not local_videos:
            print("  No hay videos locales para ensamblar.")
            return None

        # 2) Concatenación de shots (mismo códec -> -c copy; crossfade si son
        #    clips locales keyless generados por el mismo ffmpeg)
        joined = self.dirs["video"] / "shots_joined.mp4"
        if not self.dry_run:
            crossfade = 0.5 if not has_paid_video(self.settings) else 0.0
            assembly_mod.concat_videos(local_videos, joined, crossfade_sec=crossfade)
        else:
            joined.write_bytes(b"")

        # 3) Subtítulos SRT desde el guion plano (sin diacríticos)
        srt_path = self.dirs["video"] / "subtitles.srt"
        assembly_mod.generate_srt(_script_text(script), shots, srt_path)
        print(f"  SRT generado: {srt_path}")

        # 4) Merge final con audio (si existe)
        if result.audio_path is not None and result.audio_path.exists():
            final_dir = OUTPUT_DIR / "assembled"
            final_dir.mkdir(parents=True, exist_ok=True)
            final = final_dir / f"{_safe(result.title)}_final.mp4"
            if not self.dry_run:
                final = assembly_mod.merge_audio_video_subtitles(
                    str(joined), str(result.audio_path), str(final), str(srt_path)
                )
            else:
                final.write_bytes(b"")
            return final

        print(f"  Sin audio; video concatenado disponible en: {joined}")
        return joined

    def _save_manifest(self, result: PipelineResult) -> Path:
        path = self.dirs["video"] / "manifest.json"
        path.write_text(
            json.dumps(result.to_manifest(), indent=2, ensure_ascii=False), encoding="utf-8"
        )
        return path

    @staticmethod
    def _mock_script(topic: str, language: str = "ar") -> dict:
        """Guion de ejemplo para --dry-run (misma estructura que el JSON real).

        Se adapta al idioma configurado: para árabe incluye diacríticos; para el
        resto usa el mismo texto en los campos plano y diacritizado.
        """
        if language == "ar":
            plain = "في قلب الصحراء، تنهض مدينة المستقبل لترسم آفاقاً جديدة."
            diacritized = (
                "فِي قَلْبِ الصَّحْرَاءِ، تَنَهَضُ مَدِينَةُ الْمُسْتَقْبَلِ "
                "لِتَرْسُمَ آفَاقاً جَدِيدَةً."
            )
            title = "مستقبل المدن الذكية"
        else:
            names = {
                "es": ("El futuro de las ciudades inteligentes",
                       "En el corazón del desierto, la ciudad del futuro se alza para dibujar nuevos horizontes."),
                "en": ("The Future of Smart Cities",
                       "In the heart of the desert, the city of the future rises to chart new horizons."),
                "fr": ("L'avenir des villes intelligentes",
                       "Au cœur du désert, la ville du futur se dresse pour dessiner de nouveaux horizons."),
                "pt": ("O futuro das cidades inteligentes",
                       "No coração do deserto, a cidade do futuro ergue-se para traçar novos horizontes."),
                "de": ("Die Zukunft intelligenter Städte",
                       "Mitten in der Wüste erhebt sich die Stadt der Zukunft, um neue Horizonte zu ziehen."),
                "it": ("Il futuro delle città intelligenti",
                       "Nel cuore del deserto, la città del futuro si erge per tracciare nuovi orizzonti."),
                "ja": ("スマートシティの未来", "砂漠の中心で、未来の都市が新たな地平を描くために立ち上がる。"),
                "zh": ("智慧城市的未来", "在沙漠中心，未来的城市拔地而起，绘制新的地平线。"),
                "hi": ("स्मार्ट शहरों का भविष्य", "रेगिस्तान के दिल में, भविष्य का शहर नए क्षितिज बनाने के लिए उभरता है।"),
                "ru": ("Будущее умных городов", "В сердце пустыни город будущего возвышается, чтобы начертать новые горизонты."),
            }
            title, plain = names.get(language, names["en"])
            diacritized = plain

        return {
            "title": title,
            "language": language,
            "script_diacritized": diacritized,
            "script_plain": plain,
            "script_arabic_diacritized": diacritized,
            "script_arabic_plain": plain,
            "shot_list": [
                {
                    "shot_id": 1,
                    "duration_sec": 5,
                    "visual_prompt_en": (
                        "Cinematic ultra-wide aerial shot of a futuristic sustainable desert "
                        "city with glowing solar architecture, golden hour lighting, 8k, "
                        "photorealistic."
                    ),
                    "camera_movement": "Slow continuous forward movement",
                },
                {
                    "shot_id": 2,
                    "duration_sec": 5,
                    "visual_prompt_en": (
                        "Close-up of holographic interface in a smart city control "
                        "room, cinematic lighting, 8k, photorealistic."
                    ),
                    "camera_movement": "Zoom In",
                },
            ],
        }


def _safe(title: str) -> str:
    """Sanitiza un título para usarlo como nombre de archivo."""
    return "".join(c if c.isalnum() else "_" for c in title).strip("_") or "audio"


_MOTIONS_BY_SHOT = ["zoom-in", "zoom-out", "pan-right", "pan-left"]


def _script_text(script: dict) -> str:
    """Devuelve el texto plano del guion, con retrocompatibilidad de claves.

    El director multilingüe (v2) produce `script_plain`/`script_diacritized`;
    los guiones legacy usan `script_arabic_plain`/`script_arabic_diacritized`.
    """
    return str(
        script.get("script_plain")
        or script.get("script_arabic_plain")
        or script.get("script_diacritized")
        or script.get("script_arabic_diacritized")
        or ""
    ).strip()