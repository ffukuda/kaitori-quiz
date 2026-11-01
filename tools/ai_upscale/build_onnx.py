import sys,numpy as np,onnx
from onnx import helper as h, TensorProto as T, numpy_helper as nh
import pthload  # 同じフォルダの読み込み用モジュール
sd=pthload.load(sys.argv[1])
keys=sorted({int(k.split('.')[1]) for k in sd if k.startswith('body.')})
nodes=[];inits=[];x='input'
for i in keys:
    w=sd[f'body.{i}.weight'].astype(np.float32)
    if w.ndim==4:
        inits+=[nh.from_array(w,f'w{i}'),nh.from_array(sd[f'body.{i}.bias'].astype(np.float32),f'b{i}')]
        nodes.append(h.make_node('Conv',[x,f'w{i}',f'b{i}'],[f'o{i}'],pads=[1,1,1,1],kernel_shape=[3,3]))
    else:
        inits.append(nh.from_array(w.reshape(-1,1,1),f'w{i}')); nodes.append(h.make_node('PRelu',[x,f'w{i}'],[f'o{i}']))
    x=f'o{i}'
nodes.append(h.make_node('DepthToSpace',[x],['ps'],blocksize=4,mode='CRD'))
inits.append(nh.from_array(np.array([1,1,4,4],np.float32),'sc'))
nodes.append(h.make_node('Resize',['input','','sc'],['base'],mode='nearest'))
nodes.append(h.make_node('Add',['ps','base'],['output']))
g=h.make_graph(nodes,'srvgg',[h.make_tensor_value_info('input',T.FLOAT,[1,3,None,None])],[h.make_tensor_value_info('output',T.FLOAT,[1,3,None,None])],inits)
m=h.make_model(g,opset_imports=[h.make_opsetid('',13)]); m.ir_version=8; onnx.save(m,sys.argv[2]); print('ok',len(keys))
