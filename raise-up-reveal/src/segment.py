"""Segmenta el logo original en sus elementos (capas RGBA) sin alterar su geometría.
Salida: work/layers.pkl  (escala S sobre la imagen original) + diagnósticos."""
import numpy as np, cv2, pickle
from scipy import ndimage as ndi

S = 1.4
src = cv2.imread('src/logo_original.jpg')[:, :, ::-1]
H0, W0 = src.shape[:2]
H, W = round(H0 * S), round(W0 * S)
up = np.clip(cv2.resize(src, (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32), 0, 255)
# limpieza de ruido JPEG en el fondo blanco (diferencia máxima < 10 niveles -> blanco puro)
near_white = (255 - up).max(axis=2) < 10
up[near_white] = 255
WHITE = np.array([255, 255, 255], np.float32)

hsv = cv2.cvtColor(up.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
h, s, v = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
white = (s < 0.18) & (v > 0.85)
navy = (v < 0.45) & (~white) & (h > 190) & (h < 260)
teal = (h > 165) & (h < 205) & (s > 0.5) & (~navy)
red = ((h < 12) | (h > 345)) & (s > 0.6) & (v > 0.55)
orange = (h >= 12) & (h < 38) & (s > 0.5)
yellow = (h >= 38) & (h < 70) & (s > 0.4)

def cov(px, C):
    d = WHITE - C
    return np.clip(((WHITE - px) @ d) / (d @ d), 0, 1)

def sharpen(a, k=1.25):
    return np.clip((a - 0.5) * k + 0.5, 0, 1)

def core_color(mask, erode=2):
    m = ndi.binary_erosion(mask, iterations=erode)
    if m.sum() < 10: m = mask
    return np.median(up[m], axis=0)

fg = ((255 - up).max(axis=2) > 60)
n, lab = cv2.connectedComponents(fg.astype(np.uint8), connectivity=8)
comps = []
for i in range(1, n):
    ys, xs = np.nonzero(lab == i)
    if len(xs) < 6: continue
    comps.append(dict(id=i, x0=xs.min(), x1=xs.max(), y0=ys.min(), y1=ys.max(), area=len(xs)))

elements = []   # dicts: name, group, rgb(h,w,3 float32), a(h,w), x0, y0

def add(name, group, rgb_full, a_full, order=0):
    ys, xs = np.nonzero(a_full > 0.002)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    elements.append(dict(name=name, group=group, order=order, x0=int(x0), y0=int(y0),
                         rgb=rgb_full[y0:y1, x0:x1].astype(np.float32).copy(),
                         a=a_full[y0:y1, x0:x1].astype(np.float32).copy()))

def flat_element(name, group, region, C, order=0):
    reg = ndi.binary_dilation(region, iterations=2)
    a = np.where(reg, sharpen(cov(up, C)), 0).astype(np.float32)
    rgb = np.broadcast_to(C, (H, W, 3))
    add(name, group, rgb, a, order)

o = lambda v_: v_ * S  # coords originales -> escala S

# ---- RAISE / UP / flecha / punto ------------------------------------------------
def pick(x0, y0, w, h_):
    cx, cy = (x0 + w / 2) * S, (y0 + h_ / 2) * S
    for c in comps:
        if c['x0'] <= cx <= c['x1'] and c['y0'] <= cy <= c['y1'] and (lab[int(cy), int(cx)] == c['id'] or True):
            if abs((c['x0'] + c['x1']) / 2 - cx) < 12 * S and abs((c['y0'] + c['y1']) / 2 - cy) < 12 * S:
                return c
    raise RuntimeError('comp not found %s' % ((x0, y0, w, h_),))

used = set()
def comp_mask(c): used.add(c['id']); return lab == c['id']
for name, box, grp in [('R', (340, 173, 98, 174), 'raise'), ('A', (438, 173, 116, 174), 'raise'),
                       ('I', (559, 173, 44, 174), 'raise'), ('S', (608, 173, 100, 178), 'raise'),
                       ('E', (716, 173, 85, 175), 'raise'),
                       ('U', (378, 357, 194, 238), 'up'), ('P', (550, 357, 200, 232), 'up'),
                       ('arrow', (749, 303, 121, 228), 'up'), ('dot', (737, 544, 64, 48), 'up')]:
    m = comp_mask(pick(*box))
    flat_element(name, grp, m, core_color(m))

# ---- Pincelada + texto --------------------------------------------------------
brush_c = pick(82, 601, 789, 93)
bm = comp_mask(brush_c)
for c in comps:   # contra-formas (O, P) dentro de la pincelada
    if c['y0'] > 630 * S and c['y1'] < 665 * S and c['x0'] > 630 * S and c['x1'] < 700 * S and c['area'] < 600 * S * S:
        used.add(c['id']); bm |= (lab == c['id'])
solid = ndi.binary_fill_holes(bm)
letters_mask = solid & ~bm
TEAL = core_color(bm & teal)
dist_out = ndi.distance_transform_edt(solid)
a_b = cov(up, TEAL)
a_b = np.where(dist_out >= 2.5, 1.0, a_b)
a_b = np.where(ndi.binary_dilation(solid, iterations=2), a_b, 0)
a_b = sharpen(a_b, 1.15)
add('brush', 'tagline', np.broadcast_to(TEAL, (H, W, 3)), a_b)
# letras blancas "ES TU TIEMPO"
dT = WHITE - TEAL
a_t = np.clip(((up - TEAL) @ dT) / (dT @ dT), 0, 1)
lm = ndi.binary_dilation(letters_mask, iterations=2) & (dist_out >= 1.5)
llab, ln = ndi.label(letters_mask)
objs = ndi.find_objects(llab)
glyphs = sorted([(sl[1].start, i + 1) for i, sl in enumerate(objs) if (llab == i + 1).sum() > 30])
print('glifos tagline:', len(glyphs))
for k, (_, gid) in enumerate(glyphs):
    gm = ndi.binary_dilation(llab == gid, iterations=2) & lm
    a = np.where(gm, sharpen(a_t), 0)
    add('tg%02d' % k, 'tagline_text', np.broadcast_to(WHITE, (H, W, 3)), a, order=k)

# ---- Versículo y líneas rojas -------------------------------------------------
verse = []
for c in comps:
    if c['id'] in used: continue
    cy = (c['y0'] + c['y1']) / 2 / S
    if 700 < cy < 735:
        verse.append(c)
vgl = sorted([c for c in verse if (c['x1'] - c['x0']) < 60 * S], key=lambda c: c['x0'])
vl = sorted([c for c in verse if (c['x1'] - c['x0']) >= 60 * S], key=lambda c: c['x0'])
print('versiculo glifos', len(vgl), 'lineas', len(vl))
# agrupa partes (acento de Í) por proximidad en x
groups = []
for c in vgl:
    if groups and c['x0'] <= groups[-1]['x1'] + 2: 
        g = groups[-1]; g['ids'].append(c['id']); g['x1'] = max(g['x1'], c['x1'])
    else:
        groups.append(dict(ids=[c['id']], x0=c['x0'], x1=c['x1']))
NAVY = core_color(np.isin(lab, [c['id'] for c in vgl]) & navy, 1) if True else None
for k, g in enumerate(groups):
    m = np.isin(lab, g['ids']); used.update(g['ids'])
    flat_element('vg%02d' % k, 'verse', m, NAVY, order=k)
for k, c in enumerate(vl):
    m = comp_mask(c)
    RL = elements[[e['name'] for e in elements].index('U')]['rgb'][0, 0]
    flat_element('rline%d' % k, 'verse_lines', m, RL, order=k)

# ---- Llama ---------------------------------------------------------------------
fl_ids = [pick(65, 123, 311, 471)['id'], pick(81, 529, 92, 73)['id']]
for i in fl_ids: used.add(i)
fl_fg = np.isin(lab, fl_ids)
sil = ndi.binary_fill_holes(fl_fg)
# persona: blanco conectado al torso, cortado a la altura de la base de la llama
cut = int(578 * S)
wmask = white.copy(); wmask[cut:, :] = False
wl, wn = ndi.label(wmask)
seed = (int(500 * S), int(245 * S))
assert wl[seed] != 0, 'seed no blanca'
person = wl == wl[seed]
print('area persona', person.sum() / S / S)
person = ndi.binary_opening(person, iterations=1)
person = ndi.binary_closing(person, iterations=2)
# regiones del interior de la llama
flame_all = sil | person
core = {'red': red & flame_all, 'orange': orange & flame_all, 'yellow': yellow & flame_all, 'person': person}
cm = np.zeros((H, W), np.int8) - 1
cl = {'red': 0, 'orange': 1, 'yellow': 2, 'person': 3}
cmask = np.zeros((H, W), np.int8) - 1
for k, v_ in cl.items():
    cmask[ndi.binary_erosion(core[k], iterations=1)] = v_
idx = ndi.distance_transform_edt(cmask < 0, return_distances=False, return_indices=True)
part = cmask[idx[0], idx[1]]
part = np.where(flame_all, part, -1)
M_red = flame_all
M_orange = (part == 1) | (part == 2)
M_yellow = (part == 2)
M_person = (part == 3)
# conservar persona en capas inferiores solo donde toca el naranja/amarillo (evita halos sobre rojo)
M_orange |= M_person & ndi.binary_dilation(part == 1, iterations=3) | (M_person & ndi.binary_dilation(part == 2, iterations=3))
M_yellow |= M_person & ndi.binary_dilation(part == 2, iterations=3)

def extend_color(mask_core):
    ix = ndi.distance_transform_edt(~mask_core, return_distances=False, return_indices=True)
    c = up[ix[0], ix[1]]
    c = cv2.GaussianBlur(c, (0, 0), 1.2)
    c[mask_core] = up[mask_core]
    return c

def soft(mask, sg=0.8):
    return np.clip(cv2.GaussianBlur(mask.astype(np.float32), (0, 0), sg), 0, 1)

RED_ref = core_color(red & flame_all)
col_red = extend_color(ndi.binary_erosion(core['red'], iterations=1))
# alfa de la capa roja: interior = 1, borde exterior por cobertura sobre blanco
dist_f = ndi.distance_transform_edt(sil)
a_red = np.where(dist_f >= 2.5, 1.0, cov(up, RED_ref))
a_red = np.where(ndi.binary_dilation(sil, iterations=2), a_red, 0)
a_red = sharpen(a_red, 1.15)
add('flame_red', 'flame', col_red, a_red, order=0)
col_or = extend_color(ndi.binary_erosion(core['orange'], iterations=1))
add('flame_orange', 'flame', col_or, soft(M_orange), order=1)
col_ye = extend_color(ndi.binary_erosion(core['yellow'], iterations=1))
add('flame_yellow', 'flame', col_ye, soft(M_yellow), order=2)
a_p = soft(M_person, 0.7)
add('person', 'person', np.broadcast_to(WHITE, (H, W, 3)), a_p, order=3)

# restos sin asignar
left = [c for c in comps if c['id'] not in used and c['area'] > 30]
print('comps sin asignar:', [(c['x0'] / S, c['y0'] / S, c['area']) for c in left])

pickle.dump(dict(S=S, W=W, H=H, up=up.astype(np.uint8), elements=elements), open('work/layers.pkl', 'wb'))

# ---- verificación: recomposición sobre blanco vs original escalado -------------
def comp_on(bg):
    out = bg.copy()
    for e in sorted(elements, key=lambda e: (['flame', 'person', 'raise', 'up', 'tagline', 'tagline_text', 'verse', 'verse_lines'].index(e['group']) if e['group'] not in ('flame',) else -1, e['order'])):
        pass
    order = ['flame_red', 'flame_orange', 'flame_yellow', 'person']
    seq = [e for e in elements if e['name'] in order]
    seq.sort(key=lambda e: order.index(e['name']))
    seq += [e for e in elements if e['name'] not in order and e['group'] != 'tagline_text'] 
    seq += [e for e in elements if e['group'] == 'tagline_text']
    for e in seq:
        h_, w_ = e['a'].shape
        a = e['a'][..., None]
        out[e['y0']:e['y0'] + h_, e['x0']:e['x0'] + w_] = a * e['rgb'] + (1 - a) * out[e['y0']:e['y0'] + h_, e['x0']:e['x0'] + w_]
    return out
rec = comp_on(np.full((H, W, 3), 255, np.float32))
d = np.abs(rec - up)
mse = ((rec - up) ** 2).mean()
print('PSNR recomposición vs original escalado: %.2f dB, error max %.0f, px con err>40: %d' % (10 * np.log10(255 ** 2 / mse), d.max(), (d.max(axis=2) > 40).sum()))
cv2.imwrite('work/recon_white.png', rec[:, :, ::-1].astype(np.uint8))
cv2.imwrite('work/recon_diff.png', np.clip(d * 4, 0, 255).astype(np.uint8)[:, :, ::-1])
dark = comp_on(np.full((H, W, 3), (14, 20, 40), np.float32))
cv2.imwrite('work/recon_dark.png', dark[:, :, ::-1].astype(np.uint8))
print('elementos:', len(elements))
