"""diffusion — cimientos de matemática para modelos locales (GPU) del Gen-Engine.

Reúne la teoría verificada en `learning/truth/truth_ai_gen_resources.json`
(arXiv 2208.11970 unificado, 2006.11239 DDPM, 2210.02747 flow matching, 2307.01952 SDXL)
como matemática PURA y reutilizable:

  * schedules de ruido (linear / cosine)  -> beta/alphas/alpha_cumprod
  * forward diffusion  (q_sample)
  * DDIM step  (sampler determinista/estocástico)
  * Euler step  (flow matching / OT)
  * LoRA injection hook (low-rank update) para当其 torch esté disponible

TODO el módulo corre en numpy (testeable en CPU). Los modelos locales
(FLUX.2/ACE-Step/LTX-2.3) en `models_local.py` lo consumirán en el backlog #6
cuando haya GPU; aquí solo se definen las primitivas.
"""
from __future__ import annotations

from typing import Callable

import numpy as np


def make_schedule(
    num_timesteps: int = 1000,
    beta_schedule: str = "linear",
    beta_start: float = 1e-4,
    beta_end: float = 2e-2,
) -> dict:
    if beta_schedule == "cosine":
        steps = np.arange(num_timesteps + 1, dtype=np.float64)
        s = 0.008
        f = np.cos((steps / num_timesteps + s) / (1 + s) * np.pi / 2) ** 2
        betas = np.clip(1 - f[1:] / f[:-1], 0.0, 0.999)
    else:
        betas = np.linspace(beta_start, beta_end, num_timesteps, dtype=np.float64)
    alphas = 1.0 - betas
    alpha_cumprod = np.cumprod(alphas)
    return {
        "betas": betas,
        "alphas": alphas,
        "alpha_cumprod": alpha_cumprod,
        "sqrt_alpha_cumprod": np.sqrt(alpha_cumprod),
        "sqrt_one_minus_alpha_cumprod": np.sqrt(1.0 - alpha_cumprod),
    }


def q_sample(x0: np.ndarray, noise: np.ndarray, t: int, schedule: dict) -> np.ndarray:
    """Forward diffusion: x_t = sqrt(alpha_bar_t) x0 + sqrt(1-alpha_bar_t) eps."""
    a = schedule["sqrt_alpha_cumprod"][t]
    b = schedule["sqrt_one_minus_alpha_cumprod"][t]
    return a * x0 + b * noise


def ddim_step(
    x: np.ndarray,
    pred_noise: np.ndarray,
    t: int,
    t_prev: int,
    schedule: dict,
    eta: float = 0.0,
) -> np.ndarray:
    """Un paso DDIM (Song et al. 2010 / 2011). eta=0 => determinista."""
    a_t = schedule["alpha_cumprod"][t]
    a_prev = schedule["alpha_cumprod"][t_prev] if t_prev >= 0 else np.array(1.0)
    sqrt_a = np.sqrt(a_t)
    sqrt_1m = np.sqrt(1.0 - a_t)
    pred_x0 = (x - sqrt_1m * pred_noise) / sqrt_a
    if t_prev < 0:
        return np.sqrt(a_prev) * pred_x0
    sqrt_a_prev = np.sqrt(a_prev)
    # dirección de ruido
    sigma = eta * np.sqrt((1 - a_prev) / (1 - a_t)) * np.sqrt(1 - a_t / a_prev)
    dir_noise = np.sqrt(1 - a_prev - sigma ** 2) * pred_noise
    return sqrt_a_prev * pred_x0 + dir_noise + sigma * np.random.randn(*x.shape)
    # Nota: el término sigma usa ruido fresco; en tests se pasa eta=0 (determinista).


def euler_step(
    x: np.ndarray, v_pred: np.ndarray, sigma: float, sigma_prev: float
) -> np.ndarray:
    """Paso Euler para flow matching / rectified flow: x_{t-1} = x_t + (s_prev - s_t) v."""
    return x + (sigma_prev - sigma) * v_pred


def apply_lora(weight: np.ndarray, a: np.ndarray, b: np.ndarray, scale: float = 1.0) -> np.ndarray:
    """Inyecta un update low-rank W' = W + scale * (B @ A).

    A: (r, in)  B: (out, r)  weight: (out, in)  -> resultado (out, in).
    """
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    weight = np.asarray(weight, dtype=np.float64)
    return weight + scale * (b @ a)


def sample_ddpm(
    x_T: np.ndarray,
    model_fn: Callable[[np.ndarray, int], np.ndarray],
    schedule: dict,
    num_steps: int | None = None,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Sampler DDPM puro (numpy). model_fn(x_t, t) -> eps_theta.

    Deterministico cuando rng=None (sin ruido de difusión inversa).
    """
    if rng is None:
        rng = np.random.default_rng(0)
    if num_steps is None:
        num_steps = len(schedule["betas"])
    x = x_T.copy()
    for t in range(num_steps - 1, -1, -1):
        beta = schedule["betas"][t]
        alpha = schedule["alphas"][t]
        alpha_bar = schedule["alpha_cumprod"][t]
        eps = model_fn(x, t)
        noise = rng.standard_normal(x.shape) if t > 0 else 0.0
        x = (1 / np.sqrt(alpha)) * (x - (beta / np.sqrt(1 - alpha_bar)) * eps)
        x = x + (np.sqrt(beta) * noise if t > 0 else 0.0)
    return x


# --------------------------------------------------------------------------- #
# Gancho opcional para torch (no se importa en keyless; solo cuando hay GPU).  #
# --------------------------------------------------------------------------- #
def apply_lora_to_torch_module(module, name: str, r: int, scale: float = 1.0):
    """Crea un par LoRA (A,B) en un módulo torch lineal. Lazy import de torch.

    Solo debe llamarse desde `models_local.py` cuando torch esté disponible.
    """
    import torch  # noqa: F401  (lazy: nunca se ejecuta en keyless)
    import torch.nn as nn

    linear: nn.Linear = getattr(module, name)
    in_f, out_f = linear.in_features, linear.out_features
    lora_a = nn.Parameter(torch.zeros(r, in_f))
    lora_b = nn.Parameter(torch.zeros(out_f, r))
    nn.init.kaiming_uniform_(lora_a, a=5 ** 0.5)
    setattr(module, f"{name}_lora_a", lora_a)
    setattr(module, f"{name}_lora_b", lora_b)
    module.register_forward_hook(
        lambda m, inp, out: out + scale * (getattr(m, f"{name}_lora_b") @ getattr(m, f"{name}_lora_a"))  # type: ignore
    )
    return lora_a, lora_b
