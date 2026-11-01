"""PDFの商品知識テストから写真を切り出す。
使い方: python3 tools/crop_pdf.py <PDFのパス> <号のキー>   例: python3 tools/crop_pdf.py 2026_9.pdf v2026-09
写真の枠（約112pt四方）を見つけて、上から下・左から右の順に番号を付けて img/ に保存する。
枠の中の写真データをPDFから直接取り出し、3倍にきれいに拡大して輪郭を少しくっきりさせる。
（PDFの写真は横幅100〜200px程度と小さいので、元画像がない限りこれ以上の画質にはできない）
必要: pip install pymupdf pillow"""
import sys, os, io
import pymupdf
from PIL import Image, ImageFilter

def enhance(im):
    im = im.convert("RGB")
    scale = max(1, min(4, round(480 / max(im.size))))
    im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))

def main(pdf, key, out):
    os.makedirs(out, exist_ok=True)
    doc = pymupdf.open(pdf)
    sec = 0
    for page in doc:
        infos = page.get_image_info(xrefs=True)
        frames = [pymupdf.Rect(x["bbox"]) for x in infos
                  if 111 <= x["bbox"][2] - x["bbox"][0] <= 114 and 111 <= x["bbox"][3] - x["bbox"][1] <= 114]
        if len(frames) < 6:
            continue
        sec += 1
        uniq = []
        for r in frames:
            if not any(abs(r.x0 - u.x0) < 15 and abs(r.y0 - u.y0) < 15 for u in uniq):
                uniq.append(r)
        uniq.sort(key=lambda r: (round(r.y0 / 40), r.x0))
        photos = [x for x in infos if pymupdf.Rect(x["bbox"]) not in uniq and x["xref"]]
        for n, fr in enumerate(uniq, 1):
            inside = [x for x in photos if fr.contains(pymupdf.Point((x["bbox"][0]+x["bbox"][2])/2, (x["bbox"][1]+x["bbox"][3])/2))
                      and pymupdf.Rect(x["bbox"]).width < fr.width * 1.4]
            im = None
            if len(inside) == 1:
                try:
                    im = Image.open(io.BytesIO(doc.extract_image(inside[0]["xref"])["image"]))
                    if inside[0]["width"] != im.width:
                        im = None
                except Exception:
                    im = None
            if im is None:  # 写真が複数に分かれている等：枠の内側を高解像度で描画
                r = pymupdf.Rect(fr.x0 + 4, fr.y0 + 4, fr.x1 - 4, fr.y1 - 4)
                pix = page.get_pixmap(clip=r, dpi=150)
                im = Image.open(io.BytesIO(pix.tobytes("png")))
            enhance(im).save(os.path.join(out, f"{key}-s{sec}-{n:02d}.jpg"), quality=90, optimize=True)
        print(f"問題{sec}: {len(uniq)}枚")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "img"))
