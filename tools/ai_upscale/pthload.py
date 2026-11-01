import zipfile,pickle,numpy as np,onnx,sys
from onnx import helper as h, TensorProto as T, numpy_helper as nh
def load(path):
    global z,root
    z=zipfile.ZipFile(path); root=z.namelist()[0].split('/')[0]
    sd=U(z.open(f'{root}/data.pkl')).load()
    return sd.get('params_ema',sd.get('params',sd))

DT={'FloatStorage':np.float32,'HalfStorage':np.float16}
class Stor:
    def __init__(s,a): s.a=a
def rebuild(storage,offset,size,stride,*a):
    arr=storage.a; n=int(np.prod(size)) if size else 1
    if not size: return arr[offset:offset+1].reshape(())
    return np.lib.stride_tricks.as_strided(arr[offset:],shape=size,strides=[x*arr.itemsize for x in stride]).copy()
class U(pickle.Unpickler):
    def find_class(s,mod,name):
        if name=='_rebuild_tensor_v2': return rebuild
        if mod=='collections' and name=='OrderedDict':
            import collections; return collections.OrderedDict
        if name.endswith('Storage'): return name
        return super().find_class(mod,name)
    def persistent_load(s,pid):
        _,st,key,loc,numel=pid
        raw=z.read(f'{root}/data/{key}'); return Stor(np.frombuffer(raw,dtype=DT[st]))
