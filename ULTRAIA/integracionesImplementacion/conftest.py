"""Configuración de pytest: garantiza que `src` sea importable desde cualquier test."""
from __future__ import annotations

import sys
from pathlib import Path

# La raíz del proyecto (integracionesImplementacion) se añade a sys.path para
# que `from src.config import ...` funcione desde tests/ y desde la raíz.
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))