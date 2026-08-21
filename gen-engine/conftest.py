"""Pytest: hace importable el paquete `app` desde la raíz del gen-engine."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
