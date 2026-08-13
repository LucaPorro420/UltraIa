"""Ensamblado final: subtítulos SRT + merge FFmpeg (video + audio + subtítulos).

Requisito funcional RF-11: los componentes individuales (videos por shot y
audio MP3) se unen en un solo MP4 final sin abrir editores manuales.

Base verificada: `gemini-code-1786584800510.py` (merge_audio_video_subtitles),
extendida con generación de SRT desde el guion plano y concatenación de shots.

NOTA RTL: el quemado de subtítulos árabes requiere una fuente con soporte árabe
(ej. 'Arial' incluye glifos árabes) y libass; los subtítulos se renderizan RTL.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import requests

from .config import Settings


# ------------------------------------------------------------------ subtítulos

def generate_srt(
    script_plain: str,
    shots: list[dict],
    output_path: Path,
    fade_out_sec: float = 0.5,
) -> Path:
    """Genera un archivo .srt quemando `script_plain` en bloques por shot.

    El tiempo se calcula acumulativamente: cada shot empieza donde terminó el
    anterior (duración declarada en el shot_list), con un pequeño fade al final
    para que el último subtítulo no corte de golpe.

    Args:
        script_plain: texto árabe sin diacríticos (para lectura en pantalla).
        shots: shot_list del guion JSON (cada uno con shot_id y duration_sec).
        output_path: ruta destino del .srt.
        fade_out_sec: margen de salida del último subtítulo.

    Returns:
        La ruta del archivo .srt generado.
    """
    lines = ["1"]
    cursor = 0.0
    for idx, shot in enumerate(shots):
        duration = float(shot.get("duration_sec", 5))
        start = cursor
        end = cursor + duration
        if idx == len(shots) - 1:
            end = max(end - fade_out_sec, start + 0.5)
        lines.append(_srt_timecode(start))
        lines.append(_srt_timecode(end))
        lines.append(script_plain.strip())
        lines.append("")  # separador entre bloques
        cursor = end

    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path


def _srt_timecode(seconds: float) -> str:
    """Convierte segundos (float) a formato SRT: HH:MM:SS,mmm."""
    ms = int(round((seconds - int(seconds)) * 1000))
    s = int(seconds) % 60
    m = (int(seconds) // 60) % 60
    h = int(seconds) // 3600
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ---------------------------------------------------------------------- ffmpeg

def merge_audio_video_subtitles(
    video_path: str,
    audio_path: str,
    output_path: str,
    srt_path: str | None = None,
) -> Path:
    """Combina video y audio ajustando la duración y quemando subtítulos.

    Args:
        video_path: MP4 de entrada (shots concatenados o video único).
        audio_path: MP3 de locución (guion diacritizado).
        output_path: MP4 final con audio y subtítulos quemados.
        srt_path: opcional; si existe, se quema con libass.

    Returns:
        Ruta del MP4 renderizado.

    Raises:
        RuntimeError: si ffmpeg no está instalado o falla la ejecución.
    """
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "ffmpeg no está instalado o no está en el PATH. "
            "Descárgalo desde https://ffmpeg.org/download.html"
        )

    cmd = [
        "ffmpeg",
        "-y",                    # sobrescribir salida si existe
        "-i", video_path,        # entrada video
        "-i", audio_path,        # entrada audio
        "-c:v", "libx264",       # códec video estándar
        "-c:a", "aac",           # códec audio estándar
        "-shortest",             # cortar según el elemento más corto
    ]
    if srt_path:
        cmd += [
            "-vf",
            f"subtitles={srt_path}:force_style='FontSize=24,"
            f"FontName=Arial,PrimaryColour=&H00FFFFFF'",
        ]
    cmd.append(output_path)

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(
            f"Error en FFmpeg: {result.stderr.decode('utf-8', errors='replace')[-1000:]}"
        )
    print(f"Video final renderizado con éxito: {output_path}")
    return Path(output_path)


def concat_videos(video_paths: list[Path], output_path: Path) -> Path:
    """Concatena múltiples shots con demuxer concat (códec idéntico).

    Requisito RF-11: los videos generados por el mismo modelo (p. ej.
    gen3a_turbo) comparten códec, por lo que `-c copy` concatena sin re-encode.

    Args:
        video_paths: lista de MP4 locales a concatenar (en orden de shot).
        output_path: MP4 concatenado.

    Returns:
        Ruta del MP4 concatenado.
    """
    if len(video_paths) == 1:
        shutil.copyfile(video_paths[0], output_path)
        return output_path

    list_file = output_path.with_suffix(".txt")
    list_file.write_text(
        "".join(f"file '{p.as_posix()}'\n" for p in video_paths), encoding="utf-8"
    )
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
           "-c", "copy", str(output_path)]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    list_file.unlink(missing_ok=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Error concatenando videos: {result.stderr.decode('utf-8', errors='replace')[-1000:]}"
        )
    return output_path


def download_media(url: str, output_path: Path) -> Path:
    """Descarga un video/imagen remoto (URL de Runway/Fal.ai) a disco."""
    res = requests.get(url, timeout=300, stream=True)
    res.raise_for_status()
    with output_path.open("wb") as fh:
        for chunk in res.iter_content(chunk_size=1024 * 1024):
            fh.write(chunk)
    return output_path