Task: Replace direct avatar save with a confirm-first upload card that supports preview and file guidance.
任务：把头像“直接保存”流程改成先预览再确认的上传卡片，并补充文件说明信息。

Start time: 2026-03-18 03:59:18
开始时间：2026-03-18 03:59:18

End time: 2026-03-18 04:11:10
结束时间：2026-03-18 04:11:10

Total time: 00:11:52
总耗时：00:11:52

Modified files: src/App.tsx, src/shell.css, records/2026-03-18-avatar-upload-card.md, Codex.md
修改文件：src/App.tsx、src/shell.css、records/2026-03-18-avatar-upload-card.md、Codex.md

Summary: Replaced the old click-and-save avatar flow with a centered upload card that opens on avatar edit, supports drag-and-drop or manual file picking, shows a square preview before saving, lists original dimensions / file size / output size / type limits, and only persists the avatar to local storage after explicit confirmation; added matching glass-card styles for the upload modal, preview stage, dropzone, metrics, error state, and responsive layout.
修改摘要：已把原来的“点一下直接保存头像”流程替换成居中的上传卡片：点击修改头像后会先弹出卡片，支持拖拽上传或手动选图，先展示方形预览，再展示原始尺寸 / 文件体积 / 输出尺寸 / 类型限制等信息，只有用户点击确认后才会真正写入本地头像；同时补充了这张上传卡片对应的毛玻璃样式、预览区、拖拽区、指标信息、错误态和响应式布局。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
