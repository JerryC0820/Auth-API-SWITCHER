Task: Fix the profile-card review popover so it no longer gets covered by the card below when expanded.
任务：修复 profile 卡片里的审查额度展开层，避免展开后被下面的卡片挡住。

Start time: 2026-03-16 11:58:23
开始时间：2026-03-16 11:58:23

End time:
End time: 2026-03-16 12:01:30
结束时间：2026-03-16 12:01:30

Total time:
Total time: 00:03:07
总耗时：00:03:07

Modified files:
Modified files:
- src/App.tsx
- src/shell.css
修改文件：
- src/App.tsx
- src/shell.css

Summary:
Summary:
- Raised the whole profile card above its neighbors while the review quota popover is open, so the expanded panel is no longer hidden behind the next row.
- Kept the change local to the review-expanded state instead of changing the global card stacking order.
修改摘要：
- 在审查额度展开时把整张 profile 卡片抬到相邻卡片之上，避免展开层再被下一行卡片盖住。
- 修改只限于审查额度展开态，没有改全局卡片层级顺序。

Sync status:
Sync status: not synced
同步状态：未同步
