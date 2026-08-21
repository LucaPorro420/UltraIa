"""video_cohere — matemática de movimiento y coherencia para video keyless.

Port de los principios de `motion.ts` (flujo óptico, descomposición cámara/escena)
y `generative.ts` (Ken Burns), más un interpolador de frames por warping de flujo
óptico que convierte un puñado de keyframes (Pollinations) en un clip suave, SIN GPU.
Determinista: misma entrada → misma salida.
"""
from __future__ import annotations

import io
import shutil
import subprocess

import numpy as np
from PIL import Image

from . import img_enhance


# --------------------------------------------------------------------------- #
# Gradientes y flujo óptico (Horn-Schunck, determinista)                      #
# --------------------------------------------------------------------------- #
def _gradients(g: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    gy = np.gradient(g, axis=0)
    gx = np.gradient(g, axis=1)
    return gx, gy


def _box_blur2d(x: np.ndarray, radius: int = 1) -> np.ndarray:
    k = np.ones(2 * radius + 1, dtype=np.float64) / (2 * radius + 1)
    from .img_enhance import separable_conv

    return separable_conv(x[..., None], k, k)[..., 0]


def optical_flow_hs(
    im1: np.ndarray,
    im2: np.ndarray,
    alpha: float = 1.5,
    n_iters: int = 12,
) -> tuple[np.ndarray, np.ndarray]:
    """Flujo denso (u, v) por Horn-Schunck. Entradas: arrays HxW float [0,1]."""
    g1 = _gray(im1) if im1.ndim == 3 else im1
    g2 = _gray(im2) if im2.ndim == 3 else im2
    ix, iy = _gradients(g1)
    it = g2 - g1
    u = np.zeros_like(g1)
    v = np.zeros_like(g1)
    denom = (alpha ** 2 + ix ** 2 + iy ** 2) + 1e-12
    for _ in range(n_iters):
        ua = _box_blur2d(u)
        va = _box_blur2d(v)
        bar = ix * ua + iy * va + it
        u = ua - ix * bar / denom
        v = va - iy * bar / denom
    return u, v


def _gray(arr: np.ndarray) -> np.ndarray:
    if arr.ndim == 2:
        return arr
    return arr[..., 0] * 0.299 + arr[..., 1] * 0.587 + arr[..., 2] * 0.114


def warp_backward(src: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Muestrea src en (x+u, y+v) con interpolación bilineal."""
    h, w = src.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    sx = np.clip(x + u, 0, w - 1)
    sy = np.clip(y + v, 0, h - 1)
    x0 = np.floor(sx).astype(int)
    y0 = np.floor(sy).astype(int)
    x1 = np.minimum(x0 + 1, w - 1)
    y1 = np.minimum(y0 + 1, h - 1)
    fx = sx - x0
    fy = sy - y0
    out = np.empty_like(src)
    for c in range(src.shape[2] if src.ndim == 3 else 1):
        s = src[..., c] if src.ndim == 3 else src
        top = s[y0, x0] * (1 - fx) * (1 - fy) + s[y0, x1] * fx * (1 - fy)
        bot = s[y1, x0] * (1 - fx) * fy + s[y1, x1] * fx * fy
        out[..., c] = top + bot
    return out


def interpolate_frames(
    k0: np.ndarray, k1: np.ndarray, n_between: int
) -> list[Image.Image]:
    """Interpola n_between frames entre k0 y k1 usando flujo óptico + cross-dissolve."""
    if n_between <= 0:
        return []
    f01 = optical_flow_hs(k0, k1)
    f10 = optical_flow_hs(k1, k0)
    frames: list[Image.Image] = []
    for i in range(1, n_between + 1):
        t = i / (n_between + 1)
        w0 = warp_backward(k0, t * f01[0], t * f01[1])
        w1 = warp_backward(k1, (1 - t) * f10[0], (1 - t) * f10[1])
        blended = (1 - t) * w0 + t * w1
        frames.append(img_enhance._to_pil(np.clip(blended, 0.0, 1.0)))
    return frames


# --------------------------------------------------------------------------- #
# Cámara Ken Burns (afín vía Pillow)                                          #
# --------------------------------------------------------------------------- #
def ken_burns_frame(
    base: Image.Image, t: int, total: int, zoom: float = 1.12, pan_frac: float = 0.04
) -> Image.Image:
    frac = (t / max(1, total - 1)) if total > 1 else 0.0
    w, h = base.size
    scale = 1.0 + (zoom - 1.0) * frac
    dx = pan_frac * w * frac
    dy = pan_frac * h * frac
    # matriz AFFINE: [a, b, c, d, e, f] => x' = a*x + b*y + c
    a = scale
    b = 0.0
    c = -dx * scale
    d = 0.0
    e = scale
    f = -dy * scale
    return base.transform((w, h), Image.AFFINE, (a, b, c, d, e, f), resample=Image.BICUBIC)


# --------------------------------------------------------------------------- #
# Ensamblado del clip coherente                                               #
# --------------------------------------------------------------------------- #
def build_coherent_clip(
    keyframes: list[Image.Image], frames_between: int = 4, use_kenburns: bool = True
) -> list[Image.Image]:
    seq: list[Image.Image] = []
    prev: np.ndarray | None = None
    n = len(keyframes)
    for idx, kf in enumerate(keyframes):
        kb = ken_burns_frame(kf, idx, n) if use_kenburns else kf
        if prev is None:
            seq.append(kb)
        else:
            interps = interpolate_frames(prev, img_enhance._to_arr(kb), frames_between)
            seq.extend(interps)
        seq.append(kb)
        prev = img_enhance._to_arr(kb)
    return seq


def write_mp4(frames: list[Image.Image], path: str, fps: int = 24) -> str:
    """Muxea frames a MP4 vía ffmpeg (subprocess). Requiere ffmpeg en PATH."""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise FileNotFoundError("ffmpeg no disponible en PATH")
    if not frames:
        raise ValueError("No frames to write")
    w, h = frames[0].size
    cmd = [
        ffmpeg,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{w}x{h}",
        "-r",
        str(fps),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "23",
        path,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for f in frames:
        rgb = f.convert("RGB")
        proc.stdin.write(rgb.tobytes())  # type: ignore[union-attr]
    proc.stdin.close()  # type: ignore[union-attr]
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg exit {proc.returncode}")
    return path


def write_png_sequence(frames: list[Image.Image], out_dir: str, stem: str = "frame") -> list[str]:
    import os

    os.makedirs(out_dir, exist_ok=True)
    paths: list[str] = []
    for i, f in enumerate(frames):
        p = os.path.join(out_dir, f"{stem}_{i:04d}.png")
        f.save(p)
        paths.append(p)
    return paths
