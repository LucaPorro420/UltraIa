#!/usr/bin/env python3
"""md2pdf.py — Markdown a PDF con stdlib puro (cero dependencias, keyless-first).

Genera un PDF 1.4 mínimo (A4) con Helvetica/Helvetica-Bold/Courier (WinAnsi):
títulos, párrafos con wrap, listas, citas, code blocks, saltos de página y
numeración de páginas. Los caracteres fuera de latin-1 se sustituyen de forma
controlada (tabla de diagramas + '?' genérico) con aviso a stderr.

Uso:
  python scripts/md2pdf.py <input.md> [--out <output.pdf>]
  python scripts/md2pdf.py --check <file.pdf>     # valida %PDF/xref/%%EOF/páginas
  python scripts/md2pdf.py <input.md> --check     # genera y valida en un paso
"""

import argparse
import os
import re
import sys

# --- Geometría A4 (puntos) ---------------------------------------------------
PAGE_W, PAGE_H = 595.28, 841.89
MARGIN = 50
BODY, H1, H2, H3, CODE = 10.5, 18.0, 13.5, 11.5, 8.5
LINE_H = 1.35  # interlineado múltiplo del tamaño

# --- Tablas de sustitución WinAnsi -------------------------------------------
DIAGRAM = {
    "\u2500": "-", "\u2501": "=", "\u2502": "|", "\u2503": "|",
    "\u2514": "+", "\u251c": "+", "\u250c": "+", "\u2518": "+",
    "\u2510": "+", "\u2524": "+", "\u2534": "+", "\u252c": "+",
    "\u253c": "+", "\u251d": "+", "\u2571": "/", "\u2572": "\\",
    "\u25bc": "v", "\u25b2": "^", "\u25b6": ">", "\u25c0": "<",
    "\u2192": "->", "\u2190": "<-", "\u2194": "<->", "\u21d2": "=>",
    "\u2713": "OK", "\u2717": "X", "\u2714": "OK", "\u2605": "*",
    "\u2606": "*", "\u2026": "...", "\u2018": "'", "\u2019": "'",
    "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "--",
    "\u00a0": " ",
}

# --- Anchos aproximados Helvetica (factor x tamaño) --------------------------
WIDE = set("mMwW@#%&")
NARROW = set("iljtfI.,:;'!|()[]{}` ")
SPACE_W = 0.28


def char_w(ch, size):
    if ch == " ":
        return SPACE_W * size
    if ch in WIDE:
        return 0.72 * size
    if ch in NARROW:
        return 0.28 * size
    return 0.5 * size


def text_w(text, size):
    return sum(char_w(c, size) for c in text)


def latin1(s):
    """Convierte a WinAnsi (latin-1 + rango 160-255), sustituyendo lo demás."""
    out = []
    for ch in s:
        o = ord(ch)
        if o < 128 or 160 <= o <= 255:
            out.append(ch)
        else:
            repl = DIAGRAM.get(ch)
            if repl is None:
                repl = "?"
                sys.stderr.write("md2pdf: aviso: caracter no-latin1 sustituido: U+%04X\n" % o)
            out.append(repl)
    return "".join(out)


def esc(s):
    """Escape para strings PDF (literales entre paréntesis)."""
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


# --- Layout ------------------------------------------------------------------
class Page:
    def __init__(self):
        self.lines = []  # (x, y, size, font, text)

    def add(self, x, y, size, font, text):
        self.lines.append((round(x, 2), round(y, 2), size, font, text))


class Writer:
    def __init__(self):
        self.pages = [Page()]
        self.y = PAGE_H - MARGIN
        self.n_page = 1  # página actual (1-indexada)

    def ensure(self, needed):
        if self.y - needed < MARGIN:
            self.new_page()

    def new_page(self):
        self.pages.append(Page())
        self.y = PAGE_H - MARGIN
        self.n_page += 1

    def text(self, text, size, font="F1", x=None, indent=0):
        self.ensure(size * LINE_H)
        x = x if x is not None else MARGIN + indent
        self.pages[-1].add(x, self.y, size, font, latin1(esc(text)))
        self.y -= size * LINE_H

    def wrap(self, text, size, font="F1", indent=0, bullet=None):
        """Párrafo con wrap por ancho de línea."""
        width = PAGE_W - 2 * MARGIN - indent
        avail = width - (text_w(bullet, size) + 6 if bullet else 0)
        words = text.split()
        cur = bullet if bullet else ""
        for w in words:
            trial = (cur + " " + w).strip()
            if text_w(trial, size) <= avail:
                cur = trial
            else:
                if cur.strip():
                    self.text(cur, size, font, indent=indent)
                cur = w
        if cur.strip():
            self.text(cur, size, font, indent=indent)

    def bullet(self, text, size, num=None):
        mark = ("%s. " % num) if num else "- "
        self.wrap(text, size, indent=18, bullet=mark)

    def spacer(self, h=8):
        self.ensure(h)
        self.y -= h


def run(md_path, out_path):
    with open(md_path, encoding="utf-8") as fh:
        src = fh.read()

    # Normalizar finales de línea y quitar BOM
    src = src.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")

    w = Writer()
    in_code = False
    code_buf = []
    list_num = None  # contador para listas numeradas

    for raw in src.split("\n"):
        line = raw.rstrip()

        # Code blocks fenced
        if line.startswith("```"):
            if in_code:
                for cl in code_buf:
                    w.text(cl if cl else " ", CODE, font="F3", indent=8)
                w.spacer(4)
                in_code = False
            else:
                w.spacer(6)
                in_code = True
                code_buf = []
            continue
        if in_code:
            code_buf.append(line)
            continue

        if line.startswith("### "):
            w.spacer(6); w.text(line[4:], H3, font="F2"); list_num = None
        elif line.startswith("## "):
            w.spacer(8); w.text(line[3:], H2, font="F2"); list_num = None
        elif line.startswith("# "):
            w.spacer(10); w.text(line[2:], H1, font="F2"); list_num = None
        elif line.startswith("> "):
            w.spacer(2); w.text(line[2:], BODY, font="F1", indent=16); list_num = None
        elif not line.strip():
            w.spacer(5); list_num = None
        elif re.match(r"^\s*[-*] ", line):
            w.bullet(re.sub(r"^\s*[-*] ", "", line), BODY); list_num = None
        elif re.match(r"^\s*\d+[.)] ", line):
            if list_num is None:
                list_num = 1
            w.bullet(re.sub(r"^\s*\d+[.)] ", "", line), BODY, num=list_num)
            list_num += 1
        else:
            w.wrap(line, BODY)

    if in_code:  # fence sin cerrar: tolerar
        for cl in code_buf:
            w.text(cl if cl else " ", CODE, font="F3", indent=8)

    # Números de página (centrados abajo) — se añaden al final
    total = len(w.pages)
    for i, pg in enumerate(w.pages, 1):
        pg.add(PAGE_W / 2 - text_w(str(i), 8) / 2, MARGIN - 14, 8, "F1", str(i))

    return serialize(w, total)


def serialize(w, total):
    """Ensambla el PDF 1.4: catálogo, páginas, fuentes, streams y xref."""
    objs = []
    # obj 1: Catalog
    objs.append("<< /Type /Catalog /Pages 2 0 R >>")
    # obj 2: Pages (kids se rellenan después)
    kid_ids = [5 + i * 2 for i in range(total)]
    objs.append("<< /Type /Pages /Kids [%s] /Count %d >>" % (" ".join("%d 0 R" % k for k in kid_ids), total))
    # obj 3: Helvetica
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    # obj 4: Helvetica-Bold
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    # obj 5: Courier
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")

    for i, pg in enumerate(w.pages):
        # stream content
        ops = []
        for (x, y, size, font, text) in pg.lines:
            ops.append("BT /%s %s Tf %s %s Td (%s) Tj ET" % (font, size, x, y, text))
        content = "\n".join(ops).encode("latin-1")
        cid = 6 + i * 2  # content object id
        pid = cid - 1    # page object id
        objs.append("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %s %s] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents %d 0 R >>" % (PAGE_W, PAGE_H, cid))
        objs.append("<< /Length %d >>\nstream\n%s\nendstream" % (len(content), content.decode("latin-1")))

    out = ["%PDF-1.4"]
    offsets = [0]
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out.append("%d 0 obj" % i)
        out.append(body)
        out.append("endobj")
    xref_pos = len(out)
    out.append("xref")
    out.append("0 %d" % (len(objs) + 1))
    out.append("0000000000 65535 f ")
    for off in offsets[1:]:
        out.append("%010d 00000 n " % off)
    out.append("trailer")
    out.append("<< /Size %d /Root 1 0 R >>" % (len(objs) + 1))
    out.append("startxref")
    out.append(str(xref_pos))
    out.append("%%EOF")
    return "\n".join(out) + "\n"


def check(pdf_path):
    """Valida %PDF, xref, %%EOF y que tenga al menos una página."""
    try:
        with open(pdf_path, "rb") as fh:
            data = fh.read()
    except OSError as e:
        sys.stderr.write("md2pdf: error: %s\n" % e)
        return 1
    head = data[:5] == b"%PDF-"
    tail = data.rstrip().endswith(b"%%EOF")
    has_xref = b"xref" in data
    n_pages = data.count(b"/Type /Page ") + data.count(b"/Type /Page/")
    ok = head and tail and has_xref and n_pages > 0
    print("md2pdf: check %s: header=%s xref=%s eof=%s paginas=%d -> %s" % (
        os.path.basename(pdf_path), head, has_xref, tail, n_pages,
        "OK" if ok else "FALLO"))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="Markdown a PDF (stdlib puro)")
    ap.add_argument("input", help="archivo .md (o .pdf con --check)")
    ap.add_argument("--out", help="PDF de salida (default: input con .pdf)")
    ap.add_argument("--check", action="store_true", help="modo validación del PDF")
    args = ap.parse_args()

    if args.check:
        return check(args.input)

    out = args.out or (os.path.splitext(args.input)[0] + ".pdf")
    pdf = run(args.input, out)
    with open(out, "w", encoding="latin-1", newline="") as fh:
        fh.write(pdf)
    print("md2pdf: %s generado (%d bytes)" % (out, len(pdf)))
    return check(out)


if __name__ == "__main__":
    sys.exit(main())