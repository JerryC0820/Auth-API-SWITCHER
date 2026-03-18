Task: Fix missing local license-host issuance history and add persisted searchable records by referencing the OpenClaw multi-machine deployment assistant.
任务：修复本地授权主机签发记录丢失的问题，并参考 OpenClaw 多机部署助手补上可持久、可搜索的签发记录。

Start time: 2026-03-18 13:54:13
开始时间：2026-03-18 13:54:13

End time:
End time: 2026-03-18 14:13:53
结束时间：2026-03-18 14:13:53

Total time:
Total time: 00:19:40
总耗时：00:19:40

Modified files: records/2026-03-18-license-host-history-and-search.md; shared/types.ts; shared/ipc.ts; electron/preload.ts; electron/main.ts; electron/auth/license-host-service.ts; src/components/LicenseHostView.tsx; src/shell.css; Codex.md
修改文件：records/2026-03-18-license-host-history-and-search.md；shared/types.ts；shared/ipc.ts；electron/preload.ts；electron/main.ts；electron/auth/license-host-service.ts；src/components/LicenseHostView.tsx；src/shell.css；Codex.md

Summary: Unified the local license-host storage path to the canonical %APPDATA%\\codex-workspace-switcher\\license-host directory, merged legacy standalone-host records into the canonical host database, preserved the full issuance history instead of truncating stored records, and added a searchable host-records flow from main process to renderer by referencing the persisted/searchable record pattern in the OpenClaw multi-machine deployment assistant.
修改摘要：把本地授权主机的存储路径统一到了规范的 %APPDATA%\\codex-workspace-switcher\\license-host 目录，合并了旧独立主机路径里的历史记录到规范主机数据库，保留完整签发历史而不再把存储记录裁成最近若干条，并参考 OpenClaw 多机部署助手的持久化/可搜索记录模式，把主机记录搜索链路从主进程一路接到了前端。

Sync status: Functional files only; no user data directories will be deleted or overwritten.
同步状态：仅修改功能文件；不会删除或覆盖用户数据目录。
