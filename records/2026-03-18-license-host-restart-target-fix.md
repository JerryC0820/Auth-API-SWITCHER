Task: Fix the local license-host restart button so it restarts only the host instead of restarting the main client.
任务：修复本地授权主机里的“重启主机”按钮，让它只重启主机自身，而不是把主客户端一起重启。

Start time: 2026-03-18 10:49:59
开始时间：2026-03-18 10:49:59

End time: 2026-03-18 10:52:50
结束时间：2026-03-18 10:52:50

Total time: 00:02:51
总耗时：00:02:51

Modified files: electron/main.ts, electron/preload.ts, shared/ipc.ts, src/components/LicenseHostView.tsx, records/2026-03-18-license-host-restart-target-fix.md, Codex.md
修改文件：electron/main.ts、electron/preload.ts、shared/ipc.ts、src/components/LicenseHostView.tsx、records/2026-03-18-license-host-restart-target-fix.md、Codex.md

Summary: Added a dedicated license-host restart IPC path, changed the host view restart button to call the host-specific restart action, and made the Electron main process restart only the host itself: in host-only mode it relaunches that host process, and inside the normal client it destroys and recreates only the host window instead of restarting the whole client.
修改摘要：新增了专用的授权主机重启 IPC，把主机页的重启按钮改成调用主机专用重启动作，并让 Electron 主进程只重启主机自身：在独立主机模式下重启该主机进程，在普通客户端内则只销毁并重建主机窗口，不再重启整个客户端。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
