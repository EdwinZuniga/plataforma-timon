import sys, os, time
os.environ.setdefault('RS','0.35')
sys.path.insert(0,'src')
import numpy as np, cv2
import render as R
times=[float(x) for x in sys.argv[2:]]
out=[]
t0=time.time()
for t in times:
    img=R.to_u8(R.render(t))
    cv2.putText(img,'%.2f'%t,(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,0,255),2)
    out.append(img)
print('%.2fs/frame'%((time.time()-t0)/len(times)))
cols=3
rows=[np.hstack(out[i:i+cols]+[np.zeros_like(out[0])]*(cols-len(out[i:i+cols]))) for i in range(0,len(out),cols)]
cv2.imwrite(sys.argv[1], np.vstack(rows)[:,:,::-1])
