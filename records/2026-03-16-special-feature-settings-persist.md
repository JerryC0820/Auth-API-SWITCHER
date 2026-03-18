Task: Persist the special-feature simulation settings locally so they are remembered after restarting the app.
任务：把特殊功能里的模拟设置做成本地持久化，让应用重启后还能记住这些设置。

Start time: 2026-03-16 12:03:49
开始时间：2026-03-16 12:03:49

End time:
End time: 2026-03-16 12:06:33
结束时间：2026-03-16 12:06:33

Total time:
Total time: 00:02:44
总耗时：00:02:44

Modified files:
Modified files:
- src/App.tsx
修改文件：
- src/App.tsx

Summary:
Summary:
- Added localStorage persistence for the special-feature simulation settings so the enabled state, card count, and selected plans are restored after restarting the app.
- Kept the persistence local-only and did not auto-remember the hidden-mode unlocked state.
修改摘要：
- 给特殊功能里的模拟设置接了 localStorage 持久化，应用重启后会恢复启用状态、卡片数量和已选套餐。
- 持久化仍然只做本地存储，没有把隐藏模式的解锁状态也自动记住。

Sync status:
Sync status: not synced
同步状态：未同步
