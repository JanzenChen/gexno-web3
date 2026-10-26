/**
 * MCP 工具定义与处理逻辑（stdio / 将来复用）。
 */
export const SERVER_INFO = { name: 'gexno-web3', version: '0.1.0' }

export const TOOLS = [
  {
    name: 'lookup_wallet',
    description:
      'Look up an Ethereum wallet on-chain profile: ETH balance, whether the address is a smart contract, ' +
      'outbound transaction count, and simple risk heuristics (ok / new_wallet / contract / eip7702). ' +
      'Use when the user asks to check a wallet, query address balance, or get a quick chain risk snapshot. ' +
      'Not an AML score. EIP-7702 delegated EOAs are risk=eip7702 (not contracts).',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Ethereum address (0x-prefixed, 40 hex chars)',
          pattern: '^0x[a-fA-F0-9]{40}$',
        },
      },
      required: ['address'],
      additionalProperties: false,
    },
  },
  {
    name: 'lookup_nft',
    description:
      'Resolve NFT metadata for a contract + tokenId: name, description, image HTTP URL, IPFS gateway link, ' +
      'and raw metadata JSON. Supports ERC-721 tokenURI and ERC-1155 uri. ' +
      'Use when the user asks for NFT metadata, token image, or to parse IPFS NFT JSON. ' +
      'tokenId must be a decimal string (or integer).',
    inputSchema: {
      type: 'object',
      properties: {
        contract: {
          type: 'string',
          description: 'NFT contract address (0x-prefixed, 40 hex chars)',
          pattern: '^0x[a-fA-F0-9]{40}$',
        },
        tokenId: {
          oneOf: [{ type: 'string', pattern: '^\\d+$' }, { type: 'integer', minimum: 0 }],
          description: 'Token ID as decimal string or non-negative integer',
        },
      },
      required: ['contract', 'tokenId'],
      additionalProperties: false,
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
  const base = String(apiBase || 'http://127.0.0.1:3000').replace(/\/$/, '')
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
