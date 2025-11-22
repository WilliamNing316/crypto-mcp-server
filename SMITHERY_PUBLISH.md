# 发布到 Smithery 平台指南

## 准备工作

### 1. 创建 GitHub 仓库

1. 在 GitHub 上创建一个新仓库，命名为 `crypto-mcp-server`
2. 将本地代码推送到 GitHub：

```bash
# 初始化 git（如果还没有）
git init

# 添加远程仓库（替换 yourusername 为你的 GitHub 用户名）
git remote add origin https://github.com/yourusername/crypto-mcp-server.git

# 添加文件
git add .

# 提交
git commit -m "Initial commit: Crypto MCP Server"

# 推送到 GitHub
git push -u origin main
```

### 2. 更新配置文件

在发布前，需要更新以下文件中的信息：

#### `smithery.yaml`
- 将 `author: Your Name` 改为你的名字
- 将 `homepage: https://github.com/yourusername/crypto-mcp-server` 中的 `yourusername` 改为你的 GitHub 用户名

#### `package.json`
- 添加 `author` 字段（如果还没有）
- 确保 `repository` 字段指向你的 GitHub 仓库

### 3. 确保所有必需文件存在

发布前检查以下文件：
- ✅ `README.md` - 项目说明文档
- ✅ `LICENSE` - MIT 许可证
- ✅ `Dockerfile` - Docker 构建配置
- ✅ `package.json` - Node.js 项目配置
- ✅ `smithery.yaml` - Smithery 配置文件（必需）
- ✅ `src/server.ts` - MCP 服务器主文件
- ✅ `tsconfig.json` - TypeScript 配置

## 发布步骤

### 1. 访问 Smithery 平台

打开浏览器，访问 https://smithery.ai/

### 2. 登录

使用 GitHub 账号登录 Smithery

### 3. 发布服务器

1. 点击页面上的 **"Publish Server"** 按钮
2. 输入你的 GitHub 仓库 URL：
   ```
   https://github.com/yourusername/crypto-mcp-server
   ```
   （将 `yourusername` 替换为你的 GitHub 用户名）
3. 点击提交，等待发布完成

### 4. 验证发布

发布成功后，你会看到：
- 服务器名称：Crypto MCP Server
- 唯一标识符：@yourusername/crypto-mcp-server
- 5 个工具列表
- 连接信息和使用示例

## 使用已发布的服务器

### 方式 1：通过 Smithery CLI

```bash
# 安装 Smithery CLI
npm install -g @smithery/cli

# 安装你的服务器
smithery install crypto-mcp-server
```

### 方式 2：在 Claude Desktop 中配置

编辑 Claude Desktop 配置文件（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "crypto": {
      "command": "smithery",
      "args": ["run", "crypto-mcp-server"]
    }
  }
}
```

### 方式 3：直接使用 Docker

```bash
# 拉取镜像
docker pull smithery/crypto-mcp-server

# 运行
docker run -p 8081:8081 smithery/crypto-mcp-server
```

## 注意事项

1. **首次发布**：可能需要几分钟时间进行构建和验证
2. **版本更新**：修改 `smithery.yaml` 中的 `version` 字段后重新发布
3. **Docker 构建**：确保 Dockerfile 正确，Smithery 会自动构建 Docker 镜像
4. **端口**：Smithery 使用 8081 端口，已在 Dockerfile 中配置
5. **健康检查**：Dockerfile 包含健康检查，确保服务正常运行

## 故障排查

### 发布失败

1. 检查 GitHub 仓库是否为公开（Public）
2. 确认所有必需文件都在仓库中
3. 检查 `smithery.yaml` 格式是否正确
4. 查看 Smithery 平台的错误信息

### Docker 构建失败

1. 本地测试 Dockerfile：
   ```bash
   docker build -t crypto-mcp-server .
   docker run -p 8081:8081 crypto-mcp-server
   ```
2. 检查 Node.js 版本兼容性
3. 确认所有依赖都在 `package.json` 中

### 工具无法调用

1. 确认服务器启动正常
2. 检查 MCP 协议实现是否正确
3. 查看服务器日志

## 更新服务器

当需要更新服务器时：

1. 修改代码
2. 更新 `smithery.yaml` 中的 `version`（遵循语义化版本，如 1.0.1）
3. 提交并推送到 GitHub
4. 在 Smithery 平台重新发布

## 参考资源

- [Smithery 官方文档](https://smithery.ai/docs)
- [MCP 协议文档](https://modelcontextprotocol.io)
- [GitHub 仓库示例](https://github.com/modelcontextprotocol/servers)

