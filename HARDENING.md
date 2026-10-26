# Web3 API 防护加固说明

代码侧已实现：SSRF 防护（含 connect 层 lookup 过滤）、响应体积限制、上游并发闸（整次 NFT 查询不嵌套占槽）、内外限流、访问日志、IPFS 网关回退与路径校验、缓存 TTL 可配、tokenId 上限、对外隐藏 RPC URL。

## 残留风险（已知、可接受）

- Redis 宕机时限流 fail-open（与站内其它接口一致）
- DNS 重绑定：已在 assert + undici lookup 双重过滤，极端 TOCTOU 窗口仍理论上存在
- 公共 IPFS 网关自身的可用性/内容策略不在本服务控制范围
- 对「同时含公网+私网 A/AAAA」的域名直接拒绝（fail-closed）

## 并发相关环境变量

- `WEB3_RPC_CONCURRENCY`（默认 20）：读链
- `WEB3_META_CONCURRENCY`（默认 20）：拉元数据 HTTP

## Cloudflare WAF / Rate Limiting（上线后在面板配置）

对 `api.gexno.com`（及走同源反代的 `www`）建议叠加：

1. **Rate limiting 规则**
   - 匹配：`http.request.uri.path contains "/api/web3/"`
   - 阈值示例：单 IP 120 请求 / 1 分钟（比边缘 nginx 略宽，作第二层）
   - 动作：Block 或 Managed Challenge

2. **WAF 自定义规则（可选）**
   - 阻断已知恶意 UA 空扫：`http.user_agent eq ""` 且 path 匹配 `/api/web3/`
   - 对异常超长 query 拦截（`http.request.uri` 长度）

3. **Bot Fight / Bot Management**
   - 若开启，确认不会误伤合法 AI Agent；必要时对 `/api/web3/` 放行带明确 UA 的自动化客户端，或仅对浏览器流量挑战

4. **不要**把 `WEB3_INTERNAL_TOKEN` 写进任何前端或公开文档

## 相关环境变量

见仓库根目录 `.env.example` 中 `WEB3_*` / `IPFS_*` 段。
