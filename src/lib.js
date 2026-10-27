/**
 * MCP 工具定义与处理逻辑（stdio / 将来复用）。
 */
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
export const SERVER_INFO = { name: 'gexno-web3', version: pkg.version }

export const TOOLS = [
  {
    name: 'lookup_wallet',
    description:
      'Look up an Ethereum wallet: ETH balance, contract flag, outbound tx count, and simple risk ' +
      'heuristics (ok / new_wallet / contract / eip7702). EIP-7702 delegated EOAs report risk=eip7702. ' +
      'Read-only; not an AML score.',
    annotations: {
      title: 'Look up an Ethereum wallet',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Ethereum address (0x + 40 hex)',
          pattern: '^0x[a-fA-F0-9]{40}$',
        },
      },
      required: ['address'],
      additionalProperties: false,
      examples: [{ address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }],
    },
  },
  {
    name: 'lookup_nft',
    description:
      'Resolve NFT metadata for a contract + tokenId: name, description, image HTTP URL, IPFS gateway ' +
      'link, and raw metadata JSON. Supports ERC-721 and ERC-1155. Read-only.',
    annotations: {
      title: 'Look up NFT metadata',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        contract: {
          type: 'string',
          description: 'Contract address (0x + 40 hex)',
          pattern: '^0x[a-fA-F0-9]{40}$',
        },
        tokenId: {
          oneOf: [{ type: 'string', pattern: '^\\d+$' }, { type: 'integer', minimum: 0 }],
          description: 'Decimal token id',
        },
      },
      required: ['contract', 'tokenId'],
      additionalProperties: false,
      examples: [{ contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', tokenId: '1' }],
    },
  },
]

export function asNonEmptyString(value, field) {
  if (value == null) throw new Error(`${field} is required`)
  const s =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
      ? String(value).trim()
      : ''
  if (!s) throw new Error(`${field} is required`)
  return s
}

export function createApiGet({ apiBase, internalToken, timeoutMs }) {
  // 公开 npm 包默认连生产 API；本地开发用 GEXNO_API_BASE=http://127.0.0.1:3000 覆盖
  const base = String(apiBase || 'https://api.gexno.com').replace(/\/$/, '')
  const token = String(internalToken || '').trim()
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : 35_000

  return async function apiGet(path, query) {
    const url = new URL(path, `${base}/`)
    for (const [k, v] of Object.entries(query || {})) {
      if (v != null && v !== '') url.searchParams.set(k, String(v))
    }
    const headers = { accept: 'application/json' }
    if (token) headers['x-web3-internal-token'] = token

    let res
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) })
    } catch (err) {
      const name = err?.name || ''
      if (name === 'AbortError' || name === 'TimeoutError') {
        throw new Error(`API request timed out after ${timeout}ms (${base})`)
      }
      throw new Error(`API unreachable at ${base}: ${err?.message || String(err)}`)
    }

    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text || `HTTP ${res.status}` }
    }
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    return body
  }
}

/** @param {(path: string, query: Record<string, string>) => Promise<unknown>} apiGet */
export async function runTool(name, args, apiGet) {
  if (name === 'lookup_wallet') {
    const address = asNonEmptyString(args.address, 'address')
    return apiGet('/api/web3/wallet', { address })
  }
  if (name === 'lookup_nft') {
    const contract = asNonEmptyString(args.contract, 'contract')
    const tokenId = asNonEmptyString(args.tokenId, 'tokenId')
    if (!/^\d+$/.test(tokenId)) {
      throw new Error('tokenId must be a non-negative decimal integer string')
    }
    return apiGet('/api/web3/nft', { contract, tokenId })
  }
  const err = new Error(`Unknown tool: ${name}`)
  err.code = 'unknown_tool'
  throw err
}
