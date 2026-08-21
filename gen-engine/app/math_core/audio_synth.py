"""audio_synth — síntesis de audio procedural SIN GPU, SIN samples, SIN ffmpeg.

Port fiel de `packages/core/src/omag/sound.ts` (FM / ADSR / granular / tone / noise /
impact / whoosh / beat / ambience) más un compositor determinista `music_from_prompt`
que reemplaza el placeholder "composición estructurada" del Gen-Engine por audio REAL
(PCM16 + WAV). Reutilizable también por el bucle de análisis-por-síntesis.
"""
from __future__ import annotations

import io
import wave

import numpy as np

SAMPLE_RATE = 44_100


class SynthResult:
    def __init__(self, pcm: np.ndarray, sample_rate: int, duration_sec: float, kind: str):
        self.pcm = pcm  # int16
        self.sample_rate = sample_rate
        self.duration_sec = duration_sec
        self.kind = kind

    def as_float(self) -> np.ndarray:
        return self.pcm.astype(np.float32) / 32768.0


def mulberry32(seed: int) -> "function":
    a = seed & 0xFFFFFFFF

    def rng() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (a ^ (a >> 15)) * (1 | a)
        t = (t + ((t ^ (t >> 7)) * 61 | t)) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rng


def _envelopes(n: int, kind: str) -> np.ndarray:
    env = np.ones(n, dtype=np.float64)
    attack = max(1, int(n * 0.01))
    release = max(1, int(n * 0.15))
    for i in range(n):
        a = 1.0
        if i < attack:
            a = i / attack
        elif i > n - release:
            a = (n - i) / release
        env[i] = a * a if kind == "exp" else a
    return env


def _to_pcm(samples: np.ndarray, gain: float) -> np.ndarray:
    v = np.clip(samples * gain, -1.0, 1.0)
    out = (v * 32767.0).astype(np.int16)
    out[v < 0] = (v[v < 0] * 32768.0).astype(np.int16)
    return out


def synth_tone(freq: float = 440, duration_sec: float = 1.0, gain: float = 0.5, seed: int = 0) -> SynthResult:
    n = int(SAMPLE_RATE * duration_sec)
    env = _envelopes(n, "exp")
    t = np.arange(n) / SAMPLE_RATE
    samples = np.sin(2 * np.pi * freq * t) * env
    return SynthResult(_to_pcm(samples, gain), SAMPLE_RATE, duration_sec, "tone")


def synth_noise(duration_sec: float = 1.5, gain: float = 0.3, seed: int = 1337) -> SynthResult:
    n = int(SAMPLE_RATE * duration_sec)
    rng = mulberry32(seed)
    env = _envelopes(n, "exp")
    white = np.array([rng() * 2 - 1 for _ in range(n)])
    last = 0.0
    samples = np.zeros(n)
    for i in range(n):
        last = (last + 0.02 * white[i]) / 1.02
        samples[i] = last * 4 * env[i]
    return SynthResult(_to_pcm(samples, gain), SAMPLE_RATE, duration_sec, "noise")


def synth_impact(freq: float = 180, duration_sec: float = 0.25, gain: float = 0.7, seed: int = 99) -> SynthResult:
    n = int(SAMPLE_RATE * duration_sec)
    rng = mulberry32(seed)
    samples = np.zeros(n)
    for i in range(n):
        decay = np.exp(-18 * (i / n))
        osc = np.sin(2 * np.pi * freq * i / SAMPLE_RATE) * (1 - i / n)
        hit = (rng() * 2 - 1) * 0.6 * decay
        samples[i] = osc * decay + hit
    return SynthResult(_to_pcm(samples, gain), SAMPLE_RATE, duration_sec, "impact")


def synth_whoosh(duration_sec: float = 0.6, gain: float = 0.4, seed: int = 7) -> SynthResult:
    n = int(SAMPLE_RATE * duration_sec)
    rng = mulberry32(seed)
    env = _envelopes(n, "exp")
    samples = np.zeros(n)
    for i in range(n):
        t = i / n
        freq = 300 + 2600 * t * t
        osc = np.sin(2 * np.pi * freq * i / SAMPLE_RATE)
        air = (rng() * 2 - 1) * 0.5 * (0.5 + 0.5 * t)
        samples[i] = (osc * 0.6 + air) * env[i]
    return SynthResult(_to_pcm(samples, gain), SAMPLE_RATE, duration_sec, "whoosh")


def synth_beat(bpm: int = 120, duration_sec: float = 2.0, gain: float = 0.6, freq: float = 55) -> SynthResult:
    beat_sec = 60 / bpm
    bars = max(1, int(np.ceil(duration_sec / (4 * beat_sec))))
    dur = bars * 4 * beat_sec
    n = int(SAMPLE_RATE * dur)
    samples = np.zeros(n)
    beat_n = int(SAMPLE_RATE * beat_sec)
    for bar in range(bars):
        for b in range(4):
            start = (bar * 4 + b) * beat_n
            kick_len = min(beat_n, int(SAMPLE_RATE * 0.12))
            for i in range(kick_len):
                if start + i >= n:
                    break
                tt = i / SAMPLE_RATE
                pitch = freq * (2 ** (-12 * tt))
                decay = np.exp(-30 * tt)
                samples[start + i] += np.sin(2 * np.pi * pitch * tt) * decay
            if b % 2 == 1:
                hat_len = min(beat_n, int(SAMPLE_RATE * 0.03))
                rng = mulberry32(start + b)
                for i in range(hat_len):
                    if start + i >= n:
                        break
                    samples[start + i] += (rng() * 2 - 1) * np.exp(-80 * (i / SAMPLE_RATE)) * 0.4
    return SynthResult(_to_pcm(samples, gain), SAMPLE_RATE, dur, "beat")


def synth_ambience(freq: float = 110, duration_sec: float = 4.0, gain: float = 0.25, seed: int = 42) -> SynthResult:
    n = int(SAMPLE_RATE * duration_sec)
    env = _envelopes(n, "exp")
    rng = mulberry32(seed)
    samples = np.zeros(n)
    for i in range(n):
        t = i / SAMPLE_RATE
        drone = 0.5 * np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 1.5 * t)
        air = (rng() * 2 - 1) * 0.06
        samples[i] = (drone + air) * env[i]
    return SynthResult(_to_pcm(samples, gain), SAMPLE_RATE, duration_sec, "ambience")


def synth_fm(
    carrier: float = 440,
    modulator: float = 440,
    mod_index: float = 2.0,
    duration_sec: float = 1.0,
    gain: float = 0.5,
) -> SynthResult:
    n = int(SAMPLE_RATE * duration_sec)
    env = _envelopes(n, "exp")
    samples = np.zeros(n)
    for i in range(n):
        t = i / SAMPLE_RATE
        mod = mod_index * np.sin(2 * np.pi * modulator * t)
        samples[i] = np.sin(2 * np.pi * carrier * t + mod) * env[i]
    return SynthResult(_to_pcm(samples, gain), SAMPLE_RATE, duration_sec, "fm")


def adsr_envelope(
    n: int, attack: float = 0.02, decay: float = 0.1, sustain: float = 0.7, release: float = 0.2
) -> np.ndarray:
    sr = SAMPLE_RATE
    a = int(attack * sr)
    d = int(decay * sr)
    r = int(release * sr)
    s = max(0, n - a - d - r)
    env = np.zeros(n, dtype=np.float64)
    env[:a] = np.linspace(0, 1, max(1, a))
    env[a : a + d] = np.linspace(1, sustain, max(1, d))
    env[a + d : a + d + s] = sustain
    env[a + d + s :] = np.linspace(sustain, 0, max(1, r))
    return env


def synth_granular(
    source: SynthResult | None = None,
    density: float = 20.0,
    duration_sec: float = 2.0,
    gain: float = 0.5,
    seed: int = 11,
) -> SynthResult:
    """Nube de granos: si no hay fuente, usa ruido; cada grano es un fragmento envuelto."""
    n = int(SAMPLE_RATE * duration_sec)
    rng = mulberry32(seed)
    if source is None:
        src = synth_noise(duration_sec=duration_sec, gain=1.0, seed=seed).as_float()
    else:
        src = source.as_float()
    out = np.zeros(n)
    grain_len = int(SAMPLE_RATE * 0.05)
    positions = sorted(int(rng() * max(1, len(src) - grain_len)) for _ in range(int(density * duration_sec)))
    for pos in positions:
        grain = src[pos : pos + grain_len]
        if len(grain) < grain_len:
            grain = np.pad(grain, (0, grain_len - len(grain)))
        env = np.hanning(grain_len)
        start = int(rng() * max(1, n - grain_len))
        out[start : start + grain_len] += grain * env * 0.5
    peak = np.max(np.abs(out)) + 1e-9
    return SynthResult(_to_pcm(out / peak, gain), SAMPLE_RATE, duration_sec, "granular")


# --------------------------------------------------------------------------- #
# Compositor determinista                                                      #
# --------------------------------------------------------------------------- #
def _fnv1a(s: str) -> int:
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def compose_track(
    seed: int = 1337, bpm: int = 110, bars: int = 4, genre: str = "ambient", duration_sec: float | None = None
) -> tuple[np.ndarray, int]:
    sr = SAMPLE_RATE
    total = bars * 4 * (60.0 / bpm)
    n = int(sr * total)
    out = np.zeros(n, dtype=np.float32)

    out += 0.25 * synth_ambience(duration_sec=total, seed=seed, freq=110).as_float()
    beat = synth_beat(bpm=bpm, duration_sec=total, freq=55).as_float()
    out += 0.5 * beat[:n]

    scales = {
        "ambient": [0, 3, 5, 7, 10],
        "cinematic": [0, 2, 3, 7, 9],
        "lofi": [0, 3, 5, 7, 10],
        "energetic": [0, 2, 4, 7, 9],
    }
    scale = scales.get(genre, scales["ambient"])
    root = 55.0
    note_dur = (60.0 / bpm) / 2
    nb = int(sr * note_dur)
    rng = mulberry32(seed ^ 0x9E3779B9)
    pos = 0
    step = 0
    while pos + nb < n:
        deg = scale[(step) % len(scale)]
        f = root * 2 ** (deg / 12.0)
        note = synth_fm(carrier=f * 2, modulator=f, mod_index=2.0, duration_sec=note_dur, gain=1.0).as_float()
        out[pos : pos + nb] += 0.30 * note[:nb] * (0.7 + 0.3 * rng())
        pos += nb
        step += 1

    peak = np.max(np.abs(out)) + 1e-9
    out = out / peak * 0.9
    pcm = _to_pcm(out, 1.0)
    if duration_sec is not None:
        n_target = int(sr * duration_sec)
        if len(pcm) > n_target:
            pcm = pcm[:n_target]
        elif len(pcm) < n_target:
            pcm = np.pad(pcm, (0, n_target - len(pcm)))
    return pcm, sr


def music_from_prompt(prompt: str, duration_sec: float = 30.0) -> bytes:
    seed = _fnv1a(prompt)
    genres = ["ambient", "cinematic", "lofi", "energetic"]
    genre = genres[seed % len(genres)]
    bpm = 90 + (seed % 50)
    beat_sec = 60.0 / bpm
    bars = max(1, int(duration_sec / (4 * beat_sec)))
    pcm, sr = compose_track(seed=seed, bpm=bpm, bars=bars, genre=genre, duration_sec=duration_sec)
    return encode_wav(pcm, sr)


def encode_wav(pcm: np.ndarray, sample_rate: int = SAMPLE_RATE) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm.astype("<i2").tobytes())
    return buf.getvalue()
