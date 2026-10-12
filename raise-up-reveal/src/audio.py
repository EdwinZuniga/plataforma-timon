"""Banda sonora sintetizada desde cero (numpy/scipy, sin muestras). 48 kHz estéreo, 15 s.
Sincronizada con timeline.py. Tonalidad: Re mayor, 120 BPM."""
import numpy as np, sys, wave
from scipy import signal
sys.path.insert(0, 'src')
from timeline import *
SR = 48000; N = int(DUR * SR)
rs = np.random.RandomState(2026)
L = np.zeros(N); R = np.zeros(N)
tt = lambda d: np.arange(int(d * SR)) / SR

def put(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    n = min(len(sig), N - i)
    g = gain * np.sqrt(0.5)
    L[i:i + n] += sig[:n] * g * (1 - pan) ** 0.5 * 1.0
    R[i:i + n] += sig[:n] * g * (1 + pan) ** 0.5 * 1.0

def noise(d): return rs.randn(int(d * SR))
def bp_sweep(x, f0, f1, q=2.0, shape=1.0):
    """filtro paso-banda con frecuencia central variable (bloques)"""
    out = np.zeros_like(x); B = 1024; zi = None
    n = len(x)
    for i in range(0, n, B):
        u = (i / n) ** shape; fc = f0 * (f1 / f0) ** u
        sos = signal.butter(2, [max(30, fc / (1 + 1 / q)), min(SR / 2 - 100, fc * (1 + 1 / q))], 'bandpass', fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        y, zi = signal.sosfilt(sos, x[i:i + B], zi=zi); out[i:i + B] = y
    return out
def hp(x, f): return signal.sosfilt(signal.butter(2, f, 'highpass', fs=SR, output='sos'), x)
def lp(x, f): return signal.sosfilt(signal.butter(2, f, 'lowpass', fs=SR, output='sos'), x)

def boom(f0=120, f1=36, d=2.2, dec=2.2, click=0.5):
    t = tt(d); fr = f1 + (f0 - f1) * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = np.sin(ph) * np.exp(-t * dec) + 0.4 * np.sin(ph * 0.5) * np.exp(-t * dec * 0.8)
    s += click * lp(noise(d), 900) * np.exp(-t * 18)
    return s
def taiko(f=80, d=0.7):
    t = tt(d); fr = f + f * 1.2 * np.exp(-t * 40)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 7)
    s += 0.5 * lp(noise(d), 2500) * np.exp(-t * 35)
    return s
def snare(d=0.25):
    t = tt(d); return (hp(noise(d), 1800) * np.exp(-t * 22) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28))
def hat(d=0.06): t = tt(d); return hp(noise(d), 7000) * np.exp(-t * 80)
def whoosh(d, f0, f1, q=1.5, shape=1.0, peak=0.6):
    t = tt(d); x = bp_sweep(noise(d), f0, f1, q, shape)
    env = np.sin(np.pi * np.clip(t / d, 0, 1) ** peak) ** 2 if peak != 0 else 1
    return x * env
def bell(f, d=2.5, dec=2.0):
    t = tt(d); s = 0
    for k, (m, a) in enumerate([(1, 1), (2.76, .5), (5.4, .25), (8.93, .12), (2.0, .3)]):
        s = s + a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dec * (1 + .5 * k))
    return s * 0.5
def blip(f, d=0.18):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 22)
def saw_pad(freqs, d, att=1.0, rel=0.5, cutoff=2500, det=0.004, nh=14, sweep=None):
    t = tt(d); s = np.zeros_like(t)
    for f in freqs:
        for dd in (-det, 0, det):
            ff = f * (1 + dd)
            ph = rs.rand() * 6.28
            for h in range(1, nh + 1):
                if ff * h > 9000: break
                s += np.sin(2 * np.pi * ff * h * t + ph * h) / h
    env = np.clip(t / att, 0, 1) ** 2 * np.clip((d - t) / rel, 0, 1)
    s = s * env / (len(freqs) * 3)
    if sweep:
        s = bp_sweep(s, sweep[0], sweep[1], 0.7) * 2.2 + lp(s, cutoff) * 0.3
    else: s = lp(s, cutoff)
    return s
def reverse_env(d, p=3): t = tt(d); return (t / d) ** p

D1, A1 = 36.71, 55.0
n = lambda m: 440 * 2 ** ((m - 69) / 12)  # midi -> Hz
# ---------------- 0 - 5 s : oscuridad y tensión ----------------
drone = saw_pad([73.42, 110.0, 146.83], 5.3, att=3.5, rel=0.6, cutoff=500, det=0.003) * 1.4
put(drone * np.linspace(0, 1, len(drone)) ** 1.5, 0.0, 0.6, 0.0)
put(np.sin(2 * np.pi * D1 * tt(5.0)) * np.clip(tt(5.0) / 3.0, 0, 1) ** 2 * 0.55, 0.0, 0.8)
put(whoosh(4.0, 120, 900, 0.9, 1.0, 0.8) * 0.12 + 0.0, 0.2, 0.5, -0.3)  # aire
put(bell(n(86), 3.5, 1.1) * 0.55, T_SPARK, 0.5, 0.2)                    # chispa
put(bell(n(93), 3.0, 1.4) * 0.3, T_SPARK + .02, 0.4, -0.3)
for i, tp in enumerate(T_PULSES):                                       # latidos
    put(boom(95, 42, 0.9, 6.0, 0.15) * 1.0, tp, 0.45 + 0.14 * i, 0.0)
    put(boom(95, 42, 0.9, 6.0, 0.0) * 0.5, tp + 0.18, 0.2 + 0.07 * i, 0.0)
riser = whoosh(3.8, 250, 7500, 1.1, 1.5, 3.0); riser *= np.linspace(0.05, 1, len(riser)) ** 1.8
put(riser, 1.15, 0.35, 0.0)
for k, (T, f) in enumerate(zip(T_FLAME.values(), [98.0, 110.0, 146.8])):    # ignición
    put(boom(f * 1.6, f * .5, 1.6, 2.5, 0.6), T, 0.8, 0.0)
    put(whoosh(0.9, 400, 5000, 0.9, 1.0, 0.7) * 0.7, T - 0.05, 0.5, (k - 1) * 0.5)
    put(bell(n(74 + 5 * k) * 2, 2.0, 2.2) * 0.4, T + 0.05, 0.3, (k - 1) * 0.6)
# cola inversa -> amanecer
rc = hp(noise(0.55), 3500) * reverse_env(0.55, 2.5)
put(rc, T_DAWN - 0.55, 0.55, 0.0)
# ---------------- 5.0 : AMANECER ----------------
put(boom(150, 32, 4.2, 1.3, 0.9), T_DAWN, 1.25)
put(hp(noise(3.0), 4000) * np.exp(-tt(3.0) * 1.9), T_DAWN, 0.45, 0.0)       # platillo
chord = [n(50), n(57), n(62), n(66), n(69), n(74)]
put(saw_pad(chord, 2.4, 0.02, 1.2, 3200, 0.005), T_DAWN, 0.62, 0.0)
for i, m in enumerate([74, 78, 81, 86, 90, 93, 98]):                          # brillo ascendente
    put(bell(n(m), 2.2, 1.5) * 0.7, T_DAWN + 0.06 * i, 0.35, -0.7 + 0.23 * i)
# ---------------- 6 - 11 : ritmo ----------------
beat = 0.5
tb = 6.0
while tb < 10.8:
    put(boom(110, 50, 0.45, 8.0, 0.2) * 0.9, tb, 0.5, 0.0)
    put(hat(), tb + beat / 2, 0.22 + 0.1 * (tb > 9), 0.3)
    if int(round((tb - 6.0) / beat)) % 2 == 1: put(snare(), tb, 0.28, 0.0)
    tb += beat
put(saw_pad([n(50), n(57), n(62), n(66)], 5.0, 0.5, 0.4, 1800, 0.004), 6.0, 0.22, 0.0)
# letras RAISE: golpes de taiko con altura creciente
for i, T in enumerate(T_RAISE):
    f = [73.4, 82.4, 92.5, 98.0, 110.0][i]
    put(taiko(f) * 1.0, T, 0.85, (i - 2) * 0.25)
    put(snare(), T, 0.45, (i - 2) * 0.25)
    put(whoosh(0.5, 3000, 800, 1.0, 1.0, 0.8) * 0.5, T - 0.55, 0.4, (i - 2) * 0.3)
    put(bell(n(74 + [0, 2, 4, 6, 9][i]) * 2, 1.4, 2.5) * 0.4, T, 0.25, (i - 2) * 0.4)
# UP!
put(boom(130, 33, 2.4, 2.0, 0.9), T_U, 1.0); put(snare(0.35) * 1.2, T_U, 0.6)
put(boom(140, 36, 2.0, 2.2, 0.9), T_P, 0.95); put(snare(0.35) * 1.2, T_P, 0.6)
asc = whoosh(0.62, 300, 6500, 1.1, 1.3, 1.6); put(asc, T_ARROW - 0.62, 0.65, 0.0)
sw = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (np.linspace(0, 2.6, int(0.58 * SR)))) / SR) * np.linspace(0, 1, int(0.58 * SR)) ** 2 * 0.25
put(sw, T_ARROW - 0.58, 0.5, 0.0)
put(boom(160, 40, 1.8, 2.4, 1.0), T_ARROW, 0.9); put(bell(n(86), 2.5, 1.5) * 0.9, T_ARROW, 0.4, 0.3)
put(boom(120, 30, 1.8, 2.6, 1.0), T_DOT, 0.85); put(blip(n(98), 0.5) * 0.7, T_DOT, 0.5)
# pincelada
sw2 = whoosh(T_BRUSH1 - T_BRUSH0 + 0.2, 900, 6500, 0.7, 0.8, 0.9); put(sw2, T_BRUSH0 - 0.05, 0.75, 0.0)
# texto "ES TU TIEMPO": notas pentatónicas
pent = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95]
for k in range(10): put(blip(n(pent[k])), T_TAG0 + TAG_STEP * k, 0.38, -0.5 + 0.11 * k)
# versículo: coro brillante
put(saw_pad([n(62), n(66), n(69), n(74), n(78)], 1.2, 0.8, 0.3, 4500, 0.006), T_VERSE0 - 0.1, 0.38, 0.0)
for i, m in enumerate([86, 90, 93, 98, 102, 105]): put(bell(n(m), 1.4, 2.8) * 0.6, T_VERSE0 + i * 0.1, 0.3, -0.6 + 0.24 * i)
put(hp(noise(1.0), 5000) * reverse_env(1.0, 3) * 0.6, T_FINAL - 1.0, 0.3, 0.0)
# ---------------- 11.0 : IMPACTO FINAL ----------------
put(boom(170, 30, 4.0, 1.1, 1.0), T_FINAL, 1.3)
put(boom(90, 27, 4.0, 0.9, 0.0) * 0.8, T_FINAL, 0.9)
put(hp(noise(3.8), 3000) * np.exp(-tt(3.8) * 1.2), T_FINAL, 0.5, 0.0)
brass = [n(38), n(50), n(57), n(62), n(66), n(69), n(74), n(78)]
put(saw_pad(brass, 3.9, 0.03, 2.2, 3800, 0.005, sweep=None), T_FINAL, 0.85, 0.0)
for i, m in enumerate([86, 90, 93, 98, 102]): put(bell(n(m), 3.0, 1.1) * 0.7, T_FINAL + 0.05 * i, 0.32, -0.6 + 0.3 * i)
# vacío dramático justo antes del golpe final (duck)
duck = np.ones(N); g0, g1 = int((T_FINAL - 0.14) * SR), int(T_FINAL * SR)
duck[g0:g1] = np.linspace(1, 0.08, g1 - g0) ** 1.0
duck[g1 - int(0.01 * SR):g1] = 0.0
L *= duck; R *= duck
# (el golpe final se re-inyecta sin duck:)
# ---------------- reverb y master ----------------
def make_ir(d=3.2, seed=1):
    r = np.random.RandomState(seed); t = tt(d)
    ir = r.randn(len(t)) * np.exp(-t * 1.9); ir = lp(ir, 6000) * (1 - np.exp(-t * 80)); return ir / np.sqrt((ir ** 2).sum())
wl = signal.fftconvolve(L, make_ir(3.2, 1))[:N]; wr = signal.fftconvolve(R, make_ir(3.2, 2))[:N]
Lm = L * 0.78 + wl * 0.55; Rm = R * 0.78 + wr * 0.55
# impacto final sin duck (reinyección en seco)
def dry(sig, t0, g):
    i = int(t0 * SR); n_ = min(len(sig), N - i); Lm[i:i + n_] += sig[:n_] * g * 0.7; Rm[i:i + n_] += sig[:n_] * g * 0.7
dry(boom(170, 30, 4.0, 1.1, 1.0), T_FINAL, 0.5)
mid = (Lm + Rm) / 2
sc = 0.9 / max(np.abs(Lm).max(), np.abs(Rm).max())
Lm *= sc; Rm *= sc
Lm = np.tanh(Lm * 1.25) / np.tanh(1.25); Rm = np.tanh(Rm * 1.25) / np.tanh(1.25)
fi = int(0.03 * SR); fo = int(0.35 * SR)
for X in (Lm, Rm):
    X[:fi] *= np.linspace(0, 1, fi); X[-fo:] *= np.linspace(1, 0, fo) ** 2
pk = max(np.abs(Lm).max(), np.abs(Rm).max()); Lm *= 0.89 / pk; Rm *= 0.89 / pk
st = (np.stack([Lm, Rm], axis=1) * 32767).astype(np.int16)
with wave.open('work/audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('audio listo; pico', pk, 'rms', float(np.sqrt((st.astype(float) ** 2).mean()) / 32767))
