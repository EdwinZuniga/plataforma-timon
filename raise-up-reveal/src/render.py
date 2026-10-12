"""Motor de render procedural (numpy + OpenCV). Cada fotograma es una función pura de t.
Uso: RS=1 python3 src/render.py [inicio fin]   (RS = escala de resolución, 1 = 1920x1080)"""
import os, sys, math, pickle
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from timeline import *

cv2.setNumThreads(1)
RS = float(os.environ.get('RS', '1'))
CW, CH = int(round(1920 * RS)), int(round(1080 * RS))
OUT = os.environ.get('OUT', 'work/frames')
L = pickle.load(open('work/layers.pkl', 'rb'))
S, LW, LH = L['S'], L['W'], L['H']
OX, OY = 960 - LW / 2.0, 540 - LH / 2.0           # origen de la imagen del logo en el lienzo (px 1080p)
F = 1800.0                                         # distancia focal de la cámara virtual

# ---------------------------------------------------------------- elementos --------
EL = {}
for e in L['elements']:
    a = e['a'][..., None]
    pm = np.concatenate([e['rgb'] / 255.0 * a, a], axis=2).astype(np.float32)   # premultiplicado
    h, w = e['a'].shape
    e['pm'] = pm
    e['w'], e['h'] = w, h
    e['cx'], e['cy'] = e['x0'] + w / 2.0, e['y0'] + h / 2.0                     # centro en espacio logo
    e['pivot'] = (e['cx'], e['cy'])
    EL[e['name']] = e
FLAME_BASE = (230 * S, 592 * S)       # base de la llama (espacio logo)
FLAME_CORE = (230 * S, 430 * S)
for k in ('flame_red', 'flame_orange', 'flame_yellow'): EL[k]['pivot'] = FLAME_BASE
EL['person']['pivot'] = (245 * S, 576 * S)
def to_canvas(p): return (OX + p[0], OY + p[1])
FC = to_canvas(FLAME_CORE)                      # núcleo de la llama en el lienzo (1080p)
FB = to_canvas(FLAME_BASE)

UPIMG = L['up'].astype(np.float32) / 255.0
FINAL = np.ones((CH, CW, 3), np.float32)
_fi = np.ones((1080, 1920, 3), np.float32)
x0_, y0_ = int(round(OX)), int(round(OY))
_fi[max(0, y0_):min(1080, y0_ + LH), max(0, x0_):min(1920, x0_ + LW)] = UPIMG[max(0, -y0_):LH - max(0, y0_ + LH - 1080), max(0, -x0_):LW - max(0, x0_ + LW - 1920)]
FINAL = cv2.resize(_fi, (CW, CH), interpolation=cv2.INTER_AREA) if RS != 1 else _fi

# ---------------------------------------------------------------- campos estáticos --
YY, XX = np.mgrid[0:CH, 0:CW].astype(np.float32)
XX /= RS; YY /= RS                                  # coordenadas en px 1080p
R_DAWN = np.hypot(XX - FC[0], YY - (FC[1] - 40)).astype(np.float32)
_rr = np.hypot((XX - 960) / 1250.0, (YY - 560) / 800.0)
_dark_edge = np.array([3, 6, 16], np.float32) / 255
_dark_mid = np.array([14, 28, 62], np.float32) / 255
_g = np.exp(-(np.hypot((XX - FC[0]) / 900.0, (YY - FC[1] - 80) / 700.0)) ** 2 * 1.4)[..., None]
DARK = (_dark_edge + (_dark_mid - _dark_edge) * _g).astype(np.float32)
VIGW = (np.hypot((XX - 960) / 1150.0, (YY - 540) / 720.0) ** 2).astype(np.float32)
THETA = np.arctan2(YY[::4, ::4] - (FB[1] + 60), XX[::4, ::4] - FB[0]).astype(np.float32)
RAD4 = np.hypot(XX[::4, ::4] - FB[0], YY[::4, ::4] - FB[1]).astype(np.float32)

_rng = np.random.RandomState(7)
def _fbm(w, h, octaves=4, seed=1):
    rs = np.random.RandomState(seed); acc = np.zeros((h, w), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        n = rs.rand(max(2, h >> (o + 1)), max(2, w >> (o + 1))).astype(np.float32)
        acc += amp * cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC); tot += amp; amp *= .5
    return acc / tot
HAZE = _fbm(512, 288, 5, 3)                          # textura de bruma tileable por reflexión
_r = np.random.RandomState(11).rand(720).astype(np.float32)
_k = np.exp(-0.5 * (np.arange(-9, 10) / 2.5) ** 2); _k /= _k.sum()
RAYS = np.convolve(np.concatenate([_r[-9:], _r, _r[:9]]), _k, mode='valid').astype(np.float32)
RAYS = (RAYS - RAYS.min()) / (RAYS.max() - RAYS.min())
GRAIN = np.random.RandomState(5).randn(CH, CW).astype(np.float32)

# ---------------------------------------------------------------- partículas ------
def _mk_particles():
    rs = np.random.RandomState(42); P = []
    for i in range(260):                 # brasas convergentes
        ang = rs.rand() * 2 * math.pi; rad = 550 + rs.rand() * 900
        ts = 1.1 + rs.rand() * 2.1; dur = 1.3 + rs.rand() * 1.0
        P.append(dict(kind='conv', ang=ang, rad=rad, ts=ts, te=min(ts + dur, 3.5 + rs.rand() * .15), sw=(rs.rand() - .5) * 2.4,
                      sz=0.8 + rs.rand() * 1.9, hue=rs.rand()))
    for i in range(170):                 # chispas ascendentes desde la llama
        P.append(dict(kind='rise', x=(rs.rand() - .5) * 260, ts=3.5 + rs.rand() * 3.0, life=1.4 + rs.rand() * 1.8,
                      vx=(rs.rand() - .5) * 60, vy=-(110 + rs.rand() * 260), sz=0.8 + rs.rand() * 2.2, ph=rs.rand() * 6.28, hue=rs.rand()))
    for i in range(70):                  # polvo de luz ambiental
        P.append(dict(kind='mote', x=rs.rand() * 1920, y=rs.rand() * 1080, vx=(rs.rand() - .5) * 14, vy=-4 - rs.rand() * 12,
                      sz=0.7 + rs.rand() * 1.4, ph=rs.rand() * 6.28, z=rs.rand()))
    return P
PARTS = _mk_particles()
def _mk_streaks():
    rs = np.random.RandomState(99); out = []
    for i in range(22):
        out.append(dict(x=120 + rs.rand() * 1680, t0=2.0 + rs.rand() * 2.6, v=900 + rs.rand() * 1400, ln=90 + rs.rand() * 260, w=1 + rs.rand() * 1.4, a=0.25 + rs.rand() * 0.45))
    return out
STREAKS = _mk_streaks()

def ember_col(h, k=1.0):    # rojo profundo -> naranja -> oro
    c = np.array([1.0, 0.18 + 0.62 * h, 0.04 + 0.30 * h * h]) * k
    return c

# ---------------------------------------------------------------- homografía -------
def make_H(el, p):
    px, py = el['pivot']
    lx, ly = px - el['x0'], py - el['y0']
    rx, ry, rz = p.get('rx', 0), p.get('ry', 0), p.get('rz', 0)
    cx_, sx_ = math.cos(rx), math.sin(rx); cy_, sy_ = math.cos(ry), math.sin(ry); cz_, sz_ = math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx_, -sx_], [0, sx_, cx_]]); Ry = np.array([[cy_, 0, sy_], [0, 1, 0], [-sy_, 0, cy_]])
    Rz = np.array([[cz_, -sz_, 0], [sz_, cz_, 0], [0, 0, 1]])
    R = Rz @ Ry @ Rx
    s = p.get('sc', 1.0); ssx = s * p.get('sx', 1.0); ssy = s * p.get('sy', 1.0)
    dx, dy, dz = p.get('dx', 0), p.get('dy', 0), p.get('dz', 0)
    M = np.array([[F * R[0, 0] * ssx, F * R[0, 1] * ssy, F * dx],
                  [F * R[1, 0] * ssx, F * R[1, 1] * ssy, F * dy],
                  [R[2, 0] * ssx, R[2, 1] * ssy, F + dz]])
    T_loc = np.array([[1, 0, -lx], [0, 1, -ly], [0, 0, 1]])
    T_pix = np.array([[1, 0, OX + px], [0, 1, OY + py], [0, 0, 1]])
    K = np.diag([RS, RS, 1.0])
    return K @ T_pix @ M @ T_loc

def warp_roi(src, Hm, roi):
    x0, y0, x1, y1 = roi
    T = np.array([[1, 0, -x0], [0, 1, -y0], [0, 0, 1]])
    return cv2.warpPerspective(src, T @ Hm, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

def corners_roi(el, Hm, pad=4):
    w, h = el['w'], el['h']
    pts = np.array([[0, 0, 1], [w, 0, 1], [w, h, 1], [0, h, 1]], np.float64).T
    q = Hm @ pts
    if (q[2] <= 1e-3).any(): return None
    q = q[:2] / q[2]
    x0, y0 = int(math.floor(q[0].min())) - pad, int(math.floor(q[1].min())) - pad
    x1, y1 = int(math.ceil(q[0].max())) + pad, int(math.ceil(q[1].max())) + pad
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(CW, x1), min(CH, y1)
    if x1 <= x0 or y1 <= y0: return None
    return (x0, y0, x1, y1)

def blur_roi(a, sigma):
    sigma = max(0.01, sigma * RS)
    return cv2.GaussianBlur(a, (0, 0), sigma)

def draw_element(canvas, el, ps, src=None, shadow=True):
    """ps = lista de parámetros (muestras de desenfoque de movimiento). Compone sobre canvas."""
    src = el['pm'] if src is None else src
    Hs = [make_H(el, p) for p in ps]
    rois = [corners_roi(el, Hm) for Hm in Hs]
    rois = [r for r in rois if r is not None]
    if not rois: return
    roi = (min(r[0] for r in rois), min(r[1] for r in rois), max(r[2] for r in rois), max(r[3] for r in rois))
    acc = None
    for Hm in Hs:
        w_ = warp_roi(src, Hm, roi)
        acc = w_ if acc is None else acc + w_
    acc /= len(Hs)
    p0 = ps[-1]
    al = p0.get('alpha', 1.0)
    if al < 1: acc *= al
    fl = p0.get('flash', 0.0)
    if fl > 0.001: acc[..., :3] += fl * acc[..., 3:4]
    tint = p0.get('tint')
    if tint is not None: acc[..., :3] = acc[..., :3] * (1 - tint[3]) + acc[..., 3:4] * np.array(tint[:3], np.float32) * tint[3]
    x0, y0, x1, y1 = roi
    sub = canvas[y0:y1, x0:x1]
    elev = p0.get('elev', 0.0)
    if shadow and elev > 0.01:
        pad = int(60 * RS + 30 * elev * RS)
        sa = acc[..., 3]
        sig = (3 + 20 * elev)
        ox, oy = elev * 30 * RS, elev * 52 * RS
        M = np.float32([[1, 0, ox], [0, 1, oy]])
        sh = cv2.warpAffine(sa, M, (sa.shape[1], sa.shape[0]))
        sh = blur_roi(sh, sig)
        k = 0.30 * elev ** 0.7
        sub[:] = sub * (1 - (sh * k)[..., None] * 1.0) + (sh * k)[..., None] * np.float32([0.02, 0.05, 0.12]) * 0.0
    sub[:] = sub * (1 - acc[..., 3:4]) + acc[..., :3]

# ---------------------------------------------------------------- animación ---------
RAISE_NAMES = ['R', 'A', 'I', 'S', 'E']
TG = ['tg%02d' % k for k in range(10)]
VG = sorted([n for n in EL if n.startswith('vg')])
RAISE_X0 = {n: 0 for n in RAISE_NAMES}

def fall(t, Tl, dur, p0):
    """caída con aceleración + rebote amortiguado. p0: parámetros iniciales. Devuelve (params, k_vuelo, tau)."""
    u = (t - (Tl - dur)) / dur
    p = {}
    if u <= 0: k = 1.0
    elif u < 1: k = 1 - ease_in_cubic(u) ** 0.85
    else: k = 0.0
    for key, v in p0.items(): p[key] = v * k
    p['sc'] = 1 + (p0.get('sc', 0)) * k if 'sc' in p0 else 1.0
    tau = t - Tl
    if tau >= 0:
        b = damped(tau, 10.0, 3.2)
        p['sy'] = 1 - 0.09 * b
        p['sx'] = 1 + 0.05 * b
        p['dy'] = p.get('dy', 0) + 6 * (-b) * 0
        p['flash'] = 0.55 * math.exp(-tau * 18)
    p['elev'] = clamp(k * 1.6, 0, 1.0)
    p['alpha'] = 1.0 if u > 0.02 else 0.0
    if 0 < u < 0.15: p['alpha'] = u / 0.15
    return p, k, tau

def anim(name, t):
    """parámetros del elemento en el instante t; None = no visible"""
    e = EL[name]
    if name in RAISE_NAMES:
        i = RAISE_NAMES.index(name); Tl = T_RAISE[i]
        sgn = [-1, 1, 0, -1, 1][i]
        p0 = dict(dy=-900, dz=-760, rx=-1.25, rz=0.22 * sgn, dx=160 * sgn, sc=0)
        p, k, tau = fall(t, Tl, 0.62, p0)
        p.setdefault('sc', 1.0)
        return p if p['alpha'] > 0 else None
    if name in ('U', 'P'):
        Tl = T_U if name == 'U' else T_P
        p0 = dict(dy=980, dz=-700, rx=1.2, rz=0.18 * (1 if name == 'U' else -1), dx=-140 if name == 'U' else 140, sc=0)
        p, k, tau = fall(t, Tl, 0.66, p0)
        p.setdefault('sc', 1.0)
        return p if p['alpha'] > 0 else None
    if name == 'arrow':
        u = (t - (T_ARROW - 0.58)) / 0.58
        if u <= 0: return None
        k = 1 - ease_out_back(u, 1.2) if u < 1 else 0
        p = dict(dy=1050 * k, rz=0.0, sc=1.0, alpha=1.0, elev=clamp(k * 1.4, 0, 1))
        tau = t - T_ARROW
        if tau >= 0: p['flash'] = 0.7 * math.exp(-tau * 14); p['dy'] = -4 * damped(tau, 12, 3.0) * 6
        return p
    if name == 'dot':
        p0 = dict(dy=-760, dz=-500, rx=0.8, sc=0)
        p, k, tau = fall(t, T_DOT, 0.5, p0)
        if tau >= 0: b = damped(tau, 9.0, 3.4); p['sy'] = 1 - 0.20 * b; p['sx'] = 1 + 0.12 * b
        p.setdefault('sc', 1.0)
        return p if p['alpha'] > 0 else None
    if name == 'brush':
        u = (t - T_BRUSH0) / (T_BRUSH1 - T_BRUSH0)
        if u <= 0: return None
        k = 1 - ease_out_cubic(u)
        return dict(dx=-170 * k, sc=1.0, alpha=1.0, elev=0.0, wipe=ease_in_out_cubic(u * 1.0))
    if name.startswith('tg'):
        k = int(name[2:]); Ts = T_TAG0 + TAG_STEP * k
        u = (t - Ts) / 0.34
        if u <= 0: return None
        eb = ease_out_back(u, 2.2)
        p = dict(sc=1 + 0.9 * (1 - eb), dy=26 * (1 - ease_out_cubic(u)), alpha=clamp(u * 4), flash=0.8 * max(0, 1 - u) ** 2 if u < 1 else 0)
        if u >= 1: p['flash'] = 0.0
        return p
    if name.startswith('vg'):
        k = int(name[2:]); Ts = T_VERSE0 + 0.035 * k
        u = (t - Ts) / 0.42
        if u <= 0: return None
        cxs = EL[VG[len(VG) // 2]]['cx']
        sp = (cxs - e['cx']) * 0.55 * (1 - ease_out_expo(u))
        return dict(dx=sp, sc=0.75 + 0.25 * ease_out_back(u, 1.4), alpha=clamp(u * 3), sy=1.0)
    if name.startswith('rline'):
        k = int(name[5:]); u = (t - T_LINES0) / 0.5
        if u <= 0: return None
        return dict(alpha=1.0, wipe=ease_out_cubic(u), side=(1 if k == 0 else -1))
    if name == 'person':
        u = (t - T_DAWN) / 0.9
        if u <= 0: return None
        eb = ease_out_back(u, 1.4)
        return dict(sc=0.35 + 0.65 * eb, dy=70 * (1 - ease_out_cubic(u)), alpha=clamp(u * 5), flash=0.9 * math.exp(-max(0, t - T_DAWN) * 5), person=True)
    if name in T_FLAME:
        Ts = T_FLAME[name]; u = (t - Ts) / 0.9
        if u <= 0: return None
        eb = ease_out_back(u, 1.9 if name == 'flame_red' else 1.4)
        return dict(sc=max(0.001, eb), alpha=clamp(u * 6), flash=0.9 * math.exp(-max(0, t - Ts) * 6), flame=True)
    return dict()

def wipe_mask(el, p):
    """máscara de revelado en coordenadas locales del elemento (pincelada, líneas)"""
    w, h = el['w'], el['h']
    u = p['wipe']
    if u >= 1: return None
    xs = np.arange(w, dtype=np.float32)[None, :]
    if el['name'] == 'brush':
        ys = np.arange(h, dtype=np.float32)
        rs = np.random.RandomState(3); noise = cv2.GaussianBlur(rs.rand(1, h).astype(np.float32), (0, 0), 2.0)[0]
        noise = (noise - noise.min()) / (noise.max() - noise.min())
        front = u * (w + 260) - 130 - noise[:, None] * 160 * (1 - u * 0.3)     # frente irregular (cerdas)
        return np.clip((front - xs) / 36.0, 0, 1)
    side = p.get('side', 1)
    pos = xs if side == 1 else (w - 1 - xs)       # side=1: crece de izquierda a derecha
    front = u * (w + 20)
    return np.clip((front - pos) / 6.0, 0, 1) * np.ones((h, 1), np.float32)

def flame_field(t, el):
    """campo de desplazamiento (llama 'viva'); se apaga hacia el reposo final"""
    A = 7.0 * (1 - smoothstep(8.8, 11.2, t)) * smoothstep(3.5, 4.4, t)
    if A < 0.02: return None
    h, w = el['h'], el['w']
    ys = (np.arange(h, dtype=np.float32) + el['y0'])[:, None]; xs = (np.arange(w, dtype=np.float32) + el['x0'])[None, :]
    hf = np.clip((FLAME_BASE[1] - ys) / (470 * S), 0, 1.2) ** 1.4
    dx = A * hf * (0.62 * np.sin(ys / 41.0 + 3.3 * t) + 0.38 * np.sin(ys / 97.0 - 2.1 * t + xs / 130.0)) * np.ones_like(xs)
    dy = A * 0.35 * hf * np.sin(xs / 63.0 + 4.1 * t + ys / 150.0)
    return dx.astype(np.float32), dy.astype(np.float32)

def srcs_for(name, t, p):
    el = EL[name]
    src = el['pm']
    if p.get('flame'):
        fld = flame_field(t, el)
        if fld is not None:
            h, w = el['h'], el['w']
            gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
            src = cv2.remap(src, gx + fld[0], gy + fld[1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    if 'wipe' in p and p['wipe'] < 1:
        m = wipe_mask(el, p)
        src = src * m[..., None]
    return src

def sample_params(name, t, p0):
    """muestras para desenfoque de movimiento (obturador ~ 0.9 fotograma)"""
    if p0 is None: return None
    dt = 1.0 / FPS
    pa = anim(name, t - 0.9 * dt)
    if pa is None: return [p0]
    e = EL[name]
    mv = abs(pa.get('dy', 0) - p0.get('dy', 0)) + abs(pa.get('dx', 0) - p0.get('dx', 0)) + 300 * abs(pa.get('rx', 0) - p0.get('rx', 0)) + 300 * abs(pa.get('rz', 0) - p0.get('rz', 0)) + 200 * abs(pa.get('sc', 1) - p0.get('sc', 1))
    n = int(clamp(math.ceil(mv * RS / 5.0), 1, 12))
    if n == 1: return [p0]
    out = []
    for i in range(n):
        s = i / (n - 1)
        q = anim(name, t - 0.9 * dt * (1 - s))
        if q is None: q = p0
        qq = dict(p0)
        for key in ('dx', 'dy', 'dz', 'rx', 'ry', 'rz', 'sc', 'sx', 'sy'):
            if key in q: qq[key] = q[key]
            elif key in qq: pass
        out.append(qq)
    return out

# ---------------------------------------------------------------- escena -------------
def dawn_field(t):
    if t < T_DAWN: return None, 0.0
    u = (t - T_DAWN) / 1.4
    Rf = 2400 * ease_out_cubic(u) + 60 * u
    D = np.clip((Rf - R_DAWN) / 300.0 + 0.5, 0, 1)
    D = D * D * (3 - 2 * D)
    return D.astype(np.float32), Rf

def particles_layer(t, D, canvas):
    """brasas / chispas / polvo / estelas. Mezcla 'screen' -> invisible sobre blanco."""
    gl = np.zeros((CH, CW, 3), np.uint8)
    cx, cy = FC[0], FC[1] + 40
    def draw(x, y, r, col, a):
        if a <= 0.01: return
        xx, yy = int(round(x * RS * 16)), int(round(y * RS * 16))
        c = tuple(int(clamp(v * a, 0, 1) * 255) for v in col)
        cv2.circle(gl, (xx, yy), max(1, int(round(r * RS * 16))), c, -1, cv2.LINE_AA, 4)
    if t < 0.9: base_fade = smoothstep(0.3, 0.9, t)
    else: base_fade = 1.0
    for P in PARTS:
        if P['kind'] == 'conv':
            if t < P['ts'] or t > P['te'] + 0.0: continue
            u = (t - P['ts']) / (P['te'] - P['ts'])
            e_ = u * u * (3 - 2 * u) * 0.35 + u ** 3 * 0.65
            ang = P['ang'] + P['sw'] * e_ * 1.6
            rad = P['rad'] * (1 - e_) * (1 - 0.0)
            x = cx + math.cos(ang) * rad * 1.15; y = cy + math.sin(ang) * rad * 0.8
            a = smoothstep(0, 0.15, u) * (1 - smoothstep(0.93, 1.0, u)) ; sz = P['sz'] * (0.8 + 1.2 * u)
            draw(x, y, sz, ember_col(P['hue'], 1.0), a * 0.95)
        elif P['kind'] == 'rise':
            tau = t - P['ts']
            if tau < 0 or tau > P['life']: continue
            u = tau / P['life']
            x = cx + P['x'] + P['vx'] * tau + 22 * math.sin(tau * 3 + P['ph']) * u
            y = FB[1] - 40 + P['vy'] * tau * (1 - 0.15 * u) + 60
            a = (1 - u) ** 1.3 * smoothstep(0, 0.05, u) * (1 - smoothstep(6.0, 6.8, t))
            draw(x, y, P['sz'] * (1 - 0.5 * u), ember_col(0.35 + 0.65 * (1 - u) * P['hue'], 1.0), a)
        else:
            x = (P['x'] + P['vx'] * t) % 1920; y = (P['y'] + P['vy'] * t) % 1080
            a = (0.35 + 0.25 * math.sin(t * 0.8 + P['ph'])) * base_fade * (1 - smoothstep(4.8, 5.6, t)) * (0.4 + 0.6 * P['z'])
            draw(x, y, P['sz'] * (0.6 + 0.8 * P['z']), (0.65, 0.8, 1.0), a * 0.6)
    # estelas ascendentes (motivo "UP"): líneas finas con punta en chevrón
    for s in STREAKS:
        tau = t - s['t0']
        if tau < 0: continue
        y = 1180 - s['v'] * tau
        if y < -s['ln'] or y > 1180: continue
        a = s['a'] * smoothstep(2.0, 2.8, t) * (1 - smoothstep(4.6, 5.2, t)) * smoothstep(0, 0.2, tau)
        if a <= 0.01: continue
        x = s['x']; col = tuple(int(255 * v * a) for v in (1.0, 0.45, 0.15))
        p1 = (int(x * RS * 16), int(y * RS * 16)); p2 = (int(x * RS * 16), int((y + s['ln']) * RS * 16))
        cv2.line(gl, p1, p2, col, max(1, int(s['w'] * RS * 16 / 8)), cv2.LINE_AA, 4)
        for sx in (-1, 1):
            cv2.line(gl, p1, (int((x + sx * 7) * RS * 16), int((y + 11) * RS * 16)), col, max(1, int(s['w'] * RS * 16 / 8)), cv2.LINE_AA, 4)
    # anillos de energía que convergen hacia la llama
    for k in range(3):
        u = (t - (1.6 + 0.28 * k)) / 1.9
        if u <= 0 or u >= 1: continue
        r = 640 * (1 - ease_in_cubic(u) ** 0.8) + 10
        a = 0.38 * math.sin(u * math.pi) ** 1.5
        cv2.ellipse(gl, (int(cx * RS * 16), int(cy * RS * 16)), (int(r * RS * 16), int(r * 0.72 * RS * 16)), 0, 0, 360, tuple(int(255 * v * a) for v in (1.0, 0.45, 0.15)), max(1, int(2 * RS * 16 / 8)), cv2.LINE_AA, 4)
    g = gl.astype(np.float32) / 255.0
    return g

def impact_dust(t, overlay_rgb, overlay_a):
    """chispas/polvo y anillos de choque (mezcla normal -> visibles sobre fondo blanco)"""
    ev = []
    for i, T in enumerate(T_RAISE):
        n = RAISE_NAMES[i]; e = EL[n]; ev.append((T, OX + e['cx'], OY + e['y0'] + e['h'] - 6, (0.04, 0.12, 0.34), 22, 1.0))
    for n, T, col in (('U', T_U, (0.89, 0.0, 0.09)), ('P', T_P, (0.89, 0.0, 0.09)), ('dot', T_DOT, (0.89, 0.0, 0.09))):
        e = EL[n]; ev.append((T, OX + e['cx'], OY + e['y0'] + e['h'] - 6, col, 26, 1.3))
    e = EL['arrow']; ev.append((T_ARROW, OX + e['cx'], OY + e['y0'] + 6, (0.89, 0.0, 0.09), 26, 1.2))
    for T, x, y, col, n, spd in ev:
        tau = t - T
        if tau < 0 or tau > 0.9: continue
        u = tau / 0.9
        rs = np.random.RandomState(int(T * 100) % 9973)
        for i in range(n):
            ang = (-math.pi + rs.rand() * math.pi) if col != (0.89, 0.0, 0.09) or True else 0
            sp = (160 + rs.rand() * 520) * spd
            dx_, dy_ = math.cos(ang) * sp, math.sin(ang) * sp * 0.55 - 40
            x_ = x + dx_ * tau * (1 - 0.5 * u); y_ = y + dy_ * tau + 480 * tau * tau * 0.5
            a = (1 - u) ** 1.2
            r = (1.0 + rs.rand() * 2.8) * (1 - 0.5 * u)
            c = tuple(int(255 * v) for v in col[::-1])
            cv2.circle(overlay_rgb, (int(x_ * RS * 16), int(y_ * RS * 16)), max(1, int(r * RS * 16)), c, -1, cv2.LINE_AA, 4)
            cv2.circle(overlay_a, (int(x_ * RS * 16), int(y_ * RS * 16)), max(1, int(r * RS * 16)), int(255 * a * 0.85), -1, cv2.LINE_AA, 4)
        # anillo de choque
        rr = 30 + 300 * ease_out_cubic(u / 1.0)
        a = 0.45 * (1 - u) ** 1.5
        c = tuple(int(255 * v) for v in col[::-1])
        cv2.ellipse(overlay_rgb, (int(x * RS * 16), int(y * RS * 16)), (int(rr * RS * 16), int(rr * 0.22 * RS * 16)), 0, 0, 360, c, max(1, int(3 * RS * 16 / 8)), cv2.LINE_AA, 4)
        cv2.ellipse(overlay_a, (int(x * RS * 16), int(y * RS * 16)), (int(rr * RS * 16), int(rr * 0.22 * RS * 16)), 0, 0, 360, int(255 * a), max(1, int(3 * RS * 16 / 8)), cv2.LINE_AA, 4)

def camera_params(t):
    z = 0.90 + 0.10 * ease_out_sine(t / 11.4) if t < 11.4 else 1.0
    sx = sy = 0.0; rot = 0.0; ca = 0.0
    for (T, amp, cam) in IMPACTS:
        tau = t - T
        if tau < 0 or tau > 0.8: continue
        d = math.exp(-tau / 0.11)
        sx += amp * d * math.sin(tau * 71 + T * 13) * 0.8
        sy += amp * d * math.cos(tau * 83 + T * 7)
        rot += 0.0016 * amp * d * math.sin(tau * 53 + T)
        z += 0.012 * (amp / 10.0) * d if True else 0
        ca += cam * math.exp(-tau / 0.14)
    if T_FINAL <= t <= T_FINAL + 0.7:
        tau = t - T_FINAL
        z += 0.030 * math.sin(math.pi * clamp(tau / 0.55)) ** 1.5 if tau < 0.55 else 0
    return z, sx, sy, rot, ca

def apply_camera(img, z, sx, sy, rot):
    if abs(z - 1) < 1e-5 and abs(sx) < 1e-3 and abs(sy) < 1e-3 and abs(rot) < 1e-6: return img
    M = cv2.getRotationMatrix2D((CW / 2, CH / 2), math.degrees(rot), z)
    M[0, 2] += sx * RS; M[1, 2] += sy * RS
    return cv2.warpAffine(img, M, (CW, CH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

def chroma(img, amt):
    if amt < 0.02: return img
    k = 0.0045 * amt
    out = img.copy()
    for ch, s in ((2, 1 + k), (0, 1 - k)):   # canales BGR/RGB: img está en RGB -> 0=R,2=B
        M = cv2.getRotationMatrix2D((CW / 2, CH / 2), 0, s)
        out[..., ch] = cv2.warpAffine(img[..., ch], M, (CW, CH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return out

def render(t):
    if t >= T_STILL: return FINAL
    D, Rf = dawn_field(t)
    Dm = D if D is not None else 0.0
    fade_in = smoothstep(0.0, 0.9, t)
    # ---- fondo oscuro con atmósfera
    dark = DARK * (0.45 + 0.55 * fade_in)
    hz = cv2.warpAffine(HAZE, np.float32([[1, 0, t * 9], [0, 1, t * 3.5]]), (512, 288), borderMode=cv2.BORDER_REFLECT)
    hz2 = cv2.warpAffine(HAZE[::-1, :], np.float32([[1, 0, -t * 6], [0, 1, t * 2]]), (512, 288), borderMode=cv2.BORDER_REFLECT)
    hz = cv2.resize((hz * 0.6 + hz2 * 0.4 - 0.5), (CW, CH), interpolation=cv2.INTER_LINEAR)
    ign = smoothstep(3.4, 4.6, t)
    atm = np.zeros((CH, CW, 3), np.float32)
    atm += hz[..., None] * np.float32([0.10, 0.16, 0.34]) * 0.55 * fade_in
    # rayos de luz desde la base de la llama
    ang = (THETA / (2 * math.pi) * 720 + 40 * math.sin(t * 0.3) + t * 6) % 720
    rays = np.interp(ang.ravel(), np.arange(720), RAYS, period=720).reshape(ang.shape)
    rays = cv2.resize(rays * np.exp(-RAD4 / (1150.0)), (CW, CH), interpolation=cv2.INTER_LINEAR)
    ray_i = (0.03 + 0.17 * ign) * (1 - smoothstep(5.0, 5.8, t))
    atm += rays[..., None] * np.float32([1.0, 0.45, 0.16]) * ray_i
    # resplandor del núcleo
    gx = np.exp(-(((XX - FC[0]) / 520.0) ** 2 + ((YY - FC[1] - 40) / 560.0) ** 2))
    pulse = 0.0
    for tp in T_PULSES:
        pulse += math.exp(-abs(t - tp) / 0.09) * (0.3 + 0.25 * (tp - 2.0))
    spark = smoothstep(T_SPARK, T_SPARK + 1.6, t) * (1 - ign * 0.0)
    core = (0.10 * spark + 0.13 * pulse * spark + 0.55 * ign * (0.9 + 0.1 * math.sin(t * 9))) * (1 - 0.0)
    atm += gx[..., None] * np.float32([1.0, 0.42, 0.12]) * core
    # chispa inicial
    if t > T_SPARK:
        u = clamp((t - T_SPARK) / 1.2); sg = 6 + 40 * u
        gs = np.exp(-(((XX - FC[0]) ** 2 + (YY - FC[1] - 40) ** 2) / (2 * sg ** 2)))
        atm += gs[..., None] * np.float32([1.0, 0.7, 0.35]) * (0.9 * ease_out_cubic(u) * (1 - 0.8 * ign))
    # ---- ensamblado del fondo (amanecer)
    if D is None:
        canvas = dark + atm
    else:
        canvas = (dark + atm * (1 - D)[..., None]) * (1 - D)[..., None] + D[..., None]
        # borde cálido del amanecer
        rim = np.exp(-(((Rf - R_DAWN) / 110.0) ** 2)) * (1 - smoothstep(0.6, 1.5, t - T_DAWN)) * 0.55
        canvas += rim[..., None] * np.float32([1.0, 0.72, 0.38]) * (1 - D)[..., None] * 2
        # destello
        fl = math.exp(-(t - T_DAWN) * 9) * 0.65
        canvas += fl * np.float32([1.0, 0.94, 0.85]) * np.exp(-R_DAWN / 700.0)[..., None]
    # viñeta fría sobre el fondo blanco (se retira antes del reposo)
    vig = smoothstep(5.3, 6.4, t) * (1 - smoothstep(10.3, 11.5, t))
    if vig > 0.001:
        canvas *= (1 - 0.03 * vig * VIGW)[..., None] * np.float32([1.0, 1.0, 1.0]) + np.float32([0.0, 0.0, 0.0])
        canvas += 0.0
    canvas = np.clip(canvas, 0, 1)
    # ---- partículas / brasas (screen)
    if t < 6.9:
        g = particles_layer(t, D, canvas)
        gb = cv2.GaussianBlur(g, (0, 0), 5 * RS)
        gg = g + gb * 1.4
        mask = (1 - Dm if D is not None else 1.0)
        mk = mask[..., None] if D is not None else 1.0
        gg = gg * mk
        canvas = 1 - (1 - canvas) * (1 - np.clip(gg, 0, 1))
    # ---- llama (grupo) con resplandor
    fl_names = ['flame_red', 'flame_orange', 'flame_yellow']
    fbuf = np.zeros((CH, CW, 4), np.float32)
    any_flame = False
    for n in fl_names:
        p = anim(n, t)
        if p is None: continue
        any_flame = True
        draw_element4(fbuf, EL[n], sample_params(n, t, p), srcs_for(n, t, p))
    if any_flame:
        small = cv2.resize(fbuf[..., :3], (CW // 4, CH // 4), interpolation=cv2.INTER_AREA)
        halo = cv2.GaussianBlur(small, (0, 0), 22 * RS / 4 * 4 / 4 * 1.0)
        halo = cv2.resize(halo, (CW, CH), interpolation=cv2.INTER_LINEAR)
        glow_k = 1.5 * (1 - smoothstep(5.0, 6.0, t))
        hm = (1 - Dm)[..., None] if D is not None else 1.0
        canvas = 1 - (1 - canvas) * (1 - np.clip(halo * glow_k * hm, 0, 1))
        canvas = canvas * (1 - fbuf[..., 3:4]) + fbuf[..., :3]
    # ---- elementos del logo
    order = ['person'] + RAISE_NAMES + ['U', 'P', 'arrow', 'dot', 'brush'] + TG + VG + ['rline0', 'rline1']
    pers = anim('person', t)
    if pers is not None and t < T_DAWN + 1.4:
        # halo de luz detrás de la persona (nace de la luz)
        u = clamp((t - T_DAWN) / 1.2)
        g = np.exp(-(((XX - FC[0]) / 220.0) ** 2 + ((YY - FC[1] - 40) / 260.0) ** 2)) * (1 - u) ** 1.5 * 0.9
        canvas = canvas + g[..., None] * np.float32([1.0, 0.96, 0.88]) * (1 - 0.0)
        canvas = np.clip(canvas, 0, 1)
    for n in order:
        p = anim(n, t)
        if p is None: continue
        ps = sample_params(n, t, p)
        draw_element(canvas, EL[n], ps, srcs_for(n, t, p))
        # estela luminosa de la flecha
    if t > T_ARROW - 0.58 and t < T_ARROW + 0.05:
        pa = anim('arrow', t)
        if pa is not None and pa['dy'] > 8:
            e = EL['arrow']; x = OX + e['cx']; ytip = OY + e['y0'] + pa['dy']
            streak = np.zeros((CH, CW), np.uint8)
            for dx_ in (-10, 0, 10):
                ln = min(520, pa['dy'] * 0.9)
                cv2.line(streak, (int((x + dx_) * RS * 16), int((ytip + e['h']) * RS * 16)), (int((x + dx_) * RS * 16), int((ytip + e['h'] + ln) * RS * 16)), int(150 * (1 - abs(dx_) / 18)), max(1, int(3 * RS * 2)), cv2.LINE_AA, 4)
            sa = cv2.GaussianBlur(streak.astype(np.float32) / 255.0, (0, 0), 2 * RS)
            canvas = canvas * (1 - sa[..., None] * 0.7) + sa[..., None] * 0.7 * np.float32([0.89, 0.0, 0.09])
    # ---- polvo de impacto
    if t > 5.9 and t < T_DOT + 1.0:
        orgb = np.zeros((CH, CW, 3), np.uint8); oa = np.zeros((CH, CW), np.uint8)
        impact_dust(t, orgb, oa)
        a = oa.astype(np.float32)[..., None] / 255.0
        canvas = canvas * (1 - a) + (orgb[..., ::-1].astype(np.float32) / 255.0) * a
    # ---- reflejo final (fusión exacta con el original) + destello
    if t >= T_XFADE0:
        w = smoothstep(T_XFADE0, T_XFADE1, t)
        canvas = canvas * (1 - w) + FINAL * w
    if T_FINAL <= t <= T_FINAL + 0.6:
        u = (t - T_FINAL) / 0.6
        uu = (XX * 0.8 + YY * 0.6)
        u0 = -300 + 2900 * ease_in_out_cubic(u) * 0.62 + 100
        band = np.exp(-(((uu - u0) / 110.0) ** 2))
        k = 0.32 * math.sin(math.pi * u) ** 0.8
        canvas = canvas + band[..., None] * (1 - canvas) * k
    canvas = np.clip(canvas, 0, 1)
    # ---- cámara y óptica
    z, sx, sy, rot, ca = camera_params(t)
    canvas = apply_camera(canvas, z, sx, sy, rot)
    canvas = chroma(canvas, ca)
    # grano de película (solo fase oscura)
    gk = 0.022 * (1 - smoothstep(4.6, 5.8, t)) * fade_in
    if gk > 0.0005:
        gr = np.roll(GRAIN, int(t * FPS) * 37 % CW, axis=1)
        canvas = canvas + (gr * gk)[..., None]
    return np.clip(canvas, 0, 1)

def draw_element4(buf, el, ps, src):
    """igual que draw_element pero acumula en un búfer RGBA premultiplicado (para el grupo de la llama)"""
    Hs = [make_H(el, p) for p in ps]
    rois = [corners_roi(el, Hm) for Hm in Hs]; rois = [r for r in rois if r is not None]
    if not rois: return
    roi = (min(r[0] for r in rois), min(r[1] for r in rois), max(r[2] for r in rois), max(r[3] for r in rois))
    acc = None
    for Hm in Hs:
        w_ = warp_roi(src, Hm, roi); acc = w_ if acc is None else acc + w_
    acc /= len(Hs)
    p0 = ps[-1]
    acc *= p0.get('alpha', 1.0)
    fl = p0.get('flash', 0.0)
    if fl > 0.001: acc[..., :3] += fl * acc[..., 3:4] * np.float32([1.0, 0.8, 0.5])
    x0, y0, x1, y1 = roi
    sub = buf[y0:y1, x0:x1]
    sub[:] = np.concatenate([sub[..., :3] * (1 - acc[..., 3:4]) + acc[..., :3], sub[..., 3:4] * (1 - acc[..., 3:4]) + acc[..., 3:4]], axis=2)

def to_u8(img):
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)

def frame_t(i): return i / FPS

def work(i):
    t = frame_t(i)
    path = os.path.join(OUT, 'f%04d.png' % i)
    if i >= int(HOLD_START * FPS) + 1 and os.path.exists(os.path.join(OUT, 'f%04d.png' % int(HOLD_START * FPS))):
        return i
    img = render(t)
    cv2.imwrite(path, to_u8(img)[:, :, ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return i

if __name__ == '__main__':
    import multiprocessing as mp, time
    os.makedirs(OUT, exist_ok=True)
    a = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    b = int(sys.argv[2]) if len(sys.argv) > 2 else NFRAMES
    step = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    idx = list(range(a, b, step))
    t0 = time.time()
    with mp.Pool(int(os.environ.get('NP', '4'))) as pool:
        for k, _ in enumerate(pool.imap_unordered(work, idx, chunksize=2)):
            if k % 30 == 0: print('%d/%d  %.1fs' % (k, len(idx), time.time() - t0), flush=True)
    print('listo %.1fs' % (time.time() - t0))
