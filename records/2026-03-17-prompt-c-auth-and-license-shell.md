Task: Implement Prompt C auth, license, and invite shell with mock online/local layering.
任务：实现 Prompt C 的登录、授权和邀请壳层，并按 mock 的在线/本地双层结构落地。

Start time: 2026-03-17 23:39:06
开始时间：2026-03-17 23:39:06

End time:
End time: 2026-03-17 23:56:03
结束时间：2026-03-17 23:56:03

Total time:
Total time: 00:16:57
总耗时：00:16:57

Modified files:
Modified files:
- shared/types.ts
- shared/ipc.ts
- electron/main.ts
- electron/preload.ts
- electron/auth/auth-service.ts
- src/services/auth-client.ts
- src/App.tsx
- src/components/UserCenterDrawer.tsx
- src/components/LicenseCenterDialog.tsx
- src/shell.css
- records/2026-03-17-prompt-c-auth-and-license-shell.md
- Codex.md
修改文件：
- shared/types.ts
- shared/ipc.ts
- electron/main.ts
- electron/preload.ts
- electron/auth/auth-service.ts
- src/services/auth-client.ts
- src/App.tsx
- src/components/UserCenterDrawer.tsx
- src/components/LicenseCenterDialog.tsx
- src/shell.css
- records/2026-03-17-prompt-c-auth-and-license-shell.md
- Codex.md

Summary: In progress. Scope is limited to shared auth/license/invite types, a mock API/client layer, local-license shell IPC, login/register/forgot-password UI, and renderer wiring inside the existing dark glass shell. Real cloud backend integration, packaging, release scripts, and repository push are out of scope in this batch.
Summary: Completed Prompt C shell batch. Added shared auth/license/invite data contracts, a persisted mock AuthService in the Electron main process, preload/main IPC for login/register/password-reset/license/invite actions, a renderer auth client, and live user-center/license-center UI wiring with login/register/forgot-password forms plus invite request/redeem/claim actions. Real cloud backend integration, packaging, release scripts, and repository push remain out of scope in this batch.
修改摘要：Prompt C 的壳层批次已完成。新增了共享的登录/授权/邀请数据契约、Electron 主进程里的持久化 mock AuthService、preload/main 的登录/注册/重置密码/授权/邀请 IPC、前端 auth client，以及接入真实状态的用户中心/授权中心 UI，包括登录/注册/忘记密码表单和邀请码申请/兑换/领奖动作。真实云端后端集成、打包、发布脚本和仓库推送仍不在本批范围内。

Sync status:
Sync status: Not synced or pushed.
同步状态：未同步、未推送。

Validation:
- npm run typecheck
- npm run build:electron
- npm run build:renderer (still exits non-zero with the same pre-existing CSS optimizer warning; no new auth-layer error text was emitted)
验证：
- npm run typecheck
- npm run build:electron
- npm run build:renderer（仍然因为同一条既有 CSS 优化告警返回非零，日志里没有新的 auth 层报错文本）
