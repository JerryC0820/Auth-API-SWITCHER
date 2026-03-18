# Cloudflare Workers + D1 Auth API
# Cloudflare Workers + D1 在线授权后端

## Scope
## 范围

This folder contains the first real backend foundation for account, license, invite, reward, and password-reset APIs.
这个目录承载第一批真实后端基础，覆盖账号、授权、邀请、奖励和密码重置 API。

The desktop app is still on the local mock auth layer for now. This worker is prepared in parallel so the client can switch later in small steps.
桌面应用当前仍在使用本地 mock 授权层。这套 Worker 先并行准备好，后续客户端可以按小步切换。

## Installed tooling
## 已安装工具

Wrangler is already installed in the root repository as a devDependency.
Wrangler 已经作为 devDependency 安装到当前仓库根目录。

Check version with:
查看版本命令：

```bash
npx wrangler --version
```

## Login
## 登录 Cloudflare

Official login flow:
官方登录流程：

```bash
npx wrangler login
```

After browser authorization, verify with:
浏览器授权后，用下面命令确认：

```bash
npx wrangler whoami
```

If you do not want browser login later in CI, you can use API token mode instead.
如果以后不想在 CI 里走浏览器登录，也可以改用 API Token 模式。

## D1 setup
## D1 数据库配置

Create the database:
先创建数据库：

```bash
npx wrangler d1 create auth-api-switcher-db
```

Then copy the returned `database_id` into `workers/auth-api/wrangler.jsonc`.
然后把命令返回的 `database_id` 填进 `workers/auth-api/wrangler.jsonc`。

Apply migrations locally:
本地应用迁移：

```bash
npx wrangler d1 migrations apply auth-api-switcher-db --local --config workers/auth-api/wrangler.jsonc
```

Apply migrations remotely:
远端应用迁移：

```bash
npx wrangler d1 migrations apply auth-api-switcher-db --remote --config workers/auth-api/wrangler.jsonc
```

## Local secrets
## 本地密钥配置

Create `.dev.vars` from `.dev.vars.example`.
先根据 `.dev.vars.example` 创建 `.dev.vars`。

Minimum local secrets:
本地最小密钥：

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO` (optional)

Production secrets should be written through Wrangler:
生产环境密钥建议通过 Wrangler 写入：

```bash
npx wrangler secret put RESEND_API_KEY --config workers/auth-api/wrangler.jsonc
npx wrangler secret put RESEND_FROM_EMAIL --config workers/auth-api/wrangler.jsonc
npx wrangler secret put RESEND_REPLY_TO --config workers/auth-api/wrangler.jsonc
```

## Resend setup
## Resend 配置

Recommended provider: Resend.
推荐邮件服务：Resend。

Official steps:
正式步骤：

1. Create a Resend account.
1. 注册 Resend 账号。
2. Create an API key.
2. 创建 API Key。
3. Verify a sending domain or at least a sender mailbox.
3. 验证发送域名，至少先验证一个发件邮箱。
4. Put the API key into `RESEND_API_KEY`.
4. 把 API Key 写入 `RESEND_API_KEY`。
5. Put a valid sender such as `Auth API Switcher <no-reply@your-domain.com>` into `RESEND_FROM_EMAIL`.
5. 把合法发件人，例如 `Auth API Switcher <no-reply@your-domain.com>`，写入 `RESEND_FROM_EMAIL`。

## Run locally
## 本地运行

Start the worker locally:
本地启动 Worker：

```bash
npm run cf:auth:dev
```

Health check:
健康检查：

```bash
curl http://127.0.0.1:8787/api/health
```

## Current API surface
## 当前 API 范围

Implemented routes:
已实现路由：

- `GET /api/health`
- `POST /api/bootstrap`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset/request`
- `GET /api/auth/state`
- `GET /api/account/profile`
- `GET /api/license/summary`
- `POST /api/license/activate`
- `POST /api/invite/request`
- `POST /api/invite/redeem`
- `POST /api/invite/claim`
- `POST /api/reward/apply`
- `GET /api/invite/records`
- `POST /api/heartbeat`

## What is still not switched
## 当前还没有切换的部分

The Electron client still calls the local mock auth service.
Electron 客户端目前仍然调用本地 mock 授权服务。

The next client-side step is to add a remote auth provider switch instead of removing the current local flow directly.
客户端下一步应该是增加“远端授权提供器”切换，而不是直接把现有本地链路硬删掉。
