// Genera los iconos PWA / favicon de public/icons a partir de assets/icon.png
// Uso: npm run assets:web   (o npm run assets para web + Android)
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..'
const SRC = path.join(root, 'assets/icon.png')
const OUT = path.join(root, 'public/icons')
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

if (!existsSync(SRC)) {
  console.error(`\n✗ No se encontró ${SRC}\n  Coloca ahí el icono (PNG cuadrado, idealmente 1024x1024) y vuelve a ejecutar.\n`)
  process.exit(1)
}

await mkdir(OUT, { recursive: true })

const plain = (size, file) =>
  sharp(SRC).resize(size, size, { fit: 'contain', background: WHITE }).png().toFile(path.join(OUT, file))

// Icono "maskable": el arte va dentro del 80% central (zona segura de Android/PWA).
const maskable = async (size, file) => {
  const inner = Math.round(size * 0.8)
  const art = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, file))
}

await Promise.all([
  plain(192, 'icon-192.png'),
  plain(512, 'icon-512.png'),
  plain(180, 'apple-touch-icon.png'),
  plain(32, 'favicon-32.png'),
  plain(16, 'favicon-16.png'),
  maskable(512, 'icon-maskable-512.png'),
])

console.log('✓ Iconos web generados en public/icons/')
