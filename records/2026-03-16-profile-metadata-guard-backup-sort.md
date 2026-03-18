Task: Guard profile notes and recent-login timestamps from unrelated writes, add daily full-card backups with 24-hour deleted retention, and align card sorting with the user's quota-first ordering rules.
任务：保护 profile 备注和最近登录时间不被无关写入改动，增加整卡数据的日备份与删除后 24 小时保留，并让卡片排序符合用户的额度优先规则。

Start time: 2026-03-16 20:52:49
开始时间：2026-03-16 20:52:49

End time: 2026-03-16 21:15:12
结束时间：2026-03-16 21:15:12

Total time: 00:22:23
总耗时：00:22:23

Modified files: electron/profile-service.ts; Codex.md
修改文件：electron/profile-service.ts；Codex.md

Summary: Locked profile recent-login updates to import/switch flows by stopping updateProfile from rewriting updatedAt, preserved existing notes during duplicate imports, added daily full-card backups plus 24-hour deleted-card retention under nested backup folders, and changed real-card ordering to weekly-remaining-first with disabled cards always last.
修改摘要：停止在 updateProfile 里重写 updatedAt，把 profile 最近登录时间锁定到导入/切换流程；在重复导入同一张卡时保留已有备注；新增嵌套备份目录下的整卡日备份与删除后 24 小时保留；并把真实卡片排序改成按周剩余额度优先、停用卡永远最后。

Sync status: not synced
同步状态：未同步
