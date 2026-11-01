import onnxruntime as ort,numpy as np,sys,os,glob,time
from PIL import Image
sess=ort.InferenceSession(sys.argv[1],providers=['CPUExecutionProvider'])
src,dst=sys.argv[2],sys.argv[3]; os.makedirs(dst,exist_ok=True)
files=sorted(glob.glob(src+'/*.png'))[int(sys.argv[4]) if len(sys.argv)>4 else 0:][:int(sys.argv[5]) if len(sys.argv)>5 else None]
for f in files:
    out=os.path.join(dst,os.path.basename(f)[:-4]+'.jpg')
    if os.path.exists(out): continue
    t=time.time(); im=np.asarray(Image.open(f).convert('RGB'),np.float32)/255
    x=im.transpose(2,0,1)[None]; y=sess.run(None,{'input':x})[0][0]
    y=(np.clip(y,0,1).transpose(1,2,0)*255+.5).astype(np.uint8)
    Image.fromarray(y).save(out,quality=88,optimize=True); print(os.path.basename(f),round(time.time()-t,1),'s',flush=True)
