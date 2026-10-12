"""Línea de tiempo maestra: la usan el render y el audio para estar sincronizados.
Tempo 120 BPM (1 beat = 0.5 s). Todos los tiempos en segundos."""
import math
FPS = 60
DUR = 15.0
NFRAMES = 900
BPM = 120
HOLD_START = 11.8            # desde aquí el fotograma es idéntico (>= 3.2 s de reposo)

T_SPARK = 1.0
T_PULSES = [2.0, 2.5, 3.0, 3.5]                # latidos (convergencia)
T_FLAME = {'flame_red': 3.5, 'flame_orange': 4.0, 'flame_yellow': 4.5}
T_DAWN = 5.0                                    # amanecer: luz + persona
T_RAISE = [6.0, 6.25, 6.5, 6.75, 7.0]           # R A I S E (aterrizaje)
T_U, T_P, T_ARROW, T_DOT = 7.5, 7.75, 8.0, 8.25
T_BRUSH0, T_BRUSH1 = 8.5, 9.2
T_TAG0, TAG_STEP = 9.0, 0.06
T_VERSE0, T_LINES0 = 9.9, 10.2
T_FINAL = 11.0                                  # impacto final
T_XFADE0, T_XFADE1 = 11.35, 11.65               # fusión a la imagen original exacta
T_STILL = 11.7

def clamp(x, a=0.0, b=1.0): return a if x < a else (b if x > b else x)
def smoothstep(a, b, x):
    u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u)
def ease_in_cubic(u): u = clamp(u); return u ** 3
def ease_out_cubic(u): u = clamp(u); return 1 - (1 - u) ** 3
def ease_out_quart(u): u = clamp(u); return 1 - (1 - u) ** 4
def ease_out_expo(u): u = clamp(u); return 1.0 if u >= 1 else 1 - 2 ** (-10 * u)
def ease_in_out_cubic(u):
    u = clamp(u); return 4 * u ** 3 if u < .5 else 1 - (-2 * u + 2) ** 3 / 2
def ease_out_back(u, s=1.70158):
    u = clamp(u); return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2
def ease_out_sine(u): return math.sin(clamp(u) * math.pi / 2)
def damped(tau, zeta=9.0, freq=3.0):
    """oscilación amortiguada tras un impacto (1 -> 0)"""
    return math.exp(-zeta * tau) * math.cos(2 * math.pi * freq * tau) if tau >= 0 else 0.0

# Impactos: (tiempo, temblor px, aberración cromática)
IMPACTS = [(3.5, 5, .35), (4.0, 4, .3), (4.5, 5, .4), (T_DAWN, 11, 1.0)]
IMPACTS += [(t, 4, .3) for t in T_RAISE]
IMPACTS += [(T_U, 9, .6), (T_P, 9, .6), (T_ARROW, 6, .5), (T_DOT, 9, .6), (T_FINAL, 12, 1.0)]

if __name__ == '__main__':
    print('beat final =', T_FINAL / 0.5, 'hold =', DUR - HOLD_START)
