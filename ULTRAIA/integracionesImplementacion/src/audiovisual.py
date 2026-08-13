"""Solución 4 (high-demand): Video audio-reactive sincronizado con la música.

Requisito funcional RF-17: dado un tema musical (generado con Udio/Suno o
cualquier pista), se detectan los beats (BPM) y se renderiza un video
perfectamente sincronizado con la música:

    modo "waveform"  — visualización de forma de onda animada (ffmpeg showwaves).
    modo "pulse"     — destellos sincronizados a cada beat detectado (drawbox
                       con enable=between(t, b, b+dur) sobre fondo generado).

La detección de beats es 100% Python puro (sin numpy): ffmpeg decodifica a PCM
s16le mono y se calcula la envolvente RMS por ventana de 50 ms con pico simple
de energía. Solo se requiere ffmpeg en el PATH para decodificar/renderizar.

Uso:
    python audiovisual.py pista.mp3 --style pulse --size 1080x1920
    python audiovisual.py pista.mp3 --style waveform
"""
from __future__ import annotations

import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

SAMPLE_RATE = 22050
WINDOW_SEC = 0.05  # ventana de análisis (50 ms -> 20 muestras por segundo)
CHUNK_SAMPLES = int(SAMPLE_RATE * WINDOW_SEC)


# ------------------------------------------------------------ análisis audio

def decode_to_pcm(audio_path: str) -> bytes:
    """Decodifica el audio a PCM s16le mono a 22.05 kHz.

    Para WAV/PCM usa el módulo estándar `wave` (sin ffmpeg); para otros
    formatos (MP3, etc.) requiere ffmpeg en el PATH.
    """
    p = Path(audio_path)
    if p.suffix.lower() == ".wav":
        try:
            import wave

            with wave.open(str(p), "rb") as w:
                channels = w.getnchannels()
                rate = w.getframerate()
                sampwidth = w.getsampwidth()
                raw = w.readframes(w.getnframes())
            # normaliza a s16le mono (solo soporta 16/24-bit PCM)
            if sampwidth == 2:
                if channels == 1 and rate == SAMPLE_RATE:
                    return raw
                values = struct.iter_unpack("<h" if channels == 1 else "<" + "h" * channels, raw)
                mono = []
                for frame in values:
                    mono.append(frame[0] if channels == 1 else sum(frame) // channels)
                return struct.pack(f"<{len(mono)}h", *mono)
        except Exception:
            pass

    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            f"ffmpeg no está instalado (necesario para {p.suffix}). "
            "Descárgalo desde https://www.gyan.dev/ffmpeg/builds/ y añádelo al PATH, "
            "o usa un archivo .wav PCM."
        )
    cmd = [
        "ffmpeg", "-y", "-i", audio_path,
        "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "pipe:1",
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    if result.returncode != 0 or not result.stdout:
        raise RuntimeError(f"No se pudo decodificar el audio: {audio_path}")
    return result.stdout


def rms_envelope(pcm: bytes) -> list[float]:
    """Envolvente RMS por ventana de 50 ms (Python puro, sin numpy)."""
    envelope: list[float] = []
    n_samples = len(pcm) // 2
    n_windows = max(n_samples // CHUNK_SAMPLES, 1)
    values = struct.iter_unpack("<h", pcm)
    for w in range(n_windows):
        acc = 0.0
        for _ in range(CHUNK_SAMPLES):
            try:
                sample = next(values)[0] / 32768.0
            except StopIteration:
                break
            acc += sample * sample
        envelope.append((acc / CHUNK_SAMPLES) ** 0.5)
    return envelope


def detect_beats(audio_path: str, threshold_mult: float = 1.6) -> dict:
    """Detección de beats por energía con ventana móvil.

    Returns:
        {"bpm": float, "beats": [t1, t2, ...], "duration_sec": float}
        `beats` son tiempos en segundos de cada pulso detectado.
    """
    pcm = decode_to_pcm(audio_path)
    envelope = rms_envelope(pcm)
    duration = len(pcm) / 2 / SAMPLE_RATE

    # umbral adaptativo: media local de los últimos ~4 s (o lo disponible)
    block = int(4.0 / WINDOW_SEC)
    global_mean = sum(envelope) / len(envelope)

    beats: list[float] = []
    refractory = 0.0  # evita doble conteo del mismo pulso (250 ms)
    for i in range(1, len(envelope) - 1):
        start = max(0, i - block)
        local_mean = sum(envelope[start:i]) / (i - start)
        threshold = max(local_mean * threshold_mult, global_mean * 0.35)
        t = i * WINDOW_SEC
        if envelope[i] > threshold and envelope[i] > 0.01 and t - refractory >= 0.25:
            beats.append(t)
            refractory = t

    # BPM estimado desde intervalos entre beats
    bpm = 0.0
    if len(beats) > 4:
        intervals = [b2 - b1 for b1, b2 in zip(beats, beats[1:]) if 0.25 < b2 - b1 < 1.5]
        if intervals:
            avg = sum(intervals) / len(intervals)
            bpm = round(60.0 / avg, 1)

    return {"bpm": bpm, "beats": [round(b, 2) for b in beats], "duration_sec": round(duration, 2)}


# ------------------------------------------------------------------ render

def render_waveform(audio_path: str, output_path: str, size: str = "1080x1920") -> Path:
    """Video con la forma de onda animada sincronizada al audio (9:16 default)."""
    cmd = [
        "ffmpeg", "-y", "-i", audio_path,
        "-filter_complex",
        (
            f"[0:a]showwaves=s={size}:mode=cline:rate=30:colors=#00FFAA"
            f",format=yuv420p[out]"
        ),
        "-map", "[out]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "fast", "-c:a", "aac",
        "-shortest", output_path,
    ]
    _run_ffmpeg(cmd, output_path)
    return Path(output_path)


def render_pulse(
    audio_path: str,
    output_path: str,
    beats: list[float],
    bg_color: str = "#0a0a14",
    pulse_color: str = "#7c3aed",
    size: str = "1080x1920",
    flash_sec: float = 0.15,
) -> Path:
    """Video con destellos sincronizados a cada beat.

    Se genera un fondo de color (filter source `color`) y se encadenan
    `drawbox` con `enable=between(t, start, end)` — uno por beat — para que el
    destello aparezca exactamente cuando suena el pulso (RF-17).
    """
    parts = [f"color=c={bg_color}:s={size}:r=30[bg]"]
    prev = "bg"
    for i, beat in enumerate(beats):
        start = max(beat - 0.03, 0.0)
        end = beat + flash_sec
        alpha = 0.28 if i % 2 == 0 else 0.16
        out = f"f{i}"
        parts.append(
            f"[{prev}]drawbox=x=0:y=0:w=iw:h=ih:color={pulse_color}@{alpha}"
            f":t=fill:enable='between(t,{start:.3f},{end:.3f})'[{out}]"
        )
        prev = out
    parts.append(f"[{prev}]format=yuv420p[v]")

    cmd = [
        "ffmpeg", "-y", "-i", audio_path,
        "-filter_complex", ";".join(parts),
        "-map", "[v]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "fast", "-c:a", "aac",
        "-shortest", output_path,
    ]
    _run_ffmpeg(cmd, output_path)
    return Path(output_path)


def _run_ffmpeg(cmd: list[str], output_path: str) -> None:
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(
            f"FFmpeg falló: {result.stderr.decode('utf-8', errors='replace')[-800:]}"
        )
    print(f"Video audio-reactive renderizado: {output_path}")


def build_audio_reactive(
    audio_path: str,
    style: str = "pulse",
    size: str = "1080x1920",
    out_dir: Path | None = None,
) -> dict:
    """Punto de entrada completo: analiza beats y renderiza el video.

    Args:
        audio_path: pista MP3/WAV (p. ej. generada con Udio/Suno).
        style: 'pulse' (destellos por beat) o 'waveform' (onda animada).
        size: dimensión del video (1080x1920 = Shorts vertical).
        out_dir: carpeta de salida (default output/audiovisual/).

    Returns:
        {"bpm", "beats", "duration_sec", "video_path"}
    """
    out_dir = out_dir or (Path(__file__).resolve().parent.parent / "output" / "audiovisual")
    out_dir.mkdir(parents=True, exist_ok=True)

    analysis = detect_beats(audio_path)
    stem = Path(audio_path).stem
    output = out_dir / f"{stem}_{style}.mp4"

    if style == "waveform":
        render_waveform(audio_path, str(output), size)
    else:
        render_pulse(audio_path, str(output), analysis["beats"], size=size)

    return {**analysis, "video_path": str(output)}