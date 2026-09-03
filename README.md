# Plataforma Equipos Timón
## Renovación Carismática · Arquidiócesis de San Salvador

Plataforma multiequipo para la gestión de comunidades, hermanos, talleres, actividades, servicios y actas de reunión de los Equipos Timón.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS o superior |
| SQL Server | 2019+ (local) o Azure SQL |
| JDK | 21 (solo para generar APK en local) |
| Android Studio | Latest (solo para APK en local) |

---

## Variables de entorno

### Backend (`backend/.env`)

```env
DATABASE_URL="sqlserver://localhost:1433;database=plataforma_timon;user=sa;password=TuPassword;trustServerCertificate=true"
JWT_SECRET=cadena_aleatoria_minimo_64_chars
JWT_REFRESH_SECRET=otra_cadena_diferente_minimo_64_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Plataforma Timón
```

---

## Instalación y arranque

### 1. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de SQL Server

# Generar cliente Prisma y ejecutar migraciones
npx prisma generate
npx prisma migrate dev --name init

# Cargar datos de ejemplo
npm run db:seed

# Arrancar en modo desarrollo
npm run dev
# → Servidor en http://localhost:3000
# → GET http://localhost:3000/api/health debe responder { status: "ok" }
```

**Credenciales del seed:**
- Email: `admin@renovacion.org`
- Password: `Admin2026!`

### 2. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Arrancar en modo desarrollo
npm run dev
# → App en http://localhost:5173
```

---

## Estructura del proyecto

```
plataforma-timon/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma singleton, JWT helpers
│   │   ├── middlewares/     # requireAuth, requireEquipo, errorHandler
│   │   └── modules/         # auth, equipos, comunidades, hermanos, talleres,
│   │                        # actividades, servicios, reuniones, ocr, dashboard
│   ├── prisma/
│   │   ├── schema.prisma    # Modelo completo
│   │   └── seed.js          # Datos iniciales
│   └── uploads/             # Archivos subidos (gitignored)
│
└── frontend/
    └── src/
        ├── api/             # Clientes axios por módulo
        ├── components/
        │   ├── ui/          # Button, Input, Card, Badge, Toast, Spinner
        │   └── shared/      # Layout, ProtectedRoute
        ├── pages/           # Una carpeta por módulo
        ├── stores/          # Zustand (useAuthStore)
        └── hooks/           # useDebounce
```

---

## API — Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servidor |
| POST | `/api/auth/login` | Inicio de sesión |
| POST | `/api/auth/refresh` | Renovar access token |
| GET | `/api/auth/mis-equipos` | Equipos del usuario |
| GET | `/api/equipos/:id/comunidades` | Listar comunidades |
| GET | `/api/equipos/:id/hermanos` | Listar hermanos |
| GET | `/api/equipos/:id/talleres` | Catálogo de talleres |
| GET | `/api/equipos/:id/actividades` | Listar actividades |
| POST | `/api/equipos/:id/actividades/:aid/asistencia` | Registrar asistencia |
| GET | `/api/equipos/:id/reuniones` | Listar reuniones |
| POST | `/api/equipos/:id/reuniones/:rid/generar-texto` | Generar texto WhatsApp |
| POST | `/api/equipos/:id/ocr/procesar` | Procesar imagen con Tesseract |
| GET | `/api/equipos/:id/dashboard` | Métricas del equipo |

---

## Roles de usuario

| Rol | Permisos |
|---|---|
| COORDINADOR | Acceso total al equipo |
| ENLACE | Gestiona sus comunidades asignadas |
| SECRETARIO | Actas y servicios del equipo |
| CONSULTOR | Solo lectura |

---

## APK Android (Capacitor)

La APK es una **carcasa remota**: `frontend/capacitor.config.json` tiene
`server.url = https://plataforma-timon.vercel.app`, así que la app carga el sitio en vivo.

> **Cada deploy a Vercel se ve al instante en la APK, sin reinstalar nada.**
> Sólo hay que volver a compilar e instalar la APK cuando cambian el icono, los
> plugins nativos, `capacitor.config.json` o el código de ingreso con huella.

### Ingreso con huella

Dentro de la APK, tras iniciar sesión con contraseña se ofrece **activar el
ingreso con huella** (o rostro). Las credenciales se guardan cifradas en el
Keystore de Android (`@capgo/capacitor-native-biometric`); "Entrar con huella"
hace el login normal sin escribir la contraseña. Se puede activar/desactivar
también desde **Mi perfil**. En el navegador web no aparece nada de esto.
Si la contraseña cambia, el ingreso con huella se desactiva solo y pide la contraseña.

### Icono

Colocar el PNG del timón (1024×1024) en `frontend/assets/icon.png` y ejecutar:

```bash
cd frontend
npm run assets          # regenera iconos Android + PWA
npm run apk:sync        # build + cap sync android
```

Ver `frontend/assets/README.md`.

### Compilar en local

```bash
cd frontend
npm run apk:sync        # npm run build + npx cap sync android
npm run apk:open        # abre Android Studio  (o:)
npm run apk:debug       # gradlew assembleDebug -> android/app/build/outputs/apk/debug/app-debug.apk
```

Necesita JDK 21 (el que trae Android Studio sirve) y el Android SDK.

### Compilar APK firmada (GitHub Actions)

Workflow `.github/workflows/build-apk.yml` — se dispara manualmente
(**Actions → Build APK Android → Run workflow**) o al empujar un tag `v*`.
Produce la APK firmada como artefacto descargable (y la adjunta al Release si es un tag).

**Keystore (una sola vez):**

```bash
keytool -genkeypair -v -keystore timon-release.jks -alias timon \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 timon-release.jks       # -> secret ANDROID_KEYSTORE_BASE64
```

Guardar el `.jks` **fuera del repo** y respaldarlo (sin él no se pueden firmar
actualizaciones instalables sobre la misma app).

**Secrets del repo** (Settings → Secrets and variables → Actions):
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

Para compilar firmado en local: copiar `frontend/android/keystore.properties.example`
a `frontend/android/keystore.properties` y rellenarlo, luego `npm run apk:sync && cd android && ./gradlew assembleRelease`.

### Distribución sin Play Store

1. Enviar la APK por WhatsApp, correo o link de descarga.
2. En el dispositivo: activar "Instalar apps desconocidas" para esa fuente.
3. Abrir la APK e instalar. Las siguientes actualizaciones de contenido ya no
   requieren reinstalar (llegan por el deploy de Vercel).

---

## OCR — Formato esperado de cartas de servicio

El sistema extrae datos usando expresiones regulares. Las cartas deben contener líneas con este formato:

```
NOMBRE: Juan Pérez García
SERVICIO: Alabanza
FECHA: 15/03/2026
COMUNIDAD: Comunidad Espíritu Santo
NOTAS: Disponible desde las 7am
```

---

## Tecnologías

**Backend:** Node.js 20 · Express · Prisma · SQL Server · JWT · Multer · Tesseract.js · Zod

**Frontend:** React 19 · Vite · Tailwind CSS v3 · TanStack Query v5 · Zustand · React Router v7 · Recharts · Capacitor v8 (PWA + APK con carcasa remota + ingreso con huella)

---

*Versión 1.1 — Stack: Node.js · Express · Prisma · SQL Server · React · Vite · Tailwind · Capacitor*
