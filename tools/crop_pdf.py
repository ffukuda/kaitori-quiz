"""PDFの商品知識テストから写真を切り出す。
使い方: python3 tools/crop_pdf.py <PDFのパス> <号のキー>   例: python3 tools/crop_pdf.py 2026_9.pdf v2026-09
写真の枠（約112pt四方）を見つけて、上から下・左から右の順に番号を付けて img/ に保存する。
必要: pip install pymupdf pillow"""
import sys, os, io
import pymupdf
from PIL import Image

pdf, key = sys.argv[1], sys.argv[2]
out = os.path.join(os.path.dirname(__file__), "..", "img")
os.makedirs(out, exist_ok=True)
doc = pymupdf.open(pdf)
sec = 0
for page in doc:
    frames = [pymupdf.Rect(x["bbox"]) for x in page.get_image_info()
              if 111 <= x["bbox"][2] - x["bbox"][0] <= 114 and 111 <= x["bbox"][3] - x["bbox"][1] <= 114]
    if len(frames) < 6:
        continue
    sec += 1
    uniq = []
    for r in frames:
        if not any(abs(r.x0 - u.x0) < 15 and abs(r.y0 - u.y0) < 15 for u in uniq):
            uniq.append(r)
    uniq.sort(key=lambda r: (round(r.y0 / 40), r.x0))
    for n, r in enumerate(uniq, 1):
        pix = page.get_pixmap(clip=r, dpi=220)
        im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        im.thumbnail((480, 480))
        im.save(os.path.join(out, f"{key}-s{sec}-{n:02d}.jpg"), quality=82, optimize=True)
    print(f"問題{sec}: {len(uniq)}枚")
