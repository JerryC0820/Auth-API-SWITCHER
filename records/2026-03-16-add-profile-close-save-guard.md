Task: Add close guards to the edit-space dialog so cancel, overlay click, and save all follow the requested save-before-exit behavior.
任务：给编辑空间弹窗加关闭保护，让取消、点外部磨砂区域和保存都按要求走“退出前保存”逻辑。

Start time: 2026-03-16 12:47:50
开始时间：2026-03-16 12:47:50

End time:
End time: 2026-03-16 12:51:40
结束时间：2026-03-16 12:51:40

Total time:
Total time: 00:03:50
总耗时：00:03:50

Modified files:
Modified files:
- src/components/AddProfileDialog.tsx
修改文件：
- src/components/AddProfileDialog.tsx

Summary:
Summary:
- Added close guards to the edit-space dialog so cancel, the top-right close button, and clicking outside the card now detect unsaved changes; if there are pending edits, the dialog prompts whether to continue editing, exit directly, or save before exiting.
- Updated the main save button to detect no-change edit state and close directly without issuing an unnecessary save request; when there are changes it still saves through the existing submit chain and then exits.
修改摘要：
- 给编辑空间弹窗接上了关闭保护：取消、右上角关闭按钮、点击卡片外部区域现在都会先识别未保存更改；如果有改动，会弹出确认层，询问继续编辑、直接退出还是先保存再退出。
- 同时调整了主保存按钮：编辑态如果没有任何改动，就直接关闭而不会再发一次无意义保存；有改动时仍然走原来的保存链路并在成功后退出。

Sync status:
Sync status: not synced
同步状态：未同步
