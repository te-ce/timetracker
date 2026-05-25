import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'favicon.svg')
const outDir = join(root, 'electron', 'icons')

mkdirSync(outDir, { recursive: true })

const svg = readFileSync(svgPath)

for (const size of [16, 32]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  const name = size === 32 ? 'tray@2x.png' : 'tray.png'
  writeFileSync(join(outDir, name), png)
  console.log(`Generated electron/icons/${name} (${size}x${size})`)
}
