Task: Fix the blank page after the recent switch-progress changes.
任务：修复最近切换进度改动后出现的空白页。

Start time: 2026-03-16 18:29:14
开始时间：2026-03-16 18:29:14

End time:
End time: 2026-03-16 18:55:37
结束时间：2026-03-16 18:55:37

Total time:
Total time: 0h 26m 23s
总耗时：0小时26分23秒

Modified files:
Modified files: src/App.tsx
修改文件：src/App.tsx

Summary:
Summary: Added a runtime guard before subscribing to window.codexWorkspace.onSwitchProgress so the renderer no longer crashes on mount when the preload API is temporarily missing or stale. During verification, the actual blank window cause was also confirmed: an older Vite process from the same workspace was still occupying port 5173, so a newly started npm run dev failed to launch the renderer until that stale dev process tree was terminated and the dev stack was started again.
修改摘要：在订阅 window.codexWorkspace.onSwitchProgress 之前增加了运行时兜底，这样当 preload API 暂时缺失或仍是旧版本时，渲染层不会在挂载阶段直接崩掉。验证时也确认了这次真正出现空白窗口的直接原因：同工作区遗留的旧 Vite 进程仍占着 5173 端口，导致新开的 npm run dev 根本没有把 renderer 拉起来；在清掉旧的 dev 进程树并重新启动后已恢复。

Sync status: not synced
同步状态：未同步
