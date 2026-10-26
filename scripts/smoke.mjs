#!/usr/bin/env node
/**
 * 本地自测：不经过 MCP stdio，直接打 HTTP API。
 *
 * 用法（API 已在 3000 端口时）：
 *   cd mcp && npm run smoke
 *   会尝试读取仓库根 .env 中的 WEB3_INTERNAL_TOKEN
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const k = m[1].trim()
    const v = m[2].trim()
    if (!(k in process.env)) process.env[k] = v
  }
} catch {
  /* optional */
}

const API_BASE = String(process.env.GEXNO_API_BASE ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const TOKEN = String(process.env.GEXNO_INTERNAL_TOKEN ?? process.env.WEB3_INTERNAL_TOKEN ?? '').trim()

const headers = { accept: 'application/json' }
if (TOKEN) headers['x-web3-internal-token'] = TOKEN

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(35_000) })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

const walletAddr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const bayc = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
let failed = 0

console.log('API_BASE =', API_BASE)
console.log('--- discovery ---')
for (const p of [
  '/.well-known/ard.json',
  '/.well-known/ai-catalog.json',
  '/api/web3/openapi.json',
]) {
  const r = await get(p)
  console.log(p, r.status, r.body?.name || r.body?.info?.title || r.body?.error || 'ok')
  if (r.status !== 200) failed++
}

console.log('--- wallet ---')
{
  const r = await get(`/api/web3/wallet?address=${walletAddr}`)
  console.log(r.status, {
    balanceEth: r.body?.balanceEth,
    isContract: r.body?.isContract,
    txCount: r.body?.txCount,
    risk: r.body?.risk,
    error: r.body?.error,
  })
  if (r.status !== 200) failed++
}

console.log('--- nft ---')
{
  const r = await get(`/api/web3/nft?contract=${bayc}&tokenId=1`)
  console.log(r.status, {
    standard: r.body?.standard,
    attrs: Array.isArray(r.body?.attributes) ? r.body.attributes.length : 0,
    error: r.body?.error,
  })
  if (r.status !== 200) failed++
}

console.log(failed ? `FAILED ${failed}` : 'OK')
process.exitCode = failed ? 1 : 0

