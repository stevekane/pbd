***COLLISION CONSTRAINT DERIVATION

C(p)     = dot(p - qc, n)
         = (p - qc) * n
         = pn - qcn 

dC(p)    = pqc.x * n.x + 


|dC(p)|  = 1
s        = dot(p - qc, n) / w
dP       = -s * w * dC(p)
         = -dot(p - qc, n) * n
