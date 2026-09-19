#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doctor de recursos — inventaría el PC y configura la fábrica local.

Sin teléfono, sin cuentas, sin red obligatoria. Todo fail-soft, exit 0
siempre: informa lo que HAY, la fábrica se adapta sola.
Uso:  py doctor.py   -> escribe recursos.json + tabla en consola.
"""
from __future__ import annotations

import importlib.util
import json
import os
import platform
import shutil
import socket
import struct
import subprocess
import sys
import tempfile

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(BASE, "recursos.json")

PS_VOICES_SCRIPT = """\
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
foreach ($v in $s.GetInstalledVoices()) {
  Write-Output ($v.VoiceInfo.Name + '|' + $v.VoiceInfo.Culture.Name)
}
"""


def _run(cmd, timeout=15):
    """Ejecuta y devuelve (ok, texto). Nunca lanza."""
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=timeout)
        text = (proc.stdout or b"").decode("utf-8", "replace")
        return proc.returncode == 0, text.strip()
    except Exception as exc:
        return False, "error: %s" % exc


def ram_gb():
    """RAM física en GB vía ctypes. None si no se puede."""
    try:
        import ctypes

        class MemStat(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]

        stat = MemStat()
        stat.dwLength = ctypes.sizeof(MemStat)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
        return round(stat.ullTotalPhys / 1e9, 1)
    except Exception:
        return None


def disk_free_gb(path="C:\\"):
    try:
        import shutil as _sh

        return round(_sh.disk_usage(path).free / 1e9, 1)
    except Exception:
        return None


def sapi_voices():
    """Voces offline vía .ps1 temporal (nunca argv con quotes)."""
    tmp = None
    try:
        handle, tmp = tempfile.mkstemp(suffix=".ps1", prefix="voces-")
        with os.fdopen(handle, "w", encoding="utf-8") as fh:
            fh.write(PS_VOICES_SCRIPT)
        ok, text = _run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
            timeout=30,
        )
        if not ok or not text:
            return []
        voces = []
        for line in text.splitlines():
            if "|" in line:
                nombre, cultura = line.split("|", 1)
                voces.append({"nombre": nombre.strip(), "cultura": cultura.strip()})
        return voces
    except Exception:
        return []
    finally:
        try:
            if tmp and os.path.exists(tmp):
                os.remove(tmp)
        except Exception:
            pass


def internet_ok():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3).close()
        return True
    except Exception:
        return False


def main():
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    ok_ff, ff_ver = _run([ffmpeg, "-version"], timeout=10) if ffmpeg else (False, "")
    arial = "C:\\Windows\\Fonts\\arial.ttf"
    voces = sapi_voices()
    voces_es = [v for v in voces if v["cultura"].lower().startswith("es")]
    hay_internet = internet_ok()
    nvidia = shutil.which("nvidia-smi")

    recursos = {
        "maquina": {
            "sistema": platform.system() + " " + platform.release(),
            "python": platform.python_version(),
            "ejecutable": sys.executable,
            "cpus": os.cpu_count(),
            "ram_gb": ram_gb(),
            "disco_libre_gb": disk_free_gb(),
            "gpu_nvidia": bool(nvidia),
        },
        "backends": {
            "ffmpeg": {"path": ffmpeg, "version": ff_ver.splitlines()[0] if ff_ver else None},
            "ffprobe": {"path": ffprobe},
            "pillow": {"instalado": importlib.util.find_spec("PIL") is not None},
            "arial_ttf": {"path": arial, "existe": os.path.exists(arial)},
            "sapi_offline": {"voces": voces, "voces_es": voces_es},
            "edge_tts": {"instalado": importlib.util.find_spec("edge_tts") is not None},
            "internet": {"disponible": hay_internet},
        },
        "modo_local_cero": {
            "telefono_requerido": False,
            "cuentas_requeridas": False,
            "nivel": "FULL"
            if (ffmpeg and voces)
            else ("SOLO-IMAGEN" if not voces else "SIN-VIDEO"),
        },
    }
    if not ffmpeg:
        recursos["modo_local_cero"]["nivel"] = "SOLO-TEXTO"

    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(recursos, fh, ensure_ascii=False, indent=2)

    print("=== DOCTOR TECH-LIBRARY (phone-free) ===")
    print("PC: %s | py %s | %s CPU | RAM %s GB | disco %s GB libres" % (
        recursos["maquina"]["sistema"], recursos["maquina"]["python"],
        recursos["maquina"]["cpus"], recursos["maquina"]["ram_gb"],
        recursos["maquina"]["disco_libre_gb"]))
    print("ffmpeg: %s" % (recursos["backends"]["ffmpeg"]["version"] or "AUSENTE"))
    print("voces SAPI offline: %d (%d ES)" % (len(voces), len(voces_es)))
    for v in voces_es[:4]:
        print("  voz ES: %s [%s]" % (v["nombre"], v["cultura"]))
    print("arial.ttf: %s | pillow: %s | internet: %s" % (
        recursos["backends"]["arial_ttf"]["existe"],
        recursos["backends"]["pillow"]["instalado"],
        recursos["backends"]["internet"]["disponible"]))
    print("NIVEL: %s -> recursos.json" % recursos["modo_local_cero"]["nivel"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
