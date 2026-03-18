Task: Raise the duplicate-name overwrite confirmation above the add-space dialog so the confirmation card is actually visible and clickable.
任务：把同名覆盖确认弹窗抬到新增空间弹窗之上，确保确认卡片真正可见且可点击。

Start time: 2026-03-16 17:17:30
开始时间：2026-03-16 17:17:30

End time: 2026-03-16 17:21:56
结束时间：2026-03-16 17:21:56

Total time: 00:04:26
总耗时：00:04:26

Modified files:
修改文件：
- src/components/ConfirmActionDialog.tsx
- src/components/confirm-action-dialog-stitch.css

Summary: The overwrite confirmation state already existed, but the confirm overlay and shell shared the same stacking level as the add-space dialog, so the add dialog still visually sat on top. Raised the confirm overlay/content z-index and switched the workspace-frame overlay to a dedicated confirm-action overlay class so the overwrite confirmation now covers the add dialog correctly.
修改摘要：同名覆盖确认状态本来就已经存在，但确认弹窗的遮罩和外壳与新增空间弹窗处于同一层级，导致视觉上仍被新增弹窗压住。现已提高确认弹窗遮罩和内容层级，并把工作区风格弹窗的遮罩切到专用的 confirm-action overlay 类，让覆盖确认能够正确盖住新增弹窗。

Sync status: not synced
同步状态：未同步
