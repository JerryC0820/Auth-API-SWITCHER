Task: Fix the duplicate-name overwrite confirmation flow for newly detected spaces.
任务：修复新发现空间的同名覆盖确认流程。

Start time: 2026-03-16 15:06:10
开始时间：2026-03-16 15:06:10

End time: 2026-03-16 15:09:56
结束时间：2026-03-16 15:09:56

Total time: 00:03:46
总耗时：00:03:46

Modified files: src/components/ConfirmActionDialog.tsx
修改文件：src/components/ConfirmActionDialog.tsx

Summary: The add-flow already detected duplicate names in App.tsx, but the overwrite confirmation still used the old generic modal branch and stayed behind the add dialog. Routed the “覆盖同命名空间” confirm dialog into the same glass-card branch and added overwrite-specific copy so the confirm layer now appears above the add dialog and can proceed with overwrite.
修改摘要：新增流程在 App.tsx 里其实已经能检测同名，但覆盖确认仍然走旧的通用弹窗分支，层级落在新增弹窗后面。现已把“覆盖同命名空间”接入同一套玻璃卡片弹窗分支，并补上覆盖专属文案，让确认层可以真正显示在新增弹窗之上并继续覆盖流程。

Sync status: not synced
同步状态：未同步
