# Gexno Web3 MCP

Free, no-signup on-chain lookups for AI agents. Two read-only tools: **wallet profile** and **NFT metadata**.

- **Remote:** `https://api.gexno.com/mcp` — Streamable HTTP, nothing to install
- **npm:** `npx @gexno/web3-mcp` — same tools over stdio
- **Registry name:** `io.github.JanzenChen/gexno-web3`

No API key, no signup, no wallet connection. Reads only.

| Tool | What it returns |
|---|---|
| `lookup_wallet` | ETH balance, contract flag, outbound tx count, simple risk heuristics (`ok` / `new_wallet` / `contract` / `eip7702`) |
| `lookup_nft` | NFT metadata for contract + tokenId: name, description, image HTTP URL, IPFS gateway link, raw JSON (ERC-721 `tokenURI` and ERC-1155 `uri`) |

Backed by the Gexno Web3 Agent API: <https://api.gexno.com/api/web3>

## Use it (remote, nothing to install)

```json
{
  "mcpServers": {
    "gexno-web3": {
      "url": "https://api.gexno.com/mcp"
    }
  }
}
```

Works with Claude Desktop, Cursor, and any MCP client that supports remote servers.

Discovery documents:

- server card — <https://api.gexno.com/.well-known/mcp/server-card.json>
- AI catalog — <https://api.gexno.com/.well-known/ai-catalog.json>
- OpenAPI — <https://api.gexno.com/api/web3/openapi.json>

## Use it (npm, stdio)

```bash
npx -y @gexno/web3-mcp
```

Client config:

```json
{
  "mcpServers": {
    "gexno-web3": {
      "command": "npx",
      "args": ["-y", "@gexno/web3-mcp"]
    }
  }
}
```

Requires Node.js >= 20. The stdio process calls the same public HTTP API.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `GEXNO_API_BASE` | `https://api.gexno.com` | API root, useful for self-hosted instances |
| `GEXNO_TIMEOUT_MS` | `35000` | Per-request timeout; NFT + IPFS resolution can be slow |
| `GEXNO_INTERNAL_TOKEN` | — | Only for self-hosted Gexno APIs that require it. Never commit a value. |

### Programmatic use

```js
import { TOOLS, createApiGet, runTool } from '@gexno/web3-mcp'

const apiGet = createApiGet({ apiBase: 'https://api.gexno.com' })
const wallet = await runTool('lookup_wallet', { address: '0xd8dA...6045' }, apiGet)
```

## Use it (local bundle, MCPB)

Download `gexno-web3.mcpb` from [Releases](https://github.com/JanzenChen/gexno-web3/releases/latest) and open it in Claude Desktop (drag onto the app, or Settings → Extensions).

## What the output looks like

```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "balanceEth": "5.7736",
  "isContract": false,
  "txCount": 5969,
  "risk": "eip7702",
  "eip7702": true,
  "delegation": { "address": "0xd1ea…", "verified": true }
}
```

EIP-7702 delegated EOAs are reported as `risk: "eip7702"` with `isContract: false` — they are still EOAs, they just carry a delegation designator. We parse the `0xef0100` prefix and checksum the delegate address, so a delegated wallet is not misreported as a smart contract.

## Limits & behaviour

- Free tier: short-burst rate limit plus a daily cap per IP; no key required.
- Cached reads: wallet ~60s, NFT metadata ~5min. Repeat lookups are millisecond-scale.
- No signup, no tracking, no wallet connection. Reads only.
- Not an AML/risk score. Heuristics are intentionally simple.
- Errors surface as normal MCP tool errors; the process does not crash.

## Development

```bash
npm install
npm run smoke    # live wallet lookup against the API
npm start        # run the stdio server directly
```

Test against a local API instead of production with `GEXNO_API_BASE=http://127.0.0.1:3000`.

Security posture and residual risks: [HARDENING.md](https://github.com/JanzenChen/gexno-web3/blob/main/HARDENING.md)

## Links

- Website — <https://www.gexno.com>
- Trust report — <https://verifymcp.io/servers/janzenchen-gexno-web3/api>
- Issues — <https://github.com/JanzenChen/gexno-web3/issues>
- License — MIT
