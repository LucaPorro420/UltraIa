"""img_enhance — matemática de procesamiento de imagen pura (numpy + Pillow).

Port fiel de los principios de `packages/core/src/tools/imaging.ts` (convolución
separable, kernels gaussianos/Sobel/sharpen/emboss, unsharp mask, mediana,
auto white-balance gray-world, equalización de histograma, upscale bicúbico) más
grading de color y tone-mapping, para realzar las imágenes keyless del Gen-Engine
(Pollinations) SIN GPU. Determinista: misma entrada → misma salida.
"""
from __future__ import annotations

import io

import numpy as np
from PIL import Image


# --------------------------------------------------------------------------- #
# Conversión PIL <-> array float [0,1]                                        #
# --------------------------------------------------------------------------- #
def _to_arr(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0


def _to_pil(arr: np.ndarray) -> Image.Image:
    arr = np.clip(arr, 0.0, 1.0)
    return Image.fromarray((arr * 255.0).astype(np.uint8), "RGB")


def _gray(arr: np.ndarray) -> np.ndarray:
    return arr[..., 0] * 0.299 + arr[..., 1] * 0.587 + arr[..., 2] * 0.114


# --------------------------------------------------------------------------- #
# Convolución separable                                                       #
# --------------------------------------------------------------------------- #
def _conv_rows(arr: np.ndarray, k: np.ndarray) -> np.ndarray:
    out = np.empty_like(arr)
    for c in range(arr.shape[2]):
        for i in range(arr.shape[0]):
            out[i, :, c] = np.convolve(arr[i, :, c], k, mode="same")
    return out


def _conv_cols(arr: np.ndarray, k: np.ndarray) -> np.ndarray:
    out = np.empty_like(arr)
    for c in range(arr.shape[2]):
        for i in range(arr.shape[1]):
            out[:, i, c] = np.convolve(arr[:, i, c], k, mode="same")
    return out


def separable_conv(arr: np.ndarray, kx: np.ndarray, ky: np.ndarray) -> np.ndarray:
    return _conv_cols(_conv_rows(arr, kx), ky)


def gaussian_kernel1d(sigma: float, radius: int | None = None) -> np.ndarray:
    if radius is None:
        radius = max(1, int(round(3.0 * sigma)))
    x = np.arange(-radius, radius + 1, dtype=np.float64)
    k = np.exp(-(x ** 2) / (2.0 * sigma ** 2))
    return k / k.sum()


def gaussian_blur(arr: np.ndarray, sigma: float = 1.0) -> np.ndarray:
    k = gaussian_kernel1d(sigma)
    return separable_conv(arr, k, k)


def box_blur(arr: np.ndarray, radius: int = 1) -> np.ndarray:
    n = 2 * radius + 1
    k = np.ones(n, dtype=np.float64) / n
    return separable_conv(arr, k, k)


# --------------------------------------------------------------------------- #
# Filtros de realce                                                           #
# --------------------------------------------------------------------------- #
def median_denoise(arr: np.ndarray, radius: int = 1) -> np.ndarray:
    from numpy.lib.stride_tricks import sliding_window_view

    out = arr.copy()
    for c in range(arr.shape[2]):
        win = sliding_window_view(arr[..., c], (2 * radius + 1, 2 * radius + 1))
        med = np.median(win, axis=(-2, -1))
        out[radius:-radius, radius:-radius, c] = med
    return out


def unsharp_mask(
    arr: np.ndarray, sigma: float = 1.0, amount: float = 1.2, threshold: float = 0.0
) -> np.ndarray:
    blurred = gaussian_blur(arr, sigma)
    diff = arr - blurred
    if threshold > 0:
        mask = np.abs(diff) >= threshold
        out = np.where(mask[..., None], arr + amount * diff, arr)
    else:
        out = arr + amount * diff
    return np.clip(out, 0.0, 1.0)


def auto_white_balance(arr: np.ndarray) -> np.ndarray:
    """Gray-world: escala canales para que la luminancia media coincida."""
    means = arr.reshape(-1, arr.shape[2]).mean(axis=0)
    gray = means.mean()
    scale = gray / (means + 1e-6)
    return np.clip(arr * scale, 0.0, 1.0)


def gamma(arr: np.ndarray, gamma: float = 1.0) -> np.ndarray:
    g = 1.0 / max(gamma, 1e-3)
    return np.clip(np.power(np.clip(arr, 0.0, 1.0), g), 0.0, 1.0)


def equalize_hist(arr: np.ndarray) -> np.ndarray:
    out = arr.copy()
    for c in range(arr.shape[2]):
        ch = (arr[..., c] * 255).astype(np.uint8)
        hist = np.bincount(ch.ravel(), minlength=256).astype(np.float64)
        cdf = hist.cumsum()
        cdf = cdf / cdf[-1]
        mapped = (cdf[ch] * 255).astype(np.uint8)
        out[..., c] = mapped.astype(np.float32) / 255.0
    return out


# --------------------------------------------------------------------------- #
# Grading de color                                                            #
# --------------------------------------------------------------------------- #
_PRESETS = {
    "neutral": dict(sat=1.0, contrast=1.0, tint=(0.0, 0.0, 0.0)),
    "cinematic": dict(sat=1.08, contrast=1.12, tint=(0.02, -0.012, 0.0)),
    "vivid": dict(sat=1.25, contrast=1.10, tint=(0.0, 0.0, 0.0)),
    "warm": dict(sat=1.05, contrast=1.05, tint=(0.03, 0.01, -0.02)),
    "cool": dict(sat=1.05, contrast=1.05, tint=(-0.02, 0.0, 0.03)),
}


def color_grade(arr: np.ndarray, preset: str = "neutral") -> np.ndarray:
    p = _PRESETS.get(preset, _PRESETS["neutral"])
    gray = arr.mean(axis=2, keepdims=True)
    arr = gray + p["sat"] * (arr - gray)
    arr = (arr - 0.5) * p["contrast"] + 0.5
    tint = np.array(p["tint"], dtype=np.float32)
    arr = arr + tint[None, None, :]
    return np.clip(arr, 0.0, 1.0)


def upscale(arr: np.ndarray, scale: float, method: str = "bicubic") -> np.ndarray:
    if scale <= 1.0:
        return arr
    h, w = arr.shape[:2]
    mode = Image.BICUBIC if method == "bicubic" else Image.LANCZOS
    img = _to_pil(arr).resize((int(w * scale), int(h * scale)), mode)
    return _to_arr(img)


# --------------------------------------------------------------------------- #
# Orquestador                                                                  #
# --------------------------------------------------------------------------- #
def enhance_image_pil(
    img: Image.Image,
    preset: str = "cinematic",
    sharpen: bool = True,
    denoise: bool = True,
    upscale_scale: float = 1.0,
) -> Image.Image:
    arr = _to_arr(img)
    if upscale_scale > 1.0:
        arr = upscale(arr, upscale_scale, "bicubic")
    if denoise:
        arr = median_denoise(arr, radius=1)
    arr = auto_white_balance(arr)
    arr = gamma(arr, 0.9)
    if sharpen:
        arr = unsharp_mask(arr, sigma=1.0, amount=1.1, threshold=0.02)
    arr = color_grade(arr, preset)
    return _to_pil(arr)


def enhance_image_bytes(
    data: bytes,
    preset: str = "cinematic",
    sharpen: bool = True,
    denoise: bool = True,
    upscale_scale: float = 1.0,
) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    out = enhance_image_pil(img, preset, sharpen, denoise, upscale_scale)
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return buf.getvalue()
