# 可复用软件框架说明

这不是当前软件的完整 PRD。

这份文档的目标是给其他窗口、其他项目、或者以后要做的新软件直接复用，快速理解这套软件是怎么搭起来的，需要哪些模块、哪些技术、哪些云端能力，以及如果把云端存储切到 MySQL 应该怎么落地。

## 1. 适用的软件类型

这套框架适合下面这类软件：

- 有桌面客户端，需要安装包、自动更新、托盘、悬浮窗、窗口管理
- 有账号系统，需要登录、注册、会话、找回密码
- 有授权/激活系统，需要在线校验、设备绑定、心跳保活
- 有本地工作区或本地卡片/配置文件，需要文件级导入导出
- 有云端同步或远程管理后台
- 需要官网、下载站、激活站、后台站点

如果你的下一个软件也同时有“桌面端 + 云端账号 + 云端授权 + 前台站点 + 后台管理”这几层，这套可以直接拿来当蓝图。

## 2. 当前项目的真实技术栈

### 2.1 桌面端

- `Node.js`
- `Electron`
- `React`
- `TypeScript`
- `Vite`
- `esbuild`
- `electron-builder`
- `NSIS` 安装器

当前代码证据：

- `package.json:44` 使用 `react`
- `package.json:57` 使用 `electron`
- `package.json:62` 使用 `typescript`
- `package.json:63` 使用 `vite`
- `package.json:58` 使用 `electron-builder`

这里你刚才问的 `Node.js / JS` 也确实在用：

- Electron 主进程本身就是 Node.js 运行时
- 构建脚本、打包脚本、资源准备脚本也是 Node.js
- 前端写法主要是 TypeScript / JavaScript

### 2.2 UI 层

- 桌面 UI 主体：`React + TypeScript`
- 组件辅助：`@radix-ui/react-dialog`
- 图标：`lucide-react`
- 文件操作辅助：`fs-extra`

代码证据：

- `package.json:38`
- `package.json:41`
- `package.json:42`

### 2.3 云端后端

- `Cloudflare Workers`
- `Wrangler`
- `Cloudflare D1`

代码证据：

- `package.json:65`
- `workers/auth-api/wrangler.production.jsonc:27`
- `workers/auth-api/src/index.ts:81`

### 2.4 站点层

这套系统不是只有桌面端，还有多个静态站点：

- `public/cloudflare-www`：官网
- `public/cloudflare-site`：激活/账号站
- `public/cloudflare-download`：下载站
- `public/cloudflare-admin`：后台站

这些站点主要是：

- `HTML`
- `CSS`
- `原生 JavaScript`
- 部署到 `Cloudflare Pages`

所以这套系统是“桌面 React 应用 + 多个静态 Pages 前台站点 + 一个 Workers API”组合，不是单体 Web App。

## 3. 软件的结构分层

建议把这类软件理解成 6 层。

### 3.1 桌面壳层

负责：

- 主窗口
- 托盘
- 悬浮窗
- 启动和退出
- 安装包
- 自动更新
- 与系统文件、进程、路径交互

核心文件：

- `electron/main.ts`
- `electron/preload.ts`
- `electron/update/*`

### 3.2 桌面服务层

负责：

- 本地 profile 管理
- auth 切换
- 本地授权主机
- 更新逻辑
- 云端接口调用

核心文件：

- `electron/profile-service.ts`
- `electron/auth/auth-service.ts`
- `electron/auth/license-host-service.ts`

### 3.3 桌面渲染层

负责：

- 用户界面
- 卡片列表
- 设置界面
- 用户中心
- 授权中心
- 云同步入口

核心文件：

- `src/App.tsx`
- `src/components/*`
- `src/services/auth-client.ts`

### 3.4 共享契约层

负责：

- IPC 协议
- TS 类型定义
- 桌面与云端共享数据结构

核心文件：

- `shared/types.ts`
- `shared/ipc.ts`
- `shared/auth-defaults.json`

### 3.5 云端 API 层

负责：

- 登录 / 注册 / 会话
- 授权码激活
- heartbeat 心跳
- 设备记录
- 云端 profile 快照
- 远程授权主机后台接口
- 反馈/客服消息

核心文件：

- `workers/auth-api/src/index.ts`
- `workers/auth-api/migrations/*`

### 3.6 站点层

负责：

- 官网展示
- 下载页
- 激活页
- 账号页
- 后台页

核心目录：

- `public/cloudflare-www`
- `public/cloudflare-site`
- `public/cloudflare-download`
- `public/cloudflare-admin`

## 4. 调用链路是怎么走的

这是最关键的复用点。

### 4.1 桌面端调用链

调用顺序：

`React Renderer -> preload bridge -> IPC -> Electron Main -> 本地服务层 / 云端 API`

具体代码证据：

- `electron/preload.ts:1` 使用 `contextBridge` 和 `ipcRenderer`
- `shared/ipc.ts:69` 定义 IPC 通道
- `electron/main.ts:2827-3005` 注册 auth / license-host 等 IPC 处理器
- `src/services/auth-client.ts:1-39` 把渲染层操作包装成统一客户端方法

这意味着下一个软件如果也要做桌面端，最好继续保留这个三层结构：

- UI 不直接碰 Node
- preload 只做桥接
- main/service 才碰系统和云端

### 4.2 云端调用形式

形式是标准 HTTPS JSON API，不是 RPC，也不是 GraphQL。

现在的桌面端和网页端都是调这种形式：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/heartbeat`
- `POST /api/license/activate`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

桌面端调用是在 `electron/auth/auth-service.ts` 内部发 HTTPS 请求。

网页端调用是在 `public/cloudflare-site/app.js` 里直接 `fetch`。

### 4.3 heartbeat 的作用

这套软件的 heartbeat 不只是“在线检测”。

它还承担：

- 会话续活
- 远程授权状态刷新
- 当前设备在线状态上报
- 云端快照/云端同步相关信息刷新

所以如果以后复用这套框架，`heartbeat` 要保留成一个基础能力，不要只把它理解成 ping。

## 5. 当前数据到底怎么存

这套系统是多层存储，不是只有一种数据库。

### 5.1 云端数据存储

当前不是 MySQL。

当前是 `Cloudflare D1`。

代码证据：

- `workers/auth-api/wrangler.production.jsonc:27-32` 使用 `d1_databases`
- `workers/auth-api/src/index.ts:1874-1878` 直接要求 `AUTH_DB`
- `workers/auth-api/src/index.ts:1890-1898` 直接用 `D1Database` 执行 SQL

所以当前云端数据库结论非常明确：

- 不是 `MySQL`
- 不是 `PostgreSQL`
- 不是 `MongoDB`
- 是 `Cloudflare D1`

### 5.2 云端主要表

当前 D1 里主要有这些表：

- `users`
- `devices`
- `sessions`
- `licenses`
- `invite_codes`
- `invite_records`
- `reward_records`
- `password_reset_requests`
- `license_host_activities`
- `profile_transfers`
- `device_profile_snapshots`
- `remote_update_channels`
- `feedback_messages`
- `feedback_conversation_messages`
- `user_security_settings`
- `license_host_login_events`
- `profile_transfer_approvals`
- `user_cloud_profile_sync_snapshots`
- `user_security_trusted_devices`

对应迁移文件证据：

- `workers/auth-api/migrations/0001_init.sql`
- `workers/auth-api/migrations/0003_remote_admin_and_profile_transfers.sql`
- `workers/auth-api/migrations/0004_device_profile_snapshots.sql`
- `workers/auth-api/migrations/0005_remote_update_channels.sql`
- `workers/auth-api/migrations/0006_feedback_and_activity_reads.sql`
- `workers/auth-api/migrations/0007_feedback_conversations.sql`
- `workers/auth-api/migrations/0008_user_security_settings.sql`
- `workers/auth-api/migrations/0009_license_host_login_events.sql`
- `workers/auth-api/migrations/0010_profile_transfer_approvals.sql`
- `workers/auth-api/migrations/0014_user_cloud_profile_sync_snapshots.sql`
- `workers/auth-api/migrations/0015_user_security_trusted_devices.sql`

### 5.3 本地桌面数据存储

本地桌面端主要不是本地数据库，而是 JSON 文件。

关键文件：

- `app-settings.json`
- `profiles.json`
- `activity-log.json`
- `auth-shell.json`

代码证据：

- `electron/profile-service.ts:258-265`
- `electron/profile-service.ts:1313-1321`
- `electron/auth/auth-service.ts:1036`

默认本地 profile 根目录：

- Windows：`C:\codex-profiles`

代码证据：

- `electron/profile-service.ts:341-344`

一个 profile 的本体通常也是文件夹 + `auth.json` 形式，不是塞进本地数据库。

### 5.4 本地授权主机数据

本地授权主机同样是 JSON 文件：

- `host-db.json`
- `host-keys.json`
- `public-key.pem`

代码证据：

- `electron/auth/license-host-service.ts:54-58`
- `electron/auth/license-host-service.ts:229-231`
- `electron/auth/license-host-service.ts:299-323`

### 5.5 浏览器端临时存储

网页端会用：

- `localStorage`
- `sessionStorage`

例如认证站：

- session token
- API base url
- 待激活码
- 页面跳转提示

代码证据：

- `public/cloudflare-site/app.js:3-5`
- `public/cloudflare-site/app.js:16`
- `public/cloudflare-site/app.js:87-156`

## 6. 如果你下一个软件还想照着做，建议保留的模块

建议保留下面这些可复用基础模块。

### 6.1 桌面基础模块

- 窗口管理
- 托盘
- 悬浮窗
- 自动更新
- 本地路径选择
- 本地文件导入导出
- 日志系统
- 安装器打包

### 6.2 账号授权模块

- 登录
- 注册
- 会话
- heartbeat
- 设备绑定
- 授权激活
- 密码找回
- 二次密码 / 安全校验

### 6.3 工作区/卡片模块

- profile 列表
- 本地 profile 目录
- 导入导出
- 备注
- 批量操作
- 安全锁
- 当前 profile 切换

### 6.4 云同步模块

- 当前设备快照上报
- 账号级主快照
- 设备状态回传
- 云端覆盖 / 云端恢复
- 远程后台查看

### 6.5 远程管理模块

- 后台登录
- 授权下发
- 授权回收
- 更新通道控制
- 反馈消息
- 远程密码重置
- 远程 profile 传送

### 6.6 前台站点模块

- 官网
- 下载站
- 激活站
- 用户账号站
- 后台站

## 7. 这套软件的云端部署方式

当前云端是分开的。

### 7.1 API

- 部署到 `Cloudflare Workers`
- 主域名：`api.ainivox.cn`

### 7.2 数据库

- `Cloudflare D1`
- 绑定名：`AUTH_DB`

### 7.3 前台站点

- 部署到 `Cloudflare Pages`
- 站点拆分：
  - 官网
  - 激活/账号站
  - 下载站
  - 后台站

### 7.4 更新与下载

桌面应用更新不是只靠 `latest.yml`，还额外有自己的清单层。

相关内容：

- `release-manifests/stable/latest.json`
- `release-manifests/beta/latest_test.json`
- 安装包 `release-artifacts/win/*.exe`

所以这套系统的发布层也可以复用成一个标准模块：

- 本地打包
- 产物签名/校验
- 更新清单
- 下载镜像

## 8. 如果要改成 MySQL，应该怎么做

可以做，而且不算特别难，因为你现在云端已经是 SQL 思维，不是 NoSQL。

### 8.1 最推荐的做法

不要动桌面端调用协议。

只改“云端 API 实现”和“数据库实现”。

也就是：

- 桌面端继续 `Electron + React + IPC`
- 前台站点继续 `fetch /api/...`
- 云端 API 从 `Workers + D1` 改成 `Node.js API + MySQL`

这是成本最低的迁法。

### 8.2 推荐的新后端组合

如果你要上 MySQL，我建议组合成：

- `Node.js`
- `TypeScript`
- `Fastify` 或 `NestJS`
- `MySQL 8`
- `Prisma` 或 `Drizzle ORM`

如果你想继续轻量，建议：

- `Fastify + Drizzle + MySQL`

如果你想偏企业化、模块化，建议：

- `NestJS + Prisma + MySQL`

### 8.3 为什么能迁

因为当前 Worker 后端本来就是 SQL 表结构：

- 用户表
- 会话表
- 设备表
- 授权表
- 邀请表
- 找回密码表
- 反馈表
- 云同步快照表
- 远程更新通道表

这类结构迁到 MySQL 非常顺。

### 8.4 迁移时要改的东西

主要改 4 层。

#### 第一层：数据库驱动

当前：

- `D1Database`
- `prepare().bind().run()`

改成：

- `Prisma Client` 或 `Drizzle`
- MySQL 连接池

#### 第二层：SQL 方言

需要把 D1/SQLite 风格 SQL 调整成 MySQL 可接受写法。

比如：

- 主键定义
- `INSERT OR REPLACE`
- 时间字段默认值
- 部分索引/约束写法

#### 第三层：部署方式

当前：

- Workers
- D1

改成 MySQL 后建议：

- API 服务放在云主机 / 容器平台
- MySQL 放独立数据库服务

常见部署组合：

- `VPS + PM2 + MySQL`
- `Docker + MySQL`
- `阿里云 ECS + RDS MySQL`
- `腾讯云 CVM + MySQL`
- `Railway / Render / Fly.io + MySQL`

#### 第四层：环境变量

会从现在这种：

- `AUTH_DB`
- `PUBLIC_API_URL`

变成：

- `DATABASE_URL`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `JWT_SECRET` 或 session secret

### 8.5 不需要改的东西

如果迁得好，下面这些可以基本不动：

- Electron 主体架构
- React UI 架构
- IPC 架构
- 账号页/激活页/后台页的 API 调用形式
- 桌面端 profile 文件存储
- 本地授权主机 JSON 存储

也就是说，MySQL 迁移主要是“换云端后端”，不是“整套软件重做”。

## 9. 给下一个软件的推荐复用模板

如果下一个软件跟这个类型接近，建议直接按这个组合搭：

### A. 桌面端

- Electron
- React
- TypeScript
- Vite
- esbuild
- electron-builder

### B. 桌面内部架构

- Main 进程负责系统能力
- Preload 负责桥接
- Renderer 负责 UI
- Shared 层统一类型和 IPC 契约

### C. 本地数据

- `userData` 放设置、会话、运行时状态
- `profilesRootDir` 放真正的业务工作区文件
- JSON 文件优先，简单稳定，好迁移

### D. 云端

当前轻量方案：

- Cloudflare Workers + D1

如果未来更大规模：

- Node.js API + MySQL

### E. 前台站点

- 官网
- 下载页
- 激活页
- 用户页
- 后台页

全部独立部署，避免耦合成一个大站。

### F. 必留基础能力

- 登录/注册
- 会话
- heartbeat
- 激活
- 设备绑定
- 云同步
- 远程后台
- 自动更新
- 安装包发布

## 10. 最后的简化结论

一句话概括这套框架：

`Electron 桌面端 + React/TypeScript UI + JSON 本地工作区 + Cloudflare Workers API + D1 云端数据 + Cloudflare Pages 多站点 + 可切到 MySQL 的 SQL 型后端`

一句话概括当前存储：

- 云端：`D1`
- 本地桌面：`JSON 文件`
- 浏览器页：`localStorage / sessionStorage`
- 不是 `MySQL`

一句话概括以后要做新软件时最值得复用的部分：

先复用“桌面三层架构 + 账号授权链路 + 本地 JSON 工作区 + 云端 API 分层 + 多站点部署”这五件事。
