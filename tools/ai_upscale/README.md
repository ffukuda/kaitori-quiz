# 写真のAI高画質化（Real-ESRGAN realesr-general-x4v3）

PDFの写真は横幅100〜200px程度しかないので、AI（Real-ESRGAN）で4倍に高画質化してから `img/` に入れています。
PyTorchなしで動くように、学習済みの重みをONNXに変換して onnxruntime で実行します。

```
pip install pymupdf pillow numpy onnx onnxruntime
curl -L -o gen.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
python3 build_onnx.py gen.pth gen.onnx          # 1回だけ
# 1. PDFから元の写真をPNGで取り出す（crop_pdf.py の拡大処理をしない版）→ native/ に置く
# 2. 高画質化
python3 upscale.py gen.onnx native out           # out/*.jpg ができる → 720px以内に縮めて img/ へ
```

注意：AIは細部を推測して描くため、モノグラム柄やロゴ・文字盤の細かい文字が実物と少し違う形になることがあります。
より強いモデル（RealESRGAN_x4plus）も試しましたが、モノグラム柄の崩れが大きかったので general-x4v3 を使っています。
