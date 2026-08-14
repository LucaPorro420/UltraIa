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
            return self._mock_script(topic)
        prompt_key = f"topic::{topic}::model::{self.settings.llm_model}"
        return cache_mod.cached_call(
            prompt_key,
            llm_mod.generate_script_json,
            topic,
            self.settings,
            use_cache=self.use_cache,
        )

    def _step_audio(self, script: dict) -> Path | None:
        diacritized = script["script_arabic_diacritized"]
        if self.dry_run:
            print(f"  [simulado] TTS de: {diacritized[:80]}...")
            path = self.dirs["audio"] / f"{_safe(script['title'])}.mp3"
            path.write_bytes(b"")  # placeholder
            return path
        if self.settings.elevenlabs_api_key:
            audio_bytes = audio_mod.generate_audio(diacritized, self.settings)
        else:
            audio_bytes = audio_mod.generate_audio_free(diacritized)
        return audio_mod.save_audio(audio_bytes, self.dirs["audio"], script["title"])

    def _step_images(self, script: dict) -> dict[int, Path]:
        provider = "fal" if self.settings.image_provider == "fal" else "openai"
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
        return video_mod.generate_slideshow(image, out, duration_sec=int(duration_sec or 5))

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

        # 2) Concatenación de shots (mismo códec -> -c copy)
        joined = self.dirs["video"] / "shots_joined.mp4"
        if not self.dry_run:
            assembly_mod.concat_videos(local_videos, joined)
        else:
            joined.write_bytes(b"")

        # 3) Subtítulos SRT desde el guion plano (árabe sin diacríticos)
        srt_path = self.dirs["video"] / "subtitles.srt"
        assembly_mod.generate_srt(script["script_arabic_plain"], shots, srt_path)
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
    def _mock_script(topic: str) -> dict:
        """Guion de ejemplo para --dry-run (misma estructura que el JSON real)."""
        return {
            "title": "مستقبل المدن الذكية",
            "script_arabic_diacritized": (
                "فِي قَلْبِ الصَّحْرَاءِ، تَنَهَضُ مَدِينَةُ الْمُسْتَقْبَلِ لِتَرْسُمَ آفَاقاً جَدِيدَةً."
            ),
            "script_arabic_plain": "في قلب الصحراء، تنهض مدينة المستقبل لترسم آفاقاً جديدة.",
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
                        "Close-up of holographic Arabic calligraphy UI in a smart city control "
                        "room, cinematic lighting, 8k, photorealistic."
                    ),
                    "camera_movement": "Zoom In",
                },
            ],
        }


def _safe(title: str) -> str:
    """Sanitiza un título para usarlo como nombre de archivo."""
    return "".join(c if c.isalnum() else "_" for c in title).strip("_") or "audio"