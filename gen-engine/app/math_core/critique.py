"""critique — métricas de calidad y bucle de análisis-por-síntesis.

Port de los principios de `videoqa.ts` (MSE/PSNR/SSIM ponderado) y de la capability
`replica` (orquestador análisis-por-síntesis). Permite que el Gen-Engine genere
varios candidatos, los puntúe y refina iterativamente SIN GPU.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from . import img_enhance, video_cohere


# --------------------------------------------------------------------------- #
# Métricas de imagen/video                                                    #
# --------------------------------------------------------------------------- #
def mse(a: np.ndarray, b: np.ndarray) -> float:
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    return float(np.mean((a - b) ** 2))


def psnr(a: np.ndarray, b: np.ndarray, max_val: float = 1.0) -> float:
    e = mse(a, b)
    if e <= 1e-12:
        return float("inf")
    return float(10.0 * np.log10((max_val ** 2) / e))


def _gaussian_window(size: int, sigma: float = 1.5) -> np.ndarray:
    ax = np.arange(size, dtype=np.float64) - size // 2
    xx, yy = np.meshgrid(ax, ax)
    g = np.exp(-(xx ** 2 + yy ** 2) / (2 * sigma ** 2))
    return g / g.sum()


def ssim(a: np.ndarray, b: np.ndarray, window: int = 11, sigma: float = 1.5) -> float:
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    if a.ndim == 3:
        a = img_enhance._gray(a)
        b = img_enhance._gray(b)
    # La ventana no puede ser mayor que la imagen; se recorta a un impar válido.
    w = min(window, min(a.shape[0], a.shape[1]))
    if w % 2 == 0:
        w -= 1
    w = max(w, 1)
    win = _gaussian_window(w, sigma)
    c1 = (0.01) ** 2
    c2 = (0.03) ** 2

    def m(x: np.ndarray) -> np.ndarray:
        return _conv2d(x, win)

    ma, mb = m(a), m(b)
    ma2, mb2, mab = m(a * a), m(b * b), m(a * b)
    num = (2 * ma * mb + c1) * (2 * mab - 2 * ma * mb + c2)
    den = (ma ** 2 + mb ** 2 + c1) * (ma2 + mb2 + c2)
    return float(np.mean(num / den))


def _conv2d(x: np.ndarray, k: np.ndarray) -> np.ndarray:
    from numpy.lib.stride_tricks import sliding_window_view

    win = sliding_window_view(x, (k.shape[0], k.shape[1]))
    return (win * k).sum(axis=(-2, -1))


def sharpness(arr: np.ndarray) -> float:
    """Varianza del Laplaciano (energía de alta frecuencia)."""
    g = img_enhance._gray(np.asarray(arr, dtype=np.float32))
    gy, gx = np.gradient(g)
    lap = gx ** 2 + gy ** 2
    return float(np.mean(lap))


def flow_consistency(frames: list[Image.Image]) -> dict:
    """Magnitud media de flujo y SSIM temporal entre frames consecutivos."""
    if len(frames) < 2:
        return {"mean_flow": 0.0, "mean_temporal_ssim": 1.0, "frames": len(frames)}
    arrs = [img_enhance._to_arr(f) for f in frames]
    flow_mag = 0.0
    ssims = []
    for i in range(len(arrs) - 1):
        u, v = video_cohere.optical_flow_hs(arrs[i], arrs[i + 1])
        flow_mag += float(np.mean(np.sqrt(u ** 2 + v ** 2)))
        ssims.append(ssim(arrs[i], arrs[i + 1]))
    return {
        "mean_flow": flow_mag / (len(arrs) - 1),
        "mean_temporal_ssim": float(np.mean(ssims)),
        "frames": len(arrs),
    }


def critique_image(img: Image.Image) -> dict:
    arr = img_enhance._to_arr(img)
    gray = img_enhance._gray(arr)
    return {
        "sharpness": sharpness(arr),
        "brightness": float(np.mean(gray)),
        "contrast": float(np.std(gray)),
        "histogram_entropy": float(_entropy(gray)),
    }


def _entropy(gray: np.ndarray) -> float:
    hist = np.bincount((gray * 255).astype(np.uint8).ravel(), minlength=256).astype(np.float64)
    p = hist / hist.sum()
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())


# --------------------------------------------------------------------------- #
# Bucle de análisis-por-síntesis (estilo replica)                             #
# --------------------------------------------------------------------------- #
def analyze_by_synthesis(
    generator_fn,
    scorer,
    param_grid: list,
    n_best: int = 1,
) -> dict:
    """Genera un candidato por cada conjunto de params, puntúa y conserva los mejores.

    generator_fn(params) -> candidato (lo que sea que consuma scorer)
    scorer(candidate, params) -> float (mayor = mejor)
    Devuelve {best_params, best_score, best_candidate, history}.
    """
    history = []
    scored = []
    for params in param_grid:
        cand = generator_fn(params)
        score = float(scorer(cand, params))
        scored.append((score, params, cand))
        history.append({"params": params, "score": score})
    scored.sort(key=lambda t: t[0], reverse=True)
    top = scored[: max(1, n_best)]
    return {
        "best_params": top[0][1],
        "best_score": top[0][0],
        "best_candidate": top[0][2],
        "history": history,
    }
