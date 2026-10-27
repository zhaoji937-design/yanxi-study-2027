"""Render the user's scanned textbook; page numbers are printed pages, not PDF indexes.

Usage: python render-physiology-pages.py /absolute/path/to/textbook.pdf
Requires PyMuPDF and Pillow. Output images are source evidence, not OCR transcripts.
"""
import base64
import hashlib
import io
import json
import sys
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

ROOT = Path(__file__).resolve().parent.parent
SOURCE = None
DOC = None


def initialize(source):
    global DOC
    import pymupdf
    DOC = pymupdf.open(source)


def render(page):
    import pymupdf
    from PIL import Image
    # Verified against the visible printed footers: PDF 26 = printed 12.
    pix = DOC[page + 13].get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    image = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    buffer = io.BytesIO()
    image.save(buffer, format='WEBP', quality=84, method=4)
    data = buffer.getvalue()
    key = hashlib.sha256(data).hexdigest()[:24]
    return page, key, pix.width, pix.height, 'data:image/webp;base64,' + base64.b64encode(data).decode()


if __name__ == '__main__':
    source = str(Path(sys.argv[1]).resolve(strict=True))
    target = ROOT / 'build/physiology-page-images.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    metadata = {'book': 'physiology', 'printedPageMapping': 'PDF page = printed page + 14', 'pages': {}}
    images = {}
    with ProcessPoolExecutor(max_workers=3, initializer=initialize, initargs=(source,)) as pool:
        for page, key, width, height, uri in pool.map(render, range(1, 361), chunksize=6):
            metadata['pages'][str(page)] = {'key': key, 'width': width, 'height': height}
            images[key] = uri
            if page % 60 == 0:
                print(json.dumps({'rendered': page, 'total': 360}), flush=True)
    target.write_text(json.dumps(images, separators=(',', ':')), encoding='utf-8')
    (ROOT / 'content/physiology-reading-pages.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'pages': len(images), 'imageBytes': sum(len(s) for s in images.values())}), flush=True)
