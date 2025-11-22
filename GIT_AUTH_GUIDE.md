# Git 认证问题解决方案

## 问题
GitHub 不再支持密码认证，需要使用 Personal Access Token 或 SSH 密钥。

## 解决方案 1：使用 Personal Access Token（推荐）

### 步骤 1：创建 Personal Access Token

1. 访问 GitHub：https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置：
   - **Note**: `crypto-mcp-server` (描述用途)
   - **Expiration**: 选择过期时间（建议 90 天或 No expiration）
   - **Scopes**: 勾选 `repo`（完整仓库访问权限）
4. 点击 "Generate token"
5. **重要**：复制生成的 token（只显示一次！）

### 步骤 2：使用 Token 推送

```bash
# 方法 1：在推送时输入 token 作为密码
cd /mnt/trade_mcp
git push -u origin main
# Username: WilliamNing316
# Password: <粘贴你的 token>
```

或者使用 credential helper 保存：

```bash
# 方法 2：使用 credential helper（推荐）
git config --global credential.helper store

# 然后推送，输入一次后会自动保存
git push -u origin main
# Username: WilliamNing316
# Password: <粘贴你的 token>
```

### 步骤 3：验证

```bash
git push -u origin main
# 应该不再要求输入密码
```

---

## 解决方案 2：使用 SSH 密钥（更安全）

### 步骤 1：检查是否已有 SSH 密钥

```bash
ls -al ~/.ssh
# 查找 id_rsa.pub 或 id_ed25519.pub
```

### 步骤 2：如果没有，生成 SSH 密钥

```bash
ssh-keygen -t ed25519 -C "hua.zhang.2106108@gmail.com"
# 按回车使用默认路径
# 可以设置密码（可选，更安全）
```

### 步骤 3：添加 SSH 密钥到 GitHub

```bash
# 复制公钥
cat ~/.ssh/id_ed25519.pub
# 或
cat ~/.ssh/id_rsa.pub
```

然后：
1. 访问 GitHub：https://github.com/settings/keys
2. 点击 "New SSH key"
3. **Title**: `EC2 Server` (或任何描述性名称)
4. **Key**: 粘贴刚才复制的公钥
5. 点击 "Add SSH key"

### 步骤 4：更改远程仓库 URL 为 SSH

```bash
cd /mnt/trade_mcp
git remote set-url origin git@github.com:WilliamNing316/crypto-mcp-server.git
git remote -v  # 验证
```

### 步骤 5：测试 SSH 连接

```bash
ssh -T git@github.com
# 应该看到: Hi WilliamNing316! You've successfully authenticated...
```

### 步骤 6：推送

```bash
git push -u origin main
# 不再需要输入密码
```

---

## 快速解决（推荐方案 1）

如果你想要快速解决，使用 Personal Access Token：

```bash
# 1. 创建 token（在浏览器中）
# https://github.com/settings/tokens

# 2. 配置 credential helper
git config --global credential.helper store

# 3. 推送（输入一次 token）
git push -u origin main
# Username: WilliamNing316
# Password: <你的 token>
```

---

## 当前状态

✅ 已修复仓库 URL 拼写错误：`crypto-mcp-server`
✅ 远程仓库 URL 已更新为正确地址

现在只需要解决认证问题即可推送。

