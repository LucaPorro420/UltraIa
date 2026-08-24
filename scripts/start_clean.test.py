"""Test del auto-heal de puertos de start.py (--clean).

Asegura que:
- parse_netstat_listeners deduplica y filtra por puerto exacto (IPv4/IPv6);
- estados no-LISTENING, PIDs invalidos y texto vacio no producen falsos
  positivos (30000 NO matchea :30 ni :3000);
- looks_like_ultraia acepta solo servicios UltraIa conocidos y rechaza
  procesos extranjeros (mysqld/docker/svchost/explorer);
- el flag --clean aparece en --help y AUTO_CLEAN_PORTS arranca apagado.

Standalone, stdlib puro (patron scripts/loop_piv_doctor.test.py).

Uso: py -3.12 scripts/start_clean.test.py
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("start_under_test", ROOT / "start.py")
assert _spec is not None and _spec.loader is not None
start = importlib.util.module_from_spec(_spec)
sys.modules.setdefault("start_under_test", start)
_spec.loader.exec_module(start)

NETSTAT_SAMPLE = """

  Conexiones activas

  Proto  Direccion local          Direccion remota         Estado           PID
  TCP    127.0.0.1:3000           0.0.0.0:0                LISTENING       4242
  TCP    127.0.0.1:3000           0.0.0.0:0                LISTENING       4242
  TCP    [::]:3000                [::]:0                   LISTENING       5151
  TCP    127.0.0.1:8100           0.0.0.0:0                LISTENING       6262
  TCP    127.0.0.1:30000          0.0.0.0:0                LISTENING       7373
  TCP    127.0.0.1:139            0.0.0.0:0                LISTENING       4
"""


class ParseNetstatTests(unittest.TestCase):
    """Parseo determinista de la salida netstat -ano."""

    def test_dedup_y_filtro_por_puerto(self) -> None:
        self.assertEqual(start.parse_netstat_listeners(NETSTAT_SAMPLE, 3000), [4242, 5151])
        self.assertEqual(start.parse_netstat_listeners(NETSTAT_SAMPLE, 8100), [6262])
        # 30000 no matchea :30 ni prefijos: solo sufijo exacto :<port>.
        self.assertEqual(start.parse_netstat_listeners(NETSTAT_SAMPLE, 30), [])

    def test_ignora_no_listening_y_pids_invalidos(self) -> None:
        texto = (
            "  TCP    127.0.0.1:4000   1.2.3.4:443   ESTABLISHED     999\n"
            "  TCP    127.0.0.1:4001   0.0.0.0:0     LISTENING       abc\n"
            "  TCP    127.0.0.1:4002   0.0.0.0:0     LISTENING       0\n"
        )
        self.assertEqual(start.parse_netstat_listeners(texto, 4000), [])
        self.assertEqual(start.parse_netstat_listeners(texto, 4001), [])
        self.assertEqual(start.parse_netstat_listeners(texto, 4002), [])
        self.assertEqual(start.parse_netstat_listeners("", 3000), [])


class LooksLikeUltraiaTests(unittest.TestCase):
    """Clasificacion conservadora: solo tokens UltraIa conocidos."""

    def test_acepta_servicios_conocidos(self) -> None:
        positivos = [
            r"C:\Program Files\nodejs\node.exe next dev",
            "npm.cmd run dev",
            r"py -3.12 C:\repo\UltraIa\start.py --web",
            r"C:\Python312\python.exe -m uvicorn app:main --port 8100",
            r"node C:\repo\UltraIa\gen-engine\server.js",
            r"NODE C:\ULTRAIA\server.js",
        ]
        for cmdline in positivos:
            self.assertTrue(start.looks_like_ultraia(cmdline), cmdline)

    def test_rechaza_extranjeros(self) -> None:
        negativos = [
            "",
            r"C:\Program Files\MySQL\mysqld.exe",
            "docker-compose up",
            r"C:\Windows\system32\svchost.exe -k netsvcs",
            "explorer.exe",
        ]
        for cmdline in negativos:
            self.assertFalse(start.looks_like_ultraia(cmdline), cmdline)


class FlagCleanTests(unittest.TestCase):
    """El flag existe, esta documentado en --help y arranca apagado."""

    def test_flag_apagado_y_help(self) -> None:
        self.assertIs(start.AUTO_CLEAN_PORTS, False)
        buffer = io.StringIO()
        codigo = 0
        argv_original = sys.argv
        sys.argv = ["start.py", "--help"]
        try:
            with contextlib.redirect_stdout(buffer):
                try:
                    start.main()
                except SystemExit as exc:
                    codigo = int(exc.code or 0)
        finally:
            sys.argv = argv_original
        self.assertEqual(codigo, 0)
        self.assertIn("--clean", buffer.getvalue())


if __name__ == "__main__":
    unittest.main()
