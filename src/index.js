#!/usr/bin/env node
/**
 * Gexno Web3 MCP — stdio server.
 * 通过 HTTP 调用本地/远程 Fastify API（默认 http://127.0.0.1:3000）。
 *
 * 注意：stdio 传输下不要向 stdout 打印日志（会破坏 JSON-RPC）。
 *
 * 环境变量：
 *   GEXNO_API_BASE          API 根（无尾斜杠）
 *   GEXNO_INTERNAL_TOKEN    可选，对应 WEB3_INTERNAL_TOKEN
 *   GEXNO_TIMEOUT_MS        单次请求超时，默认 35000
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { SERVER_INFO, TOOLS, createApiGet, runTool } from './lib.js'

const apiGet = createApiGet({
  apiBase: process.env.GEXNO_API_BASE,
  internalToken: process.env.GEXNO_INTERNAL_TOKEN ?? process.env.WEB3_INTERNAL_TOKEN,
  timeoutMs: Number(process.env.GEXNO_TIMEOUT_MS),
})

const server = new Server(SERVER_INFO, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name
  const args = request.params.arguments ?? {}
  try {
    if (!TOOLS.some((t) => t.name === name)) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      }
    }
    const data = await runTool(name, args, apiGet)
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  } catch (err) {
    return {
      content: [{ type: 'text', text: err?.message || String(err) }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
