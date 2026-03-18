# 当前实现完成度审计（基于原始 Prompt A / B / C / D）

## 审计基准

- 参考文档：
  - `C:\Users\Mr.Chen\Desktop\源码分析备份\GPT回复\06_如何把语音需求变成Codex可执行任务.md`
- 审计对象：
  - 你前面给我的 Prompt A / Prompt B / Prompt C / Prompt D
- 当前仓库：
  - `D:\AI-Code\项目开发-JERRY&Codex\Oauth切换免登版`

## 先给结论

- 除了“打包/发布”这块之外，真正还没完成的核心项，主要只剩：
  - 真实在线后端接入
  - 真实账号/授权/邀请码/奖励码服务端联调
  - 真实密码找回/邮件链路
- `现有 profile 切换主逻辑` 不是“未完成”，而是“未按最初建议继续重构”。当前切换主链路已经在跑，不是阻塞项。
- `打包脚本` 也不是未完成，Windows 打包链和 manifest 生成已经完成；真正还没做完的是“自动发布到 GitHub/Gitee、macOS 真机签名打包、仓库推送”。

## 按 Prompt 批次核对

### Prompt A：更新底座

状态：已完成主干

已完成：
- 静态 manifest 更新底座
- channel / override / same-version patch 检查
- manifest 验签接口和 sha256 校验链路
- Windows 安装器更新流程
- 主进程 / preload / 渲染层更新状态接线

当前仍保留为后续项：
- 真实线上 manifest 公钥和发布地址长期运维
- macOS 标准 auto-update（签名后再切）

结论：
- Prompt A 不是当前阻塞点，已经够用。

### Prompt B：关于页 / 更新弹窗 / 用户中心抽屉

状态：已完成主干

已完成：
- About Dialog
- Update Dialog
- 用户中心抽屉
- 底部帮助卡
- 客服二维码、帮助入口、用户中心可见交互

说明：
- 这块后续如果再调，属于 UI 精修，不属于“未完成主功能”。

### Prompt C：授权中心 / 登录注册 / 邀请体系

状态：部分完成

已完成：
- 登录 / 注册 / 忘记密码 UI
- 统一授权中心壳层
- 本地授权主机
- 本地签发授权码 / 客户端验签
- 本地授权记录与邀请记录的展示壳层
- 本地持久化 mock auth service
- 主机签发记录持久化 + 搜索

未完成：
- 真实 Cloudflare Workers + D1 或 Supabase 后端
- 真实登录注册接口
- 真实密码重置接口
- 真实邀请码核销、防刷、奖励发放
- 真实 heartbeat / bootstrap / minSupportedVersion 服务端返回

关键判断：
- 现在这一套“账号 / 邀请 / 奖励”仍然是本地 mock 壳层，不是真正在线系统。
- 这才是红框里除打包之外最大的未完成项。

### Prompt D：打包 / 发布 / 图标 / macOS 准备

状态：部分完成

已完成：
- Windows 打包链
- icon / installer icon / artifactName
- `dist:win` / `dist:dir` / `release:manifest`
- release-artifacts / release-manifests / release-notes 目录
- 旧 release 清理、旧 dist 误用修复

未完成：
- 自动发布到 GitHub Releases / Gitee
- 仓库推送
- macOS 真机签名打包
- Apple notarization

说明：
- 所以“打包脚本”本身已经完成了，没完成的是“真实发布”和“mac 真机签名”。

## 红框那三项现在怎么判断

### 1. 真实 Cloudflare / Supabase 后端

状态：未完成

这是当前除了打包外，最主要的未完成项。

证据：
- `electron/auth/auth-service.ts` 里仍然明确写着 `当前使用 mock 在线层，后续可切到真实 Auth API。`

### 2. 打包、发布、安装器、仓库推送

状态：部分完成

已完成：
- 打包
- 安装器
- manifest 生成

未完成：
- 自动发布
- 仓库推送
- mac 真机签名发布

### 3. 现有 profile 切换主逻辑和打包脚本

状态：不是“未完成”，而是“未继续重构”

拆开看：
- `打包脚本`：已完成
- `profile 切换主逻辑`：当前可用，但还没有按最初建议继续做成更彻底的平台 adapter / mac 抽象重构

这意味着：
- 如果你只是要继续可用，不需要现在动它
- 如果你要后续冲 mac 稳定支持，可以把它当成下一批独立重构任务

## 现在我可以直接继续做什么

### 不需要你额外提供素材，就可以直接开工的

1. 继续把当前仓库里的“假在线层”替换成“真实后端接口层骨架”
2. 在当前仓库里补后端 API client、错误态、真实 loading / retry / empty / forbidden 状态
3. 继续把 `profile-service` 抽成更清晰的平台 adapter，为 mac 路径/进程/重启做准备

说明：
- 这几项我可以先做“代码骨架 + 接口抽象 + 对接点”，不一定要立刻上线部署。

### 需要你先配合，我才能真正完成的

1. 真实在线后端接入

你需要给我：
- 你选哪条路：
  - Cloudflare Workers + D1
  - Supabase
- 后端要不要放当前仓库里
- 如果已经有项目：
  - Cloudflare account / project / D1 库信息
  - 或 Supabase project url / anon key / service role 接入方式
- 登录注册要不要真的发邮件
- 如果要发邮件，准备走哪家邮件服务

2. 自动发布 / 仓库推送

你需要给我：
- 是否要我直接把当前仓库推到 GitHub
- 发布目标：
  - GitHub Releases
  - Gitee 镜像
  - 两者都要
- 如果要自动发布，需要可用 token 或你本地已登录好的发布环境

3. macOS 真机签名打包

你需要给我：
- 一台可用的 macOS 构建机
- Apple Developer 证书 / 签名能力
- 是否要做 notarization

## 我对“当前窗口开启时那份提示词”的判断

那份文档本质上是“语音需求清洗工作流说明”，不是具体实现清单。

它要求的流程是：
1. 先把散乱需求清洗成结构化 PRD
2. 再拆成明确实现批次
3. 再交给 Codex 落地

这一点当前项目其实已经执行过了：
- Prompt A / B / C / D 就是已经清洗后的执行批次
- 当前真正没做完的，不是“提示词清洗流程”，而是“线上后端与真实发布环境”

## 现在最建议的下一步

如果你要我继续做，我建议按这个顺序：

1. 先做真实后端接入方案落地
2. 再做仓库推送和发布自动化
3. 最后再看是否要重构 profile 主逻辑以准备更稳的 mac 支持

## 你只要回复我这 4 个答案，我就能直接开始下一批

1. 后端选 Cloudflare Workers + D1，还是 Supabase？
2. 后端代码要放当前仓库里，还是新开一个仓库？
3. 登录注册是否要真实邮箱找回？
4. 这一批你要我先做：
   - A. 真实后端
   - B. 仓库推送 / 自动发布
   - C. profile 主逻辑抽象重构

## 当前审计结论（一句话版）

除了打包之外，现在真正还没完成的核心项，主要就是“真实在线后端”；`profile` 主逻辑不是坏了，而是还没做进一步重构；打包脚本本身已经完成，没完成的是“发布”和“mac 真机签名”。
