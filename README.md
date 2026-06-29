# Plataforma Equipos Timón
## Renovación Carismática · Arquidiócesis de San Salvador

Plataforma multiequipo para la gestión de comunidades, hermanos, talleres, actividades, servicios y actas de reunión de los Equipos Timón.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS o superior |
| SQL Server | 2019+ (local) o Azure SQL |
| JDK | 17+ (solo para generar APK) |
| Android Studio | Latest (solo para APK) |

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

## Generar APK con Capacitor

### APK de desarrollo

```bash
cd frontend

# 1. Construir el frontend
npm run build

# 2. Sincronizar con Capacitor
npx cap sync android

# 3a. Abrir Android Studio (recomendado para primera vez)
npx cap open android

# 3b. O compilar sin Android Studio (requiere JDK 17+)
cd android
./gradlew assembleDebug
# APK en: android/app/build/outputs/apk/debug/app-debug.apk
```

### APK de producción (firmado)

```bash
# 1. Generar keystore (una sola vez)
keytool -genkey -v -keystore timon-release.keystore -alias timon -keyalg RSA -keysize 2048 -validity 10000

# 2. En android/app/build.gradle, agregar en android { signingConfigs { ... } }
# Ver: https://developer.android.com/studio/publish/app-signing

# 3. Compilar APK de release
cd android
./gradlew assembleRelease
# APK en: android/app/build/outputs/apk/release/app-release.apk
```

### Distribución sin Play Store

El APK puede distribuirse directamente (instalación directa):
1. Enviar el APK por WhatsApp, email o link de descarga
2. En el dispositivo: Configuración → Seguridad → Fuentes desconocidas (activar)
3. Abrir el APK y seguir las instrucciones de instalación

### Configurar URL de producción en Capacitor

Editar `frontend/capacitor.config.json`:

```json
{
  "appId": "org.renovacioncarismatica.timon",
  "appName": "Plataforma Timón",
  "webDir": "dist",
  "server": {
    "url": "https://timon.tudominio.com",
    "cleartext": false,
    "androidScheme": "https"
  }
}
```

**Nota:** Durante desarrollo local, omitir `server.url` para que Capacitor sirva desde `dist/`.

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

**Frontend:** React 18 · Vite · Tailwind CSS v3 · TanStack Query v5 · Zustand · React Router v6 · Recharts · Capacitor v6 (PWA + APK)

---

*Versión 1.1 — Stack: Node.js · Express · Prisma · SQL Server · React · Vite · Tailwind · Capacitor*
