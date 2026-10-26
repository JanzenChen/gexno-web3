#!/usr/bin/env node
/**
 * 打包 MCPB：产出 mcp/dist/gexno-web3.mcpb（zip，内含 manifest + src + node_modules）。
 * 用法：cd mcp && npm run pack:mcpb
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const staging = path.join(root, 'dist', 'mcpb-staging')
const outDir = path.join(root, 'dist')
const outFile = path.join(outDir, 'gexno-web3.mcpb')

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false })
  if (r.status !== 0) process.exit(r.status || 1)
}

fs.rmSync(staging, { recursive: true, force: true })
fs.mkdirSync(staging, { recursive: true })

const copy = [
  'manifest.json',
  'package.json',
  'package-lock.json',
  'LICENSE',
  'README.md',
]
for (const f of copy) {
  const src = path.join(root, f)
  if (!fs.existsSync(src)) {
    console.error(`missing ${f}`)
    process.exit(1)
  }
  fs.copyFileSync(src, path.join(staging, f))
}

fs.cpSync(path.join(root, 'src'), path.join(staging, 'src'), { recursive: true })

console.log('npm ci --omit=dev …')
run('npm', ['ci', '--omit=dev'], staging)

// zip 内容为 staging 根（manifest.json 在 zip 顶层）
fs.mkdirSync(outDir, { recursive: true })
fs.rmSync(outFile, { force: true })

const zipCmd = process.platform === 'win32' ? null : 'zip'
if (!zipCmd) {
  console.error('pack-mcpb currently requires `zip` on PATH (macOS/Linux)')
  process.exit(1)
}
run('zip', ['-r', '-q', outFile, '.'], staging)

const size = fs.statSync(outFile).size
console.log(`OK ${outFile} (${(size / 1024 / 1024).toFixed(2)} MiB)`)
console.log('Install: Claude Desktop → Extensions → Install Extension… → select this .mcpb')
console.log('Publish (when ready): smithery mcp publish ./dist/gexno-web3.mcpb -n your-org/gexno-web3')
