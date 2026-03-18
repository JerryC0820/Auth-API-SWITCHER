Task: Make the current active space always appear first in the profile card ordering.
任务：让当前激活空间始终排在 profile 卡片排序的最前面。

Start time: 2026-03-17 11:30:39
开始时间：2026-03-17 11:30:39

End time: 2026-03-17 11:33:50
结束时间：2026-03-17 11:33:50

Total time: 00:03:11
总耗时：00:03:11

Modified files: electron/profile-service.ts; records/2026-03-17-active-profile-first-sort.md; Codex.md
修改文件：electron/profile-service.ts；records/2026-03-17-active-profile-first-sort.md；Codex.md

Summary: Moved the active-profile comparison ahead of auth-status and weekly-quota ranking in sortProfiles so the current space always stays first while the rest of the ordering rules remain unchanged, then restarted the dev app so the Electron main-process change took effect.
修改摘要：在 sortProfiles 里把“当前激活空间”的比较提前到 auth 状态和周额度排序之前，从而保证当前空间永远排第一，其余排序规则保持不变，随后重启开发应用让 Electron 主进程侧改动真正生效。

Sync status: not synced
同步状态：未同步
