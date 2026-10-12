# DECISIONES — Revelación animada del emblema «RAISE UP! · Es tu tiempo · Isaías 60,1-2»

Entregable: `out/RAISE_UP_reveal.mp4` — 15.000 s, 1920×1080, 60 fps (900 fotogramas), H.264 (High, yuv420p, BT.709) + AAC estéreo 256 kb/s.
Todo se generó con código (Python + NumPy/SciPy/OpenCV + FFmpeg). No se usó ningún modelo generativo ni muestras de audio.

## 1. Dirección creativa

**Concepto: «Isaías 60,1: Levántate, resplandece, porque ha venido tu luz».** El verso que aparece en el logo es también la estructura narrativa:

| Tiempo | Acto | Qué ocurre |
|---|---|---|
| 0.0–3.5 s | Oscuridad / anticipación | Fondo azul noche con bruma y rayos tenues, empuje lento de cámara. Una chispa nace en 1.0 s; ~260 brasas convergen en espiral hacia ella, anillos de energía se contraen y finas estelas con punta de flecha (motivo «UP») ascienden. Latidos de graves a 2.0/2.5/3.0/3.5 s. |
| 3.5–4.5 s | Ignición | La llama se enciende por capas del propio logo: roja (3.5), naranja (4.0), amarilla (4.5), cada una con rebote elástico, destello y temblor de cámara. |
| 5.0–6.0 s | **Amanecer** | Impacto: la luz se expande en un frente cálido desde el núcleo hasta inundar el fondo de blanco; la persona de brazos alzados emerge de la luz. |
| 6.0–7.0 s | RAISE | R·A·I·S·E caen en 3D (perspectiva, rotación, desenfoque de movimiento, sombra de elevación) y aterrizan cada 1/8 de compás con rebote, polvo y onda de choque. |
| 7.5–8.25 s | UP! | U y P suben desde abajo; la flecha se lanza como un cohete con estela y frena con rebote; el punto de la «!» cae y aplasta. |
| 8.5–9.2 s | Pincelada | Barrido tipo brocha con frente irregular (cerdas) y deslizamiento. |
| 9.0–9.9 s | ES TU TIEMPO | 10 glifos con entrada escalonada (60 ms) y destello. |
| 9.9–10.7 s | Versículo | Glifos del versículo que se «abren» desde el centro y las dos líneas rojas que crecen hacia afuera. Después, un instante de silencio. |
| 11.0 s | **Impacto final** | Golpe, destello diagonal, pulso de cámara y fusión con el logo original. |
| 11.8–15.0 s | Reposo | **3.2 s** de imagen idéntica y estática. |

Principio de diseño: cada elemento original llega a su sitio «con propósito» (tipo de movimiento acorde: lo que sube, sube; lo que pesa, cae). Los efectos (brasas, anillos, polvo) existen solo antes del reposo y se limitan a apoyar al logo.

## 2. Decisiones técnicas

- **Segmentación del logo (`src/segment.py`).** El logo se entregó como JPG raster (937×845), sin vectores. Lo separé por clasificación de color (HSV) y componentes conexas en 38 capas RGBA: R, A, I, S, E; U, P, flecha+tallo, punto; llama en 3 capas anidadas (roja, naranja, amarilla); persona; pincelada; 10 letras blancas de «ES TU TIEMPO»; 13 glifos del versículo; 2 líneas rojas. Alfa por cobertura (proyección de color sobre blanco) y color plano o extendido desde el núcleo, para que no haya halos al componer sobre fondo oscuro. La recomposición sobre blanco da 34 dB de PSNR contra el original escalado: el error está solo en bordes de 1 px.
- **Fidelidad del fotograma final.** Las capas son una reconstrucción; ligeramente más nítidas que el JPG y con la pincelada algo más plana. Para no *rediseñar* nada, entre 11.35 y 11.65 s se hace una fusión a la imagen original escalada ×1.4 (Lanczos) y desde 11.7 s el fotograma **es** esa imagen. Verificado: diferencia máxima 0 respecto a la referencia escalada del original (antes de la compresión). Único retoque: el ruido JPEG del fondo (diferencia < 10 niveles respecto a blanco) se llevó a blanco puro para que el fondo del vídeo y del logo coincidan.
- **Motor 3D (`src/render.py`).** Cada capa se transforma con una homografía derivada de rotación 3D + cámara en perspectiva (f = 1800 px); interpolación bilineal en premultiplicado. Desenfoque de movimiento por muestreo temporal (hasta 12 muestras, obturador ≈ 0.9 fotograma) según velocidad. Cada fotograma es función pura de *t*, así que se renderiza en paralelo sin estado.
- **Fondo y luz.** Degradado radial, bruma fractal (fbm) deslizante, rayos polares, resplandor del núcleo y halo de la llama por desenfoque; el amanecer es un campo radial con borde cálido. Mezcla *screen* para brasas (invisibles sobre blanco por diseño) y mezcla normal para polvo/anillos de choque (visibles sobre blanco).
- **Profundidad sobre blanco.** Sombras proyectadas con altura (`elev`): se separan y desenfocan cuando la pieza vuela y colapsan a cero al aterrizar.
- **Llama «viva».** Campo de desplazamiento sinusoidal (más amplitud hacia la punta) que se apaga entre 8.8 y 11.2 s: el fuego se asienta en el emblema.
- **Óptica.** Temblor de cámara y aberración cromática decrecientes en cada impacto; grano de película solo en la fase oscura; viñeta suave sobre el blanco que se retira antes del reposo. La cámara empuja de 0.90× a 1.0× y llega exactamente a 1.0× antes del final.
- **Reposo.** Desde 11.8 s se escribe un único fotograma y se replica 191 veces. Codifiqué con GOP largo (`keyint=708`, sin `scenecut`) y CRF 16 para que no haya parpadeo de compresión en el reposo.
- **Sincronía.** `src/timeline.py` define todos los eventos (120 BPM, 1 beat = 0.5 s) y lo importan el render y la síntesis de audio.

## 3. Banda sonora (`src/audio.py`)

Síntesis 100 % desde cero a 48 kHz (NumPy/SciPy), sin muestras: dron sub-grave en Re con filtro, latidos de bombo, ascenso de ruido filtrado con centro variable, campanas inarmónicas (aditivas), pads de sierra aditiva (acordes de Re mayor), taiko sintético (barrido sinusoidal + ruido), caja, hi-hat, «whooshes» y blips pentatónicos para las letras de «ES TU TIEMPO». Cada letra de RAISE golpea con altura creciente (Re2→La2). Antes del impacto final hay un hueco de silencio de 140 ms; el golpe final combina boom, platillo, acorde metálico y reverb de convolución sintética. Master: tanh suave, pico a −1 dBFS aprox., fundido de 350 ms al final para evitar clic.

## 4. Enfoques descartados

- **Modo claro desde el primer fotograma:** las brasas y el resplandor no se leen sobre blanco y se pierde el drama; además se pierde el mensaje «luz que llega». Se eligió oscuro → amanecer.
- **Revelar el logo con máscaras sobre la imagen completa:** más barato pero no «ensambla» elementos; se descartó por la exigencia de construcción progresiva.
- **Blender/3D real:** cuesta mucho en este entorno sin GPU y no mejora un logo plano; se usaron homografías en perspectiva.
- **Contornos vectoriales (potrace) para escalar:** arriesgaba redibujar el logo; se prefirió Lanczos sobre el original.
- **Bloom de pantalla completa:** se sustituyó por halos localizados (más barato y sin lavar el blanco).
- **Mantener la llama bailando en el reposo:** descartado por el requisito de imagen completamente quieta.

## 5. Iteraciones

1. Segmentación: 3 pasadas (la persona se «desbordaba» al fondo exterior; se corrigió con corte a y = 578 px del original; el color de las líneas rojas del versículo fallaba por ser demasiado finas).
2. Vista previa (35 % de resolución) en 4 pasadas: corrección de canales de color de las brasas (salían azules), anillos demasiado grandes y artificiales, rayos y viñeta demasiado marcados, amanecer demasiado rápido, destello final demasiado fuerte (lavaba la llama).
3. Render completo a 1920×1080 (225 s con 4 procesos) y tres codificaciones (CRF 14 → 110 MB; CRF 18 → 54 MB con ruido en el reposo; CRF 16 con GOP largo → versión final).

## 6. Metodología de render

`python3 src/segment.py` → `work/layers.pkl`; `python3 src/audio.py` → `work/audio.wav`; `RS=1 python3 src/render.py` → PNG por fotograma (multiproceso); FFmpeg → MP4. Vista previa rápida: `src/preview.py`.

## 7. Tiempo total de producción

Aprox. 22 minutos de reloj (00:51 → 01:13 UTC del 12-oct-2026): análisis y segmentación, motor de render e iteraciones, audio, render (225 s), tres codificaciones y esta documentación.

## 8. Limitaciones (sin maquillar)

- **No he escuchado el audio ni reproducido el vídeo en tiempo real.** Verifiqué la imagen con hojas de contactos de fotogramas y el audio con perfiles de energía (RMS/pico por medio segundo) y duración. La mezcla (equilibrio, timbres, reverb) probablemente necesita ajuste fino a oído.
- El logo de origen es un JPG de baja resolución: se escaló ×1.4 y, por tanto, el reposo final no es más nítido que el original.
- La reconstrucción por capas no es idéntica al JPG (34 dB de PSNR; pincelada más plana); se oculta con la fusión final, pero durante la animación las capas pueden diferir ligeramente en bordes.
- Antes del amanecer, el hueco de la persona se ve como silueta oscura dentro de la llama (en el logo original esa silueta es blanca sobre blanco). Es coherente con la historia, pero es una consecuencia del diseño.
- Algunos efectos secundarios (anillos de choque elípticos grises sobre el blanco, estelas «UP» finas) son discretos y mejorables; no los iteré más por tiempo.
- La compresión H.264 4:2:0 introduce pequeñas diferencias de color en bordes saturados respecto al PNG (media ≈ 2 niveles; máx. 47 en algún borde rojo/blanco); 12.0 s y 14.98 s difieren hasta 13 niveles en el vídeo codificado aunque los fotogramas fuente son idénticos.
- Los fotogramas intermedios (PNG, ~2 GB) no se versionan; se regeneran con los scripts.
