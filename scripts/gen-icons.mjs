import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

const svgSrc = readFileSync(resolve(root, 'public/icons/icon.svg'), 'utf8')

const targets = [
  { file: 'public/icon-192x192.png',    size: 192 },
  { file: 'public/icon-512x512.png',    size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/favicon-32x32.png',   size: 32  },
]

for (const { file, size } of targets) {
  const resvg = new Resvg(svgSrc, { fitTo: { mode: 'width', value: size } })
  const png   = resvg.render().asPng()
  writeFileSync(resolve(root, file), png)
  console.log(`✓ ${file} (${size}x${size})`)
}

console.log('Tüm ikonlar üretildi.')
