#!/usr/bin/env python3
"""
cloud-cli.test.py — Suite de test end-to-end del CLI de UltraIA Cloud.

QUÉ ES:
    Pruebas que ejecutan `cloud-cli.py` como un proceso REAL (subprocess) contra un
    directorio cloud temporal y verifican su comportamiento observable: salidas,
    archivos escritos, exit codes y formato JSON.

PARA QUÉ:
    - Verificación reproducible tras cualquier cambio del CLI (gate local).
    - Los gates npm (typecheck/lint/test/build) NO cubren scripts Python; este
      test + `--self-test` son la verificación del CLI.

POR QUÉ:
    - 100% stdlib (unittest) — cero dependencias, mismo patrón que el CLI.
    - No toca el repo: todo corre en un tempdir que se borra al final.
    - Los asserts evitan caracteres no-ASCII del output (Windows cp1252/GBK en
      consola) y comparan contra el DISCO, que es lo que realmente importa.

CORRER:
    py -3.12 scripts/cloud-cli.test.py          # todos los tests
    py -3.12 scripts/cloud-cli.test.py -v       # verbose
"""

import json  # QUÉ ES: parsear salidas JSON del CLI. PARA QUÉ: list/stat/manifest --json. POR QUÉ: stdlib.
import os  # QUÉ ES: rutas y existencia de archivos. PARA QUÉ: asserts contra disco. POR QUÉ: stdlib.
import shutil  # QUÉ ES: borrar el tempdir en tearDown. PARA QUÉ: no dejar basura. POR QUÉ: stdlib.
import subprocess  # QUÉ ES: ejecutar el CLI como proceso real. PARA QUÉ: test e2e honesto (no unit con mocks). POR QUÉ: verifica argv/exit codes reales.
import sys  # QUÉ ES: sys.executable (intérprete actual). PARA QUÉ: subprocess usa el MISMO Python que corre el test. POR QUÉ: evita depender del PATH.
import tempfile  # QUÉ ES: directorio temporal aislado. PARA QUÉ: cero efectos en el repo. POR QUÉ: stdlib.
import unittest  # QUÉ ES: framework de test. PARA QUÉ: asserts + setUp/tearDown + salida estándar. POR QUÉ: stdlib, sin deps.

# QUÉ ES: ruta absoluta del CLI (junto a este test). PARA QUÉ: subprocess lo ejecuta desde cualquier cwd.
CLI = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cloud-cli.py')


def run_cli(cloud_dir, *args):
    """QUÉ ES: ejecuta el CLI con `--dir <cloud_dir>` + args y devuelve (rc, stdout, stderr).
    PARA QUÉ: todos los tests comparten la misma invocación (un solo lugar a mantener).
    POR QUÉ: encoding utf-8 + errors=replace — la consola Windows puede ser GBK; los asserts
    no dependen de caracteres no-ASCII, pero el decode no debe crashear."""
    proc = subprocess.run(
        [sys.executable, CLI, '--dir', cloud_dir, *args],
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=False,  # QUÉ ES: no lanzar excepción si el CLI falla; PARA QUÉ: los tests verifican exit codes manualmente (rc==2 es un caso VÁLIDO). POR QUÉ: ruff PLW1510 exige check explícito.
    )
    return proc.returncode, proc.stdout, proc.stderr


class TestCloudCli(unittest.TestCase):
    """QUÉ ES: suite e2e — un tempdir por test (aislamiento total).
    PARA QUÉ: ningún test depende del estado de otro.
    POR QUÉ: tempfile.mkdtemp + tearDown rmtree = patrón estándar de tests de CLI."""

    def setUp(self):
        # QUÉ ES: crear el árbol de prueba: <tmp>/cloud (raíz cloud) y <tmp>/src (fuentes).
        self.tmp = tempfile.mkdtemp(prefix='cloud-cli-test-')
        self.cloud = os.path.join(self.tmp, 'cloud')
        self.src = os.path.join(self.tmp, 'src')
        os.makedirs(self.src)

    def tearDown(self):
        # QUÉ ES: borrado recursivo del árbol temporal completo (fail-soft).
        shutil.rmtree(self.tmp, ignore_errors=True)

    def write_src(self, name, content=b'x'):
        """QUÉ ES: crea un archivo fuente en <tmp>/src. PARA QUÉ: upload necesita un archivo local."""
        path = os.path.join(self.src, name)
        with open(path, 'wb') as fh:
            fh.write(content)
        return path

    # ------------------------------------------------------------------
    # Tests
    # ------------------------------------------------------------------

    def test_self_test_passes(self):
        """QUÉ ES: `self-test` debe salir 0 con 'PASS' (25 checks de lógica pura)."""
        rc, out, _err = run_cli(self.cloud, 'self-test')
        self.assertEqual(rc, 0)
        self.assertIn('PASS', out)

    def test_layout_prints_9_folders(self):
        """QUÉ ES: `layout` imprime las 9 carpetas canónicas (primera y última)."""
        rc, out, _err = run_cli(self.cloud, 'layout')
        self.assertEqual(rc, 0)
        self.assertIn('publications', out)
        self.assertIn('backups', out)
        self.assertEqual(out.count('\n'), 9)  # 9 líneas = 9 carpetas

    def test_upload_sanitizes_and_classifies(self):
        """QUÉ ES: subir 'Mi Clip 2026.mp4' → nombre sanitizado en media/videos (clasificación automática).
        PARA QUÉ: el mismo comportamiento que la API web (sanitize + type→carpeta)."""
        src = self.write_src('Mi Clip 2026.mp4')
        rc, out, err = run_cli(self.cloud, 'upload', src)
        self.assertEqual(rc, 0, err)
        self.assertIn('ok:', out)
        expected = os.path.join(self.cloud, 'media', 'videos', 'mi-clip-2026.mp4')
        self.assertTrue(os.path.isfile(expected), f'no se escribió {expected}')

    def test_upload_rejects_bad_extension(self):
        """QUÉ ES: .exe debe rechazarse (exit 2) — misma frontera que validateUpload."""
        src = self.write_src('malware.exe')
        rc, _out, err = run_cli(self.cloud, 'upload', src)
        self.assertEqual(rc, 2)
        self.assertIn('no admitida', err)

    def test_upload_explicit_destination(self):
        """QUÉ ES: destino explícito 'briefs' → archivo dentro de <cloud>/briefs/."""
        src = self.write_src('idea.md')
        rc, _out, err = run_cli(self.cloud, 'upload', src, 'briefs')
        self.assertEqual(rc, 0, err)
        self.assertTrue(os.path.isfile(os.path.join(self.cloud, 'briefs', 'idea.md')))

    def test_upload_rejects_unsafe_destination(self):
        """QUÉ ES: destino '../x' se rechaza (exit 2) — el upload nunca escapa del cloud."""
        src = self.write_src('idea.md')
        rc, _out, err = run_cli(self.cloud, 'upload', src, '../x')
        self.assertEqual(rc, 2)
        self.assertIn('no segura', err)

    def test_list_json(self):
        """QUÉ ES: `list --json` devuelve JSON parseable con el archivo subido."""
        src = self.write_src('clip.mp4')
        run_cli(self.cloud, 'upload', src)
        rc, out, _err = run_cli(self.cloud, 'list', '--json')
        self.assertEqual(rc, 0)
        data = json.loads(out)
        self.assertGreaterEqual(data['count'], 1)
        paths = [f['path'] for f in data['files']]
        self.assertIn('media/videos/clip.mp4', paths)

    def test_stat_json(self):
        """QUÉ ES: `stat --json` reporta path, tamaño y categoría correctos."""
        src = self.write_src('foto.png', b'12345')
        run_cli(self.cloud, 'upload', src, 'media/images')
        rc, out, _err = run_cli(self.cloud, 'stat', 'media/images/foto.png', '--json')
        self.assertEqual(rc, 0)
        info = json.loads(out)
        self.assertEqual(info['path'], 'media/images/foto.png')
        self.assertEqual(info['size'], 5)
        self.assertEqual(info['type'], 'image')

    def test_manifest_writes_file(self):
        """QUÉ ES: `manifest` escribe manifest.json con el fileCount real."""
        src = self.write_src('a.md')
        run_cli(self.cloud, 'upload', src, 'drafts')
        src2 = self.write_src('b.mp4')
        run_cli(self.cloud, 'upload', src2)
        rc, _out, err = run_cli(self.cloud, 'manifest')
        self.assertEqual(rc, 0, err)
        manifest_path = os.path.join(self.cloud, 'manifest.json')
        self.assertTrue(os.path.isfile(manifest_path))
        with open(manifest_path, encoding='utf-8') as fh:
            manifest = json.load(fh)
        self.assertEqual(manifest['fileCount'], 2)

    def test_remove_then_not_found(self):
        """QUÉ ES: `remove --yes` borra (exit 0); un segundo remove del mismo archivo falla (exit 2)."""
        src = self.write_src('viejo.mp4')
        run_cli(self.cloud, 'upload', src)
        target = 'media/videos/viejo.mp4'
        rc, out, _err = run_cli(self.cloud, 'remove', target, '--yes')
        self.assertEqual(rc, 0)
        self.assertIn('ok:', out)
        self.assertFalse(os.path.isfile(os.path.join(self.cloud, 'media', 'videos', 'viejo.mp4')))
        rc2, _out2, err2 = run_cli(self.cloud, 'remove', target, '--yes')
        self.assertEqual(rc2, 2)
        self.assertIn('no existe', err2)

    def test_remove_unsafe_path(self):
        """QUÉ ES: `remove ../x` se rechaza (exit 2) — nunca se borra fuera del cloud."""
        rc, _out, err = run_cli(self.cloud, 'remove', '../x', '--yes')
        self.assertEqual(rc, 2)
        self.assertIn('no segura', err)


if __name__ == '__main__':
    # QUÉ ES: punto de entrada del runner unittest (verbosity 2 = nombre por test).
    unittest.main(verbosity=2)
