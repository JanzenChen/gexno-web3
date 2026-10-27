# gexno-web3 — MCP server for Ethereum wallet & NFT lookups

Free, no-signup on-chain lookups for AI agents. Two tools today:

| Tool | What it returns |
|---|---|
| `lookup_wallet` | ETH balance, contract flag, outbound tx count, simple risk heuristics (`ok` / `new_wallet` / `contract` / `eip7702`) |
| `lookup_nft` | NFT metadata for contract + tokenId: name, description, image HTTP URL, IPFS gateway link, raw JSON (ERC-721 `tokenURI` and ERC-1155 `uri`) |

Backed by the Gexno Web3 Agent API: <https://api.gexno.com/api/web3>

## Use it (remote, nothing to install)

Streamable HTTP endpoint, no signup, no API key:

```
https://api.gexno.com/mcp
```

**Claude Desktop / Cursor / any MCP client with remote server support**

```json
{
  "mcpServers": {
    "gexno-web3": {
      "url": "https://api.gexno.com/mcp"
    }
  }
}
```

**Official MCP Registry name**

```
io.github.JanzenChen/gexno-web3
```

Discovery documents:

- server card — <https://api.gexno.com/.well-known/mcp/server-card.json>
- AI catalog — <https://api.gexno.com/.well-known/ai-catalog.json>
- OpenAPI — <https://api.gexno.com/api/web3/openapi.json>

## Use it (local bundle, stdio)

Download `gexno-web3.mcpb` from [Releases](https://github.com/JanzenChen/gexno-web3/releases/latest) and open it in Claude Desktop (drag onto the app, or Settings → Extensions). Requires Node.js >= 20.

Prefer running from source?

```bash
git clone https://github.com/JanzenChen/gexno-web3.git
cd gexno-web3
npm install
node src/index.js     # speaks MCP over stdio
```

Example client config (see `claude-desktop.example.json` / `cursor-mcp.example.json`):

```json
{
  "mcpServers": {
    "gexno-web3": {
      "command": "node",
      "args": ["/absolute/path/gexno-web3/src/index.js"],
      "env": { "GEXNO_API_BASE": "https://api.gexno.com" }
    }
  }
}
```

> Note: the stdio bundle calls the same public HTTP API. Only set `GEXNO_INTERNAL_TOKEN` if you run your own Gexno server — never commit it.

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

Security posture and residual risks are documented in [HARDENING.md](HARDENING.md).

## Links

- Website — <https://www.gexno.com>
- Trust report — <https://verifymcp.io/servers/janzenchen-gexno-web3/api>
- Issues — <https://github.com/JanzenChen/gexno-web3/issues>
- License — MIT
