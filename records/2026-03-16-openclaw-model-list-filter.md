Task: Limit the OpenClaw switch-dialog model list to only the current ChatGPT Codex related models.
任务：把 OpenClaw 切换弹窗里的模型列表收窄到当前 ChatGPT Codex 相关模型。

Start time: 2026-03-16 12:10:58
开始时间：2026-03-16 12:10:58

End time:
End time: 2026-03-16 12:22:13
结束时间：2026-03-16 12:22:13

Total time:
Total time: 00:11:15
总耗时：00:11:15

Modified files:
Modified files:
- src/App.tsx
修改文件：
- src/App.tsx

Summary:
Summary:
- Filtered the OpenClaw switch-dialog model dropdown down to ChatGPT Codex related models only, using the existing provider metadata in the renderer instead of changing backend model catalog generation.
- Updated the default-selection and submission path to only keep an OpenAI Codex model when it is still in the filtered list, and changed the empty-state copy to explicitly mention ChatGPT Codex related models.
修改摘要：
- 把 OpenClaw 切换弹窗里的模型下拉收窄成只显示 ChatGPT Codex 相关模型，直接利用前端已有的 provider 元数据过滤，没有去改后端模型目录生成。
- 同时收紧了默认选中和提交值，只在过滤后列表里仍存在 OpenAI Codex 模型时才继续沿用，并把空状态文案改成明确说明“ChatGPT Codex 相关模型”。

Sync status:
Sync status: not synced
同步状态：未同步
