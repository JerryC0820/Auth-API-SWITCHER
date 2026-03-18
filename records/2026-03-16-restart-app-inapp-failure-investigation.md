Task: Investigate and fix the in-app restart button still failing after the earlier restart handoff change.
任务：排查并修复在上一轮重启接力改动后，应用内“重启应用”按钮仍然失败的问题。

Start time: 2026-03-16 11:18:33
开始时间：2026-03-16 11:18:33

End time:
End time: 2026-03-16 11:31:44
结束时间：2026-03-16 11:31:44

Total time:
Total time: 00:13:11
总耗时：00:13:11

Modified files:
Modified files:
- electron/main.ts
- package.json
- scripts/restart-dev.ps1
修改文件：
- electron/main.ts
- package.json
- scripts/restart-dev.ps1

Summary:
Summary:
- Replaced the dev-mode in-app restart handoff with a dedicated Electron exit code path so the running dev session can restart only the Electron child instead of tearing down the whole concurrently group.
- Reworked the dev:electron script to run through scripts/restart-dev.ps1 in a DevElectronLoop mode, avoiding fragile inline PowerShell quoting inside package.json.
- Updated scripts/restart-dev.ps1 so the dev Electron loop waits for vite/esbuild readiness via node + wait-on, launches Electron via node + electron/cli.js, and only relaunches when Electron exits with code 75.
- Relaunched the current development app and confirmed a fresh Codex Workspace Switcher window is running again.
修改摘要：
- 把开发态应用内重启改成专门的 Electron 退出码接力，让当前 dev 会话只重启 Electron 子进程，而不会把整个 concurrently 进程组一起拖死。
- 把 dev:electron 改成通过 scripts/restart-dev.ps1 的 DevElectronLoop 模式运行，避免 package.json 里内联 PowerShell 转义不稳定的问题。
- 更新 scripts/restart-dev.ps1，让开发态 Electron 循环通过 node + wait-on 等待 vite/esbuild 就绪，再通过 node + electron/cli.js 启动 Electron，并且只在 Electron 以 75 退出时自动再次拉起。
- 已经重新拉起当前开发版应用，并确认新的 Codex Workspace Switcher 窗口正在运行。

Sync status:
Sync status: not synced
同步状态：未同步
