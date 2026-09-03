# assets/ — fuente de iconos y splash

Coloca aquí las imágenes fuente y ejecuta `npm run assets` para regenerar
los iconos de la APK Android **y** los iconos PWA de `public/icons/`.

## Archivos

| Archivo | Tamaño | Obligatorio | Uso |
|---|---|---|---|
| `icon.png` | 1024×1024 px, PNG | **Sí** | Icono de la app (Android + PWA + favicon). El timón rojo. |
| `splash.png` | 2732×2732 px, PNG | No | Pantalla de carga. Arte centrado sobre fondo blanco; deja mucho margen. |
| `splash-dark.png` | 2732×2732 px, PNG | No | Splash para modo oscuro. |

Si no hay `splash*.png`, Capacitor usa un splash blanco con el icono.

## Regenerar

```bash
cd frontend
npm run assets          # web + Android
# o por separado:
npm run assets:web      # solo public/icons/*
npm run assets:android  # solo android/app/src/main/res/*
```

Luego:

```bash
npm run apk:sync        # build + cap sync android
```

Los resultados en `android/app/src/main/res/**` y `public/icons/**` **sí se commitean**.
Esta carpeta `assets/` también se commitea (es la fuente).
