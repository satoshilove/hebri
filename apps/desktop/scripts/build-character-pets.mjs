/** Bake the original SVG collection into the existing cross-platform pet atlas format.
 * Run at repo root: node apps/desktop/scripts/build-character-pets.mjs
 * Uses an isolated Playwright browser, no user profile, network or provider calls.
 */
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const output = path.join(root, 'agent/pet/assets/hebri')
await mkdir(output, { recursive: true })
const bundle = await build({
  entryPoints: [path.join(root, 'apps/desktop/src/plugins/hermes-bots/characters.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'characters'
})
const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu'],
  ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {})
})
try {
  const page = await browser.newPage({ reducedMotion: 'no-preference' })
  await page.route('**/*', route => route.abort())
  await page.setContent('<div id="art"></div>')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  const catalog = await page.evaluate(() =>
    characters.HEBRI_CHARACTERS.flatMap(([name, description, kind]) =>
      characters.CHARACTER_PALETTES.map(([palette], index) => ({
        slug: `hebri-${kind}-${palette.toLowerCase()}`,
        displayName: `${name} · ${palette}`,
        description,
        shape: characters.characterShape(kind, index)
      }))
    )
  )
  for (const entry of catalog) {
    const base64 = await page.evaluate(async ({ shape }) => {
      const canvas = document.createElement('canvas')
      canvas.width = 192 * 8
      canvas.height = 208 * 9
      const ctx = canvas.getContext('2d')
      const host = document.getElementById('art')
      host.innerHTML = characters.characterSvg(shape, undefined, false)
      const svg = host.querySelector('svg')
      svg.setAttribute('width', '192')
      svg.setAttribute('height', '208')
      const states = ['idle', 'run', 'run', 'wave', 'jump', 'failed', 'waiting', 'run', 'review']
      for (let row = 0; row < states.length; row++)
        for (let frame = 0; frame < 8; frame++) {
          // Existing renderers play six frames; remaining atlas columns are padding.
          const t = ((frame % 6) / 6) * 1.1
          characters.paintCharacter(svg, states[row], t)
          // One full blink per idle loop, without changing the live face clock cadence.
          if (row === 0 && frame === 4)
            svg.querySelectorAll('.hs-eye').forEach(n => (n.style.transform = 'scaleY(.08)'))
          const image = new Image()
          const url = URL.createObjectURL(
            new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
          )
          try {
            image.src = url
            await image.decode()
            ctx.save()
            ctx.translate(frame * 192, row * 208)
            if (row === 2) {
              ctx.translate(192, 0)
              ctx.scale(-1, 1)
            }
            ctx.drawImage(image, 0, 0, 192, 208)
            ctx.restore()
          } finally {
            URL.revokeObjectURL(url)
          }
        }
      return canvas.toDataURL('image/png').split(',')[1]
    }, entry)
    execFileSync(
      process.env.PYTHON || 'python',
      [
        '-c',
        'import io,sys; from PIL import Image; image=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGBA").quantize(colors=64,method=2).convert("RGBA"); image.save(sys.argv[1],format="WEBP",lossless=True,method=6)',
        path.join(output, `${entry.slug}.webp`)
      ],
      { input: Buffer.from(base64, 'base64'), maxBuffer: 1024 * 1024 }
    )
  }
  await writeFile(path.join(output, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
  console.log(`Built ${catalog.length} Hebri pet atlases`)
} finally {
  await browser.close()
}
