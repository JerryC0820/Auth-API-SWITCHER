# Auth API Switcher

> 面向 Codex / Trae / OpenClaw 场景的桌面授权与空间切换器，集成多 profile 切换、统一授权中心、本地授权主机、更新底座与在线授权后端预留。

<div align="center">
  <img src="public/assets/icons/openai.png" width="120" alt="Auth API Switcher" />
</div>

<div align="center">
  <img src="https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square" />
  <img src="https://img.shields.io/badge/desktop-Electron-1F1F1F?style=flat-square" />
  <img src="https://img.shields.io/badge/frontend-React%2019-149ECA?style=flat-square" />
  <img src="https://img.shields.io/badge/build-Vite%208-646CFF?style=flat-square" />
  <img src="https://img.shields.io/badge/backend-Cloudflare%20Workers-F38020?style=flat-square" />
  <img src="https://img.shields.io/badge/database-D1-0F172A?style=flat-square" />
</div>

<div align="center">
  <a href="#-核心能力">核心能力</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-本地授权主机">本地授权主机</a> ·
  <a href="#-在线授权后端workers--d1">在线授权后端</a> ·
  <a href="#-打包与发布">打包与发布</a> ·
  <a href="#-目录结构">目录结构</a>
</div>

---

## 项目定位

`Auth API Switcher` 是一个桌面端授权与工作空间切换器，当前主要服务于：

- 多份 `auth.json` / 登录态配置的切换与管理
- Codex / Trae / OpenClaw 相关工作流的桌面化操作
- 本地授权码签发与授权中心展示
- 统一更新底座、发布元数据与后续在线授权接口接入

项目当前已经具备完整桌面端壳层、更新底座、本地授权主机与 Cloudflare Workers + D1 后端骨架。  
桌面端默认仍保留本地 mock 授权链路，在线后端正在按小步方式接入。

---

## ✨ 核心能力

### 1. 多 profile 切换与工作空间管理
- 管理多份登录配置与工作目录
- 支持 Codex / Trae 模式切换
- 支持相关路径、状态和卡片信息可视化
- 保留现有切换链路，不强行推翻已稳定逻辑

### 2. 统一授权中心
- 登录 / 注册 / 忘记密码壳层
- 统一授权中心与未授权锁定入口
- 到期时间、剩余时长、设备编号、机器指纹摘要展示
- 邀请码 / 奖励码 / 激活码录入入口

### 3. 本地授权主机
- 独立主机模式与主应用内嵌主机入口
- 本地签发授权码
- 本地主机记录持久化
- 最近签发历史与搜索
- 客户端可用授权码验签接入

### 4. 更新底座
- 静态 manifest 检查
- channel / override 策略
- SHA-256 校验与签名预留
- Windows 安装器更新流程
- 关于页 / 更新弹窗 / 更新状态入口

### 5. 在线授权后端骨架
- Cloudflare Workers + D1 后端已入仓
- 账号 / 授权 / 邀请 / 奖励 / heartbeat API 骨架
- Resend 邮件发送位已预留
- 当前已完成 D1 初始化与迁移

## 🩺 空间探活与自动停用

当前客户端在运行期间会对已保存空间做后台探活，默认每 2 分钟执行一轮，复用现有的 ChatGPT 实时额度拉取链路作为真实认证探针。

- 先做静态校验：检查 `auth.json` 是否存在、是否可解析、是否包含 token 字段
- 再做动态探活：只要任意一次探活成功，空间就保持可用
- 不会因为单次失败就直接判死：只有连续 2 次以上明确命中 `401 / unauthorized / login required / refresh failed / token invalid` 这类认证失效信号，才会自动停用
- 如果多次失败主要是 `timeout / connection reset / SSL / proxy / DNS / network unreachable` 这类网络问题，只会视为网络不稳定，不会自动停用
- 不确定错误会保留为 `unknown`，避免误杀正常空间

命中自动停用后，以下界面会同步灰化并给出中性提示：

- 主窗口空间卡片
- 托盘悬浮卡片
- 悬浮窗卡片 / 小球

同时主界面会弹出“当前空间已自动停用”的确认框，并提供“打开 ChatGPT 查看”的直接入口。

### 如何验证

1. 保持客户端运行
2. 导入一张有效空间卡片后，把对应 `auth.json` 替换成过期或明显无效的认证
3. 等待一轮后台探活，或手动点击界面里的额度刷新
4. 观察主卡片、托盘卡片、悬浮窗是否变灰，并出现自动停用提示

### 为什么不把单次失败直接判成 `auth_dead`

真实环境里经常会遇到短时超时、代理抖动、DNS 波动、证书问题或服务端瞬时异常。单次失败就判停，误伤率太高，所以这里只在连续多次、且明确符合认证失效特征时才自动停用。

### 为什么共享同一份 `auth.json` 可能导致误判

如果多台机器长期并发共用同一份 `auth.json`，A 机刷新 token 后，B 机可能还拿着旧 token，随后就会看到 `401`。这时候看起来像“空间被停用”，但本质上可能只是凭证轮换冲突。这个场景下，建议尽量避免长期多机并发共享同一份认证缓存。

---

## 🚀 快速开始

### 环境要求
- Node.js 20+
- npm 10+
- Windows 10 / 11

### 安装依赖
```bash
npm install
```

### 启动桌面端
```bash
npm run dev
```

### 启动独立授权主机
```bash
npm run dev:host
```

或直接双击：

```text
start-license-host.bat
```

---

## 🔐 本地授权主机

当前仓库已内置本地授权主机模式，适合你在本机作为“授权主机端”使用，再把授权码发给客户设备。

主机能力包括：
- 选择授权时长（1 天 / 7 天 / 15 天 / 30 天 / 180 天 / 永久）
- 填写目标设备名称、设备编号、机器指纹摘要
- 生成签名授权码
- 查看最近签发记录
- 搜索签发历史

独立主机入口：

```bash
npm run dev:host
```

或：

```text
cloudflare-auth-helper.bat
```

> 注意：本地主机与主应用当前共用同一套本地授权历史目录，不会再分裂成两份记录。

---

## ☁️ 在线授权后端（Workers + D1）

后端代码位于：

```text
workers/auth-api/
```

已提供的命令：

```bash
npm run cf:auth:whoami
npm run cf:auth:d1:create
npm run cf:auth:d1:migrate:local
npm run cf:auth:d1:migrate:remote
npm run cf:auth:dev
npm run cf:auth:deploy
```

### 当前后端状态
- Wrangler 已接入
- D1 数据库已创建并完成首轮迁移
- `wrangler.jsonc` 已绑定真实 `database_id`
- `.dev.vars` 已可本地填写
- Resend 邮件配置位已预留

### 本地配置
复制并填写：

```text
workers/auth-api/.dev.vars
```

如果后续要接入“忘记密码邮件发送”，再额外准备：
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

当前这两个值不是客户端登录、注册、激活码、本地授权码或云端 heartbeat 的前置条件。

配好后可直接本地运行完整邮件链路；如果暂时不做邮件找回，也可以先跳过：

```bash
npm run cf:auth:dev
```

也可以使用根目录向导：

```text
cloudflare-auth-helper.bat
```

---

## 📦 打包与发布

### 构建
```bash
npm run build
```

### Windows 安装包
```bash
npm run dist:win
```

### 目录版
```bash
npm run dist:dir
```

### 生成发布 manifest
```bash
npm run release:manifest
```

### 生成内测 manifest
```bash
npm run release:manifest:beta
```

发布约定：
- 正式版只更新 `release-manifests/stable/latest.json` 与 `release-notes/x.x.x.md`
- 内测版只更新 `release-manifests/beta/latest_test.json` 与 `release-notes/x.x.x_test.md`
- 指定测试机器可通过 `update-channel.override.json` 或内测授权码切到内测通道
- GitHub / Gitee 源码仓保存完整源码，GitHub / Gitee 发布仓只保留发布内容

当前仓库已经完成：
- Windows 打包链
- 图标 / 安装器图标接入
- release manifest 输出
- `release-artifacts` / `release-manifests` / `release-notes` 目录规范

当前仍属于后续项：
- GitHub Releases / Gitee 自动发布
- macOS 真机签名与 notarization
- 客户端切换到真实在线授权服务

### 安装与卸载行为
- Windows 安装包使用 NSIS assisted installer
- 卸载时会弹出“是否保留本地配置、授权记录和 Codex 切换文件”
- 勾选保留时：不会删除 `%APPDATA%\\codex-workspace-switcher`、本地授权主机记录和当前 `profilesRootDir`
- 取消勾选时：会一并清理本地配置、授权缓存、本地主机记录，以及当前记录的 profile 根目录

---

## 🗂️ 目录结构

```text
electron/            Electron 主进程、preload、更新、本地授权主机逻辑
src/                 React 渲染层与桌面 UI
shared/              主进程 / 渲染层共享类型与 IPC 契约
workers/auth-api/    Cloudflare Workers + D1 在线授权后端
scripts/             构建、打包、发布、开发启动脚本
build/               打包图标与安装器资源
public/              公共前端资源
records/             项目任务记录
release-manifests/   发布 manifest 输出
release-notes/       更新说明输出
```

---

## 🧭 当前状态说明

当前项目不是一个“只有壳没有逻辑”的半成品，已经具备：
- 桌面端主界面与用户中心
- 统一授权中心
- 本地授权主机
- 更新底座
- 打包链
- Cloudflare Workers + D1 后端骨架

但也没有虚假宣称“全部联调完成”。  
当前还在继续推进的主线是：

1. 把桌面端从本地 mock 授权层逐步切到真实在线后端
2. 补齐真实邮箱找回 / 邀请 / 奖励发放链路
3. 完善自动发布与仓库交付流程

### 当前交付状态

| 模块 | 当前状态 | 说明 |
| --- | --- | --- |
| 主客户端 UI | 已完成主壳层 | 主界面、用户中心、授权中心、帮助/关于已可用 |
| 本地授权主机 | 可用 | 支持独立启动、授权码签发、最近记录与搜索 |
| 本地授权码验签 | 可用 | 客户端可录入本地主机签发的授权码 |
| 云端授权后端 | 已部署骨架 | Cloudflare Workers + D1 已创建并完成迁移 |
| 客户端云端授权流 | 进行中 | 当前已支持远端优先、不可达时回退本地 |
| 忘记密码邮件 | 未完成 | 当前客户端显示“敬请期待”，Resend 留待后续接入 |
| 更新底座 | 已接入骨架 | 但线上 manifest 公钥 / 签名还未正式配置 |
| Windows 打包 | 可用 | 已可输出安装包、目录版和 release manifest |
| macOS 打包 | 预留 | 仍需在 macOS 真机完成签名与 notarization |

### 云端授权现状
- 开发态默认优先连接本地 Worker：`http://127.0.0.1:8787`
- 打包版默认指向 Cloudflare Workers 线上地址
- 当云端不可达时，客户端不会直接崩掉，而是回退到本地授权壳层
- 当前“忘记密码”不会发送邮件，只会提示“当前未配置当前功能，敬请期待。”

---

## 📜 说明

- 本仓库当前以源码为主
- 构建产物与运行时敏感配置不直接提交
- `workers/auth-api/.dev.vars` 不应提交真实密钥
