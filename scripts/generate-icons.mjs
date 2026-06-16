import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'favicon.svg')
const outDir = join(root, 'electron', 'icons')

mkdirSync(outDir, { recursive: true })

const svg = readFileSync(svgPath)

function renderPng(size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

// Tray icons
for (const size of [16, 32]) {
  const png = renderPng(size)
  const name = size === 32 ? 'tray@2x.png' : 'tray.png'
  writeFileSync(join(outDir, name), png)
  console.log(`Generated electron/icons/${name} (${size}x${size})`)
}

// Linux / Windows fallback PNG
const png512 = renderPng(512)
writeFileSync(join(outDir, '512x512.png'), png512)
console.log('Generated electron/icons/512x512.png')

// macOS .icns via iconutil
const iconsetDir = join(outDir, 'app.iconset')
mkdirSync(iconsetDir, { recursive: true })
const icnsSizes = [16, 32, 64, 128, 256, 512]
for (const s of icnsSizes) {
  writeFileSync(join(iconsetDir, `icon_${s}x${s}.png`), renderPng(s))
  writeFileSync(join(iconsetDir, `icon_${s}x${s}@2x.png`), renderPng(s * 2))
}
const icnsPath = join(outDir, 'app.icns')
execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`)
rmSync(iconsetDir, { recursive: true })
console.log('Generated electron/icons/app.icns')

// Windows .ico — pack several sizes into one file using raw ICO format
const icoSizes = [16, 32, 48, 256]
const pngs = icoSizes.map((s) => renderPng(s))

// Minimal ICO writer (ICONDIR + ICONDIRENTRYs + PNG blobs)
const count = icoSizes.length
const headerSize = 6
const entrySize = 16
const dataOffset = headerSize + entrySize * count

const header = Buffer.alloc(headerSize)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: ICO
header.writeUInt16LE(count, 4)

const entries = []
const blobs = []
let currentOffset = dataOffset
for (let i = 0; i < count; i++) {
  const size = icoSizes[i]
  const blob = pngs[i]
  const entry = Buffer.alloc(entrySize)
  entry.writeUInt8(size === 256 ? 0 : size, 0) // width (0 = 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1) // height
  entry.writeUInt8(0, 2) // color count
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(blob.length, 8) // size of image data
  entry.writeUInt32LE(currentOffset, 12) // offset
  entries.push(entry)
  blobs.push(blob)
  currentOffset += blob.length
}

const icoPath = join(outDir, 'app.ico')
writeFileSync(icoPath, Buffer.concat([header, ...entries, ...blobs]))
console.log('Generated electron/icons/app.ico')
