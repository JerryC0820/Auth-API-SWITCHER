Task: Fix switch progress feedback, restart timing, and post-switch quota state.
任务：修复切换过程的进度反馈、重启时机和切换后额度状态。

Start time: 2026-03-16 15:20:00
开始时间：2026-03-16 15:20:00

End time:
End time: 2026-03-16 18:18:09
结束时间：2026-03-16 18:18:09

Total time:
Total time: 2h 58m 09s
总耗时：2小时58分09秒

Modified files:
Modified files: shared/types.ts; shared/ipc.ts; electron/preload.ts; electron/main.ts; electron/profile-service.ts; src/App.tsx
修改文件：shared/types.ts；shared/ipc.ts；electron/preload.ts；electron/main.ts；electron/profile-service.ts；src/App.tsx

Summary:
Summary: Added switch progress events across IPC, rendered real-time phase progress in the switch confirm card, moved Codex/Trae auto-restart reporting behind auth switch success, added process stop/start waiting plus launch verification, and retried post-switch quota sync after mirroring current auth back into the active profile file.
修改摘要：为切换链路补上了跨 IPC 的阶段进度事件，在切换确认卡里渲染实时阶段进度，把 Codex/Trae 自动重启的反馈明确放到 auth 切换成功之后，并增加了进程关闭/启动等待与启动验证，同时在把当前 auth 回写到激活 profile 文件后重试切换后的额度同步。

Sync status: not synced
同步状态：未同步
