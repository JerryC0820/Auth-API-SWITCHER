Task: Fix the add/edit dialog so clicking outside the card triggers the same close guard flow as cancel and the top-right close button.
任务：修复新增/编辑弹窗，让点击卡片外区域时走和取消、右上角关闭同一套退出保护流程。

Start time: 2026-03-16 13:23:20
开始时间：2026-03-16 13:23:20

End time:
End time: 2026-03-16 13:23:44
结束时间：2026-03-16 13:23:44

Total time:
Total time: 00:00:24
总耗时：00:00:24

Modified files:
Modified files:
- src/components/AddProfileDialog.tsx
修改文件：
- src/components/AddProfileDialog.tsx

Summary:
Summary:
- Added an outside-area pointer handler to the full-screen add/edit dialog wrapper so clicks on the frosted area outside the card now go through the existing handleRequestClose guard instead of being swallowed as content clicks.
修改摘要：
- 在新增/编辑弹窗的全屏包裹层上补了外部区域点击处理，让点击卡片外的磨砂区域时不再被当成内容区点击吞掉，而是走现有的 handleRequestClose 退出保护流程。

Sync status:
Sync status: not synced
同步状态：未同步
