"""Tests del paquete math_core del Gen-Engine (keyless + cimientos GPU).

Corren con `py -3.12 -m pytest gen-engine/tests -q`. No requieren red ni GPU:
las rutas de red (Pollinations) no se invocan; ffmpeg se salta si no está.
"""
from __future__ import annotations

import io
import os
import shutil
import wave

import numpy as np
import pytest
from PIL import Image

from app.math_core import audio_synth, critique, diffusion, img_enhance, video_cohere


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #
def _rand_img(h=32, w=32, seed=1) -> Image.Image:
    rng = np.random.default_rng(seed)
    arr = rng.random((h, w, 3)).astype(np.float32)
    return img_enhance._to_pil(arr)


def _smooth_img(h=48, w=48) -> np.ndarray:
    y = np.linspace(0, 1, h)
    x = np.linspace(0, 1, w)
    g = (np.outer(y, x))[..., None].repeat(3, axis=2)
    return g.astype(np.float32)


# --------------------------------------------------------------------------- #
# img_enhance                                                                  #
# --------------------------------------------------------------------------- #
def test_to_arr_pil_roundtrip():
    img = _rand_img()
    arr = img_enhance._to_arr(img)
    back = img_enhance._to_pil(arr)
    assert np.array_equal(np.asarray(img), np.asarray(back))


def test_unsharp_increases_sharpness():
    base = _smooth_img(48, 48)
    sharp = img_enhance.unsharp_mask(base, sigma=1.0, amount=1.5)
    assert critique.sharpness(sharp) > critique.sharpness(base)


def test_equalize_increases_contrast():
    # imagen de bajo contraste
    low = np.full((32, 32, 3), 0.45, dtype=np.float32)
    low[0:16, :, :] = 0.5
    eq = img_enhance.equalize_hist(low)
    assert eq.std() > low.std()


def test_color_grade_in_range():
    arr = _smooth_img(16, 16)
    out = img_enhance.color_grade(arr, "cinematic")
    assert out.min() >= 0.0 and out.max() <= 1.0


def test_upscale_dimensions():
    arr = _smooth_img(16, 16)
    up = img_enhance.upscale(arr, 2.0)
    assert up.shape[:2] == (32, 32)


def test_median_denoise_removes_salt():
    base = np.full((24, 24, 3), 0.5, dtype=np.float32)
    noisy = base.copy()
    rng = np.random.default_rng(0)
    mask = rng.random((24, 24, 1)) < 0.2
    noisy[mask.repeat(3, axis=2)] = 0.0
    den = img_enhance.median_denoise(noisy, radius=1)
    assert np.mean(np.abs(den - base)) < np.mean(np.abs(noisy - base))


def test_enhance_image_bytes_deterministic_and_valid():
    img = _rand_img(40, 40, seed=7)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()
    out1 = img_enhance.enhance_image_bytes(data, preset="cinematic")
    out2 = img_enhance.enhance_image_bytes(data, preset="cinematic")
    assert out1 == out2
    reloaded = Image.open(io.BytesIO(out1))
    assert reloaded.size == (40, 40)


# --------------------------------------------------------------------------- #
# video_cohere                                                                 #
# --------------------------------------------------------------------------- #
def test_optical_flow_recovers_translation():
    im1 = _smooth_img(48, 48)
    dx, dy = 3, 2
    im2 = np.roll(im1, shift=(dy, dx), axis=(0, 1))
    u, v = video_cohere.optical_flow_hs(im1, im2, n_iters=20)
    assert abs(np.mean(u) - dx) < 2.0
    assert abs(np.mean(v) - dy) < 2.0


def test_interpolate_identical_is_identity():
    k = _smooth_img(32, 32)
    frames = video_cohere.interpolate_frames(k, k, 3)
    assert len(frames) == 3
    for f in frames:
        arr = img_enhance._to_arr(f)
        assert np.allclose(arr, k, atol=1e-4)


def test_interpolate_between_shifts_shape():
    k0 = _smooth_img(24, 24)
    k1 = np.roll(k0, shift=(2, 2), axis=(0, 1))
    frames = video_cohere.interpolate_frames(k0, k1, 3)
    assert len(frames) == 3
    for f in frames:
        assert img_enhance._to_arr(f).shape == (24, 24, 3)


def test_ken_burns_size_preserved():
    base = _rand_img(32, 32, seed=3)
    out = video_cohere.ken_burns_frame(base, 1, 3)
    assert out.size == (32, 32)


def test_build_coherent_clip_count():
    keys = [_rand_img(32, 32, seed=s) for s in range(3)]
    clip = video_cohere.build_coherent_clip(keys, frames_between=2, use_kenburns=False)
    # 3 keyframes + 2 interpolaciones entre cada par (2 pares) = 3 + 4 = 7
    assert len(clip) == 7


def test_write_mp4_or_skip():
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.skip("ffmpeg no disponible")
    frames = [Image.new("RGB", (16, 16), (i * 10, 0, 0)) for i in range(4)]
    path = "test_clip.mp4"
    try:
        video_cohere.write_mp4(frames, path, fps=24)
        assert os.path.exists(path) and os.path.getsize(path) > 0
    finally:
        if os.path.exists(path):
            os.remove(path)


# --------------------------------------------------------------------------- #
# audio_synth                                                                  #
# --------------------------------------------------------------------------- #
def test_encode_wav_valid_header():
    pcm = audio_synth.synth_tone(freq=440, duration_sec=0.1).pcm
    data = audio_synth.encode_wav(pcm, audio_synth.SAMPLE_RATE)
    with wave.open(io.BytesIO(data), "rb") as w:
        assert w.getnchannels() == 1
        assert w.getsampwidth() == 2
        assert w.getframerate() == audio_synth.SAMPLE_RATE
        assert w.getnframes() == len(pcm)


def test_synth_lengths():
    assert audio_synth.synth_tone(duration_sec=0.5).pcm.shape[0] == int(audio_synth.SAMPLE_RATE * 0.5)
    # synth_beat fuerza >= 1 compás (4 beats); a 120 bpm un compás = 2.0 s.
    assert audio_synth.synth_beat(duration_sec=2.0).pcm.shape[0] == int(audio_synth.SAMPLE_RATE * 2.0)


def test_fm_non_trivial():
    sine = audio_synth.synth_tone(freq=440, duration_sec=0.2, gain=1.0).as_float()
    fm = audio_synth.synth_fm(carrier=440, modulator=440, mod_index=5.0, duration_sec=0.2, gain=1.0).as_float()
    # FM debe diferir del tono puro
    assert np.mean(np.abs(sine - fm)) > 1e-3


def test_music_from_prompt_deterministic_and_duration():
    a = audio_synth.music_from_prompt("neon city drive", duration_sec=2.0)
    b = audio_synth.music_from_prompt("neon city drive", duration_sec=2.0)
    assert a == b
    with wave.open(io.BytesIO(a), "rb") as w:
        assert abs(w.getnframes() / w.getframerate() - 2.0) < 0.1


# --------------------------------------------------------------------------- #
# critique                                                                     #
# --------------------------------------------------------------------------- #
def test_mse_psnr_ssim():
    a = np.zeros((8, 8, 3), dtype=np.float32)
    b = np.zeros((8, 8, 3), dtype=np.float32)
    assert critique.mse(a, b) == 0.0
    assert critique.psnr(a, b) == float("inf")
    assert critique.ssim(a, b) == pytest.approx(1.0, abs=1e-6)
    c = np.ones((8, 8, 3), dtype=np.float32)
    assert critique.psnr(a, c) == pytest.approx(0.0, abs=1e-3)


def test_analyze_by_synthesis_picks_best():
    grid = [{"x": i} for i in range(7)]

    def gen(p):
        return p

    def score(cand, p):
        return -abs(p["x"] - 3)

    res = critique.analyze_by_synthesis(gen, score, grid, n_best=1)
    assert res["best_params"]["x"] == 3
    assert len(res["history"]) == 7


def test_flow_consistency_static_vs_shifted():
    img = _rand_img(32, 32, seed=5)
    static = [img, img]
    shifted = [img, Image.fromarray(np.roll(np.asarray(img), shift=(3, 3), axis=(0, 1)))]
    s_static = critique.flow_consistency(static)["mean_flow"]
    s_shift = critique.flow_consistency(shifted)["mean_flow"]
    assert s_static < s_shift


# --------------------------------------------------------------------------- #
# diffusion (cimientos GPU, puro numpy)                                        #
# --------------------------------------------------------------------------- #
def test_schedule_monotonic():
    s = diffusion.make_schedule(1000, "linear")
    assert s["alpha_cumprod"][0] > s["alpha_cumprod"][-1]
    assert s["alpha_cumprod"][0] > 0.99  # t=0 ~ sin ruido
    cosine = diffusion.make_schedule(1000, "cosine")
    assert cosine["alpha_cumprod"][0] > cosine["alpha_cumprod"][-1]


def test_q_sample_t0_is_x0():
    x0 = np.ones((4, 4), dtype=np.float64)
    noise = np.zeros((4, 4), dtype=np.float64)
    s = diffusion.make_schedule(10, "linear")
    xt = diffusion.q_sample(x0, noise, 0, s)
    # t=0 inyecta ruido mínimo (alpha_cumprod[0] ~ 0.9999), no exactamente x0.
    assert np.allclose(xt, x0, atol=1e-3)


def test_ddim_step_shape_and_finite():
    s = diffusion.make_schedule(50, "linear")
    x = np.random.default_rng(0).standard_normal((4, 4))
    pred = np.zeros((4, 4))
    out = diffusion.ddim_step(x, pred, 30, 29, s, eta=0.0)
    assert out.shape == x.shape
    assert np.all(np.isfinite(out))


def test_euler_step_algebra():
    x = np.ones((3, 3))
    v = np.full((3, 3), 2.0)
    out = diffusion.euler_step(x, v, 1.0, 0.5)
    assert np.allclose(out, x + (0.5 - 1.0) * v)


def test_apply_lora_manual():
    w = np.zeros((2, 3))
    a = np.ones((1, 3))
    b = np.ones((2, 1))
    out = diffusion.apply_lora(w, a, b, scale=1.0)
    assert np.allclose(out, np.ones((2, 3)))


def test_sample_ddpm_converges_to_zero():
    s = diffusion.make_schedule(200, "linear")
    rng = np.random.default_rng(0)
    x_T = rng.standard_normal((8, 8))
    x0 = diffusion.sample_ddpm(x_T, lambda x, t: x, s, num_steps=200, rng=rng)
    assert np.mean(np.abs(x0)) < np.mean(np.abs(x_T))
