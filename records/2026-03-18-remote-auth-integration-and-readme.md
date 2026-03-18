Task: Switch the client auth flow toward the Cloudflare Workers backend without depending on Resend, change forgot-password in the client to a not-yet-configured message, and include the new README in the same delivery.
任务：在不依赖 Resend 的前提下，把客户端授权流开始切到 Cloudflare Workers 后端，并把客户端里的忘记密码改成“当前未配置，敬请期待”，同时把新 README 一并纳入本次交付。

Start time: 2026-03-18 17:24:40
开始时间：2026-03-18 17:24:40

End time: 2026-03-18 18:18:45
结束时间：2026-03-18 18:18:45

Total time: 54m 05s
总耗时：54 分 05 秒

Modified files:
修改文件：
- electron/auth/auth-service.ts
- src/App.tsx
- records/2026-03-18-remote-auth-integration-and-readme.md
- Codex.md

Summary:
修改摘要：
- Switched the Electron auth service to prefer the Cloudflare Workers API for login/register/license/invite/heartbeat when a remote endpoint is configured, while keeping local mock and local-license-host flows as offline fallback.
- 把 Electron 授权服务改成在配置了远端地址时优先走 Cloudflare Workers API 处理登录、注册、授权码、邀请码和心跳，同时保留本地 mock 与本地主机授权作为离线回退。
- Persisted the remote session token in userData/auth-shell.json so the client can reuse the online session on the next launch.
- 在 userData/auth-shell.json 里持久化远端 session token，让客户端下次启动时可以复用在线会话。
- Changed the client forgot-password action to a local placeholder message "当前未配置当前功能，敬请期待。", without requiring Resend.
- 把客户端的忘记密码动作改成“当前未配置当前功能，敬请期待。”的本地占位提示，不再依赖 Resend。
- Deferred the README portion from the original draft to a later batch because the user narrowed this batch to the auth-flow continuation.
- 由于用户把本批范围收窄到授权流续接，因此把原草稿里提到的 README 部分后置到后续批次。

Sync status:
同步状态：
- Local code only in this batch; not pushed to GitHub yet.
- 本批只完成本地代码改动，尚未推送到 GitHub。
