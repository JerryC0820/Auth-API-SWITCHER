Task: Investigate why the tray hover card shows "未识别" for the current card quota and fix the display without changing unrelated tray or switching logic.
任务：排查托盘悬浮卡片当前卡片额度显示“未识别”的原因，并在不改无关托盘或切换逻辑的前提下修复显示。

Start time: 2026-03-16 20:19:00
开始时间：2026-03-16 20:19:00

End time: 2026-03-16 20:21:59
结束时间：2026-03-16 20:21:59

Total time: 0h 2m 59s
总耗时：0小时2分59秒

Modified files: electron/main.ts
修改文件：electron/main.ts

Summary: Confirmed that the current auth hash matches C:\\codex-profiles\\current-auth-3\\auth.json and that this profile already has live weekly and five-hour quotas, so the tray hover card was showing an unsynced stale state rather than truly missing quota data. Updated electron/main.ts so tray-card refresh first reads the normal state, then automatically falls back to refreshProfilesState only when the active profile still has unknown weekly/five-hour quota data and the overall remaining percent is null. Validation: npm run typecheck passed.
修改摘要：确认当前 auth 哈希实际匹配的是 C:\\codex-profiles\\current-auth-3\\auth.json，而且这张卡已经有 live 的周额度和 5 小时额度，所以托盘悬浮卡片显示“未识别”并不是当前数据真的没有额度，而是拿到了未同步的旧状态。已修改 electron/main.ts，让 tray-card 刷新时先读取普通状态；只有在当前激活卡片的周额度/5 小时额度仍未知且总体剩余额度为 null 时，才自动回退到 refreshProfilesState 做一次带同步刷新。验证：npm run typecheck 已通过。

Sync status: not synced
同步状态：未同步
