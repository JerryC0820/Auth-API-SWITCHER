Task: Fix the add-space dialog so detected-space prompts show correctly and the typed name no longer gets reset by incoming suggested values before saving.
任务：修复新增空间弹窗，让“发现新空间”的提示显示正确，并且在保存前输入的名称不再被后续建议值刷回去。

Start time: 2026-03-16 12:54:58
开始时间：2026-03-16 12:54:58

End time:
End time: 2026-03-16 13:11:34
结束时间：2026-03-16 13:11:34

Total time:
Total time: 00:16:36
总耗时：00:16:36

Modified files:
Modified files:
- src/App.tsx
- src/components/AddProfileDialog.tsx
修改文件：
- src/App.tsx
- src/components/AddProfileDialog.tsx

Summary:
Summary:
- Froze the add-dialog initial values in src/App.tsx so detected-space suggestions are captured only when the dialog opens, preventing the name field from being reset by later summary refreshes while the user is typing.
- Updated src/components/AddProfileDialog.tsx so the auto-detected add flow shows “发现新空间” and explicitly asks the user to confirm the detected name and plan before saving.
修改摘要：
- 在 src/App.tsx 中冻结了新增弹窗的初始值，只在弹窗打开时捕获一次检测到的建议信息，避免用户输入名称时又被后续 summary 刷新回去。
- 在 src/components/AddProfileDialog.tsx 中更新了自动检测新增场景的标题和说明，让弹窗显示“发现新空间”，并明确提示用户先确认检测到的名称和套餐再保存。

Sync status:
Sync status: not synced
同步状态：未同步
