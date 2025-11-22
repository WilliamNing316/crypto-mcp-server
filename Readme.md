# Crypto MCP Server

这是一个使用 TypeScript 编写的加密货币 Model Context Protocol (MCP) 服务器，通过 Binance 公共 API 提供实时行情查询能力。
你可以将其接入 ChatGPT、Claude Desktop、Strands 或任何支持 MCP 的客户端，让 AI 直接调用加密货币工具。

## 🔧 功能概览

当前实现了 **5 个强大的工具**，覆盖从基础价格查询到深度市场分析：

### ① get_price — 获取实时价格

获取指定交易对的实时价格。

**输入参数：**
- `symbol`：交易对符号，如 BTC、ETH、SOL（不区分大小写）
- `quote`：报价货币，如 USDT、BUSD（默认 USDT）

**输出：**
- 实时价格
- 交易对符号
- 时间戳（Unix 和 ISO 格式）

**使用示例：**
```
"BTC 现在多少钱？"
→ 调用 get_price({ symbol: "BTC", quote: "USDT" })
```

---

### ② get_24h_stats — 获取24小时统计数据

获取交易对过去24小时的完整统计数据，包括涨跌幅、成交量、最高/最低价等。

**输入参数：**
- `symbol`：交易对符号（如 BTC、ETH）
- `quote`：报价货币（默认 USDT）

**输出：**
- 价格变化（绝对值和百分比）
- 当前价格、开盘价、最高价、最低价
- 24小时成交量、成交额
- 加权平均价
- 买卖盘价格

**使用示例：**
```
"ETH 今天涨了多少？"
→ 调用 get_24h_stats({ symbol: "ETH" })
```

---

### ③ get_ohlcv — 获取K线数据

获取技术分析所需的K线（蜡烛图）数据，支持多种时间间隔。

**输入参数：**
- `symbol`：交易对符号
- `quote`：报价货币（默认 USDT）
- `interval`：K线时间间隔（1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M，默认 1h）
- `limit`：返回的K线数量（1-1000，默认 500）

**输出：**
- 格式化的K线数组，每条包含：
  - 开盘时间、收盘时间
  - 开盘价、最高价、最低价、收盘价
  - 成交量、成交额
  - 成交笔数、主动买入量等

**使用示例：**
```
"给我 BTC 最近10小时的K线数据"
→ 调用 get_ohlcv({ symbol: "BTC", interval: "1h", limit: 10 })
```

---

### ④ get_symbol_overview — 智能综合概览 ⭐

**智能组合工具**，整合多个数据源，提供交易对的全面分析。

**输入参数：**
- `symbol`：交易对符号
- `quote`：报价货币（默认 USDT）

**输出：**
- **当前价格**：实时价格
- **24小时涨跌**：价格变化和百分比
- **最高/最低价**：24小时价格区间
- **趋势判断**：
  - 趋势类型：上涨/下跌/盘整
  - 趋势强度：-1 到 1 的数值
  - 趋势描述：基于K线分析的详细说明
  - 移动平均线分析
  - RSI 指标
- **交易量分析**：
  - 交易量等级：高/中/低
  - 交易量描述

**使用示例：**
```
"BTC 今天怎么样？属于上涨还是盘整？"
→ 调用 get_symbol_overview({ symbol: "BTC" })
```

这个工具特别适合回答综合性的市场分析问题，模型可以基于返回的数据生成自然语言回答。

---

### ⑤ get_order_book — 获取交易深度（订单簿）

查看市场流动性、深度和买卖盘强度，适合做交易分析。

**输入参数：**
- `symbol`：交易对符号
- `quote`：报价货币（默认 USDT）
- `limit`：订单深度数量（5-5000，默认 100）

**输出：**
- **最佳买卖价**：当前最优买价和卖价
- **价差分析**：买卖价差（绝对值和百分比）
- **流动性分析**：
  - 买盘总量、卖盘总量
  - 总流动性
  - 买卖盘比例
  - 买盘强度（强/弱/平衡）
- **前10档买卖盘明细**：价格、数量、总额

**使用示例：**
```
"BTC 的买卖盘深度怎么样？"
→ 调用 get_order_book({ symbol: "BTC", limit: 20 })
```

---

## 📡 数据源说明

本项目使用 **Binance 公开 REST API**：

- **实时价格**：`GET /api/v3/ticker/price`
- **24小时统计**：`GET /api/v3/ticker/24hr`
- **K线数据**：`GET /api/v3/klines`
- **订单簿**：`GET /api/v3/depth`

**无需 API Key**，无限制地调用基础行情数据。

---

## 📦 环境要求

- Node.js 18+
- npm（或 yarn / pnpm）
- 允许访问 Binance API（网络连接）

---

## 🚀 安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 编译项目

```bash
npm run build
```

### 3. 运行服务器

```bash
npm start
```

### 4. 开发模式（热重载）

```bash
npm run dev
```

---

## 🧠 工作原理

1. **MCP 客户端启动该服务器**（通过 stdio 通信）
2. **用户问模型**："现在 BTC 价格多少？"
3. **模型判断** → 调用 MCP 工具：`get_price`
4. **MCP 服务器访问 Binance API** → 返回价格
5. **模型用结果生成自然语言回答**

---

## ⚙️ MCP 客户端配置示例

### Claude Desktop 配置

编辑 `claude_desktop_config.json`（macOS 路径：`~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "crypto-mcp": {
      "command": "node",
      "args": ["/path/to/trade_mcp/dist/server.js"],
      "transport": "stdio"
    }
  }
}
```

### 其他 MCP 客户端

根据客户端文档配置，确保：
- `command`: `node`
- `args`: `["dist/server.js"]`（使用绝对路径）
- `transport`: `stdio`

配置好后即可在客户端中直接使用所有工具。

---

## 🔍 调试方式

### 方法 1: MCP Inspector（需要浏览器界面）

如果环境支持浏览器，推荐使用 MCP Inspector：

```bash
npx @modelcontextprotocol/inspector node dist/server.js
```

你可以：
- 查看当前服务器暴露的所有工具
- 单独测试每个工具调用
- 查看请求 / 响应细节

### 方法 2: 命令行测试脚本（服务器环境推荐）

如果服务器环境无法打开浏览器，可以使用命令行测试脚本：

```bash
# 1. 先编译项目
npm run build

# 2. 运行测试脚本（测试 MCP 服务器）
npm test
# 或
node test/test-server.js
```

测试脚本会：
- 启动 MCP 服务器
- 测试列出工具功能
- 测试所有5个工具的功能
- 显示详细的请求和响应信息

### 方法 3: 直接测试 Binance API

验证网络连接和 API 可用性：

```bash
node test/test-api-direct.js
```

这会直接调用 Binance API，不经过 MCP 服务器，用于诊断网络问题。

---

## 🎯 使用场景示例

### 场景 1: 简单价格查询
```
用户："BTC 现在多少钱？"
模型：调用 get_price → "BTC 当前价格为 $92,026.49 USDT"
```

### 场景 2: 市场分析
```
用户："BTC 今天怎么样？属于上涨还是盘整？"
模型：调用 get_symbol_overview → 
"BTC 今天表现良好，属于上涨趋势。当前价格 $92,028.73，
24小时涨幅 0.975%，最高价 $93,160，最低价 $88,608。
根据K线分析，呈现明显上涨趋势，交易量很高，市场活跃。"
```

### 场景 3: 技术分析
```
用户："给我 ETH 最近10小时的K线数据"
模型：调用 get_ohlcv({ symbol: "ETH", interval: "1h", limit: 10 })
→ 返回详细的K线数据供分析
```

### 场景 4: 流动性分析
```
用户："BTC 的买卖盘深度怎么样？"
模型：调用 get_order_book → 
"BTC 当前最佳买价 $92,026.49，最佳卖价 $92,026.50，
价差仅 0.0001%，流动性很好。买盘总量 $XXX，卖盘总量 $XXX，
买卖盘比例平衡，市场深度充足。"
```

---

## ➕ 如何扩展更多工具

你可以轻松添加更多 Binance API 工具，例如：

- **历史数据查询**：获取更长时间范围的数据
- **技术指标计算**：MACD、布林带、KDJ 等
- **多交易所支持**：整合 OKX、Coinbase 等
- **价格提醒**：监控价格变化
- **交易功能**（需要 API Key）：下单、查询订单等

参考现有工具的实现方式，在 `src/server.ts` 中添加新的 Schema 和函数即可。

---

## ⚠️ 注意事项

1. **API 速率限制**：Binance 公共 API 有速率限制（当前非常宽松），如需高频请求建议添加缓存机制。

2. **数据格式**：MCP 工具返回时应保持 JSON 格式，AI 才能稳定理解。

3. **交易功能**：若要扩展版本到交易/下单功能，需要使用 Binance API Key（本项目默认未涉及资金操作）。

4. **网络连接**：确保服务器可以访问 `api.binance.com`。

5. **错误处理**：所有工具都包含完善的错误处理，会返回友好的错误信息。

---

## 📊 技术栈

- **TypeScript**：类型安全的开发体验
- **Zod**：强大的参数验证
- **MCP SDK**：Model Context Protocol 官方 SDK
- **Binance API**：可靠的加密货币数据源

---

## 📝 更新日志

### v1.0.0
- ✅ 实现 5 个核心工具
- ✅ 智能趋势分析（移动平均线、RSI）
- ✅ 完整的测试覆盖
- ✅ 中文友好的文档和描述

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License
