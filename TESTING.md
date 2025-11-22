# 测试方法说明

由于服务器环境可能无法打开浏览器界面，本项目提供了多种命令行测试方法。

## 测试方法对比

| 方法 | 用途 | 是否需要浏览器 | 推荐场景 |
|------|------|---------------|---------|
| MCP Inspector | 可视化测试 MCP 服务器 | ✅ 需要 | 本地开发环境 |
| `test-server.js` | 命令行测试 MCP 服务器 | ❌ 不需要 | **服务器环境推荐** |
| `test-api-direct.js` | 直接测试 Binance API | ❌ 不需要 | 网络诊断 |

## 详细说明

### 1. test-server.js - MCP 服务器测试

**功能：**
- 启动 MCP 服务器进程
- 通过 stdio 发送 MCP 协议消息
- 测试工具列表功能
- 测试价格查询功能（BTC、ETH、SOL）
- 显示详细的请求和响应

**使用方法：**
```bash
npm run build  # 先编译
npm test       # 运行测试
# 或
node test/test-server.js
```

**输出示例：**
```
================================================================================
MCP 服务器测试（命令行模式）
================================================================================

1. 测试列出工具...
[发送] tools/list: {...}
[响应] ID 1:
可用工具:
  - get_price: 获取 Binance 实时价格

2. 测试获取 BTC 价格...
[发送] tools/call: {...}
[响应] ID 2:
价格信息:
  交易对: BTCUSDT
  价格: 90105.25 USDT
  时间戳: 1703123456789 (2023-12-21T10:30:56.789Z)
```

### 2. test-api-direct.js - 直接 API 测试

**功能：**
- 绕过 MCP 服务器，直接调用 Binance API
- 测试网络连接
- 验证 API 可用性
- 测量 API 响应延迟

**使用方法：**
```bash
node test/test-api-direct.js
```

**输出示例：**
```
================================================================================
直接测试 Binance API
================================================================================

测试 BTCUSDT...
URL: https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT
  ✅ 成功 (延迟: 123ms)
  价格: 90105.25 BTCUSDT
```

**适用场景：**
- 诊断网络连接问题
- 验证防火墙/代理设置
- 测试 API 响应速度

### 3. MCP Inspector（可选）

如果环境支持浏览器，可以使用 MCP Inspector：

```bash
npx @modelcontextprotocol/inspector node dist/server.js
```

这会打开一个 Web 界面，可以：
- 可视化查看工具列表
- 交互式测试工具调用
- 查看详细的协议消息

## 故障排除

### 测试脚本无响应

1. **检查编译：**
   ```bash
   ls dist/server.js
   ```

2. **检查网络：**
   ```bash
   node test/test-api-direct.js
   ```

3. **查看服务器日志：**
   测试脚本会输出服务器的 stderr 日志，查看是否有错误信息。

### API 连接失败

1. **测试网络连接：**
   ```bash
   curl https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT
   ```

2. **检查代理设置：**
   如果服务器需要代理，可能需要配置环境变量：
   ```bash
   export HTTP_PROXY=http://proxy.example.com:8080
   export HTTPS_PROXY=http://proxy.example.com:8080
   ```

3. **检查防火墙：**
   确保可以访问 `api.binance.com:443`

## 测试流程建议

1. **首次测试：** 运行 `test-api-direct.js` 验证网络连接
2. **功能测试：** 运行 `test-server.js` 测试 MCP 服务器
3. **集成测试：** 在实际 MCP 客户端中配置并使用

