Task: Move avatar zoom/position editing into a separate popup instead of embedding the controls inside the main upload card.
任务：把头像缩放/位置调整改成单独弹出的二级弹窗，而不是直接内嵌在主上传卡中。

Start time: 2026-03-18 12:13:40
开始时间：2026-03-18 12:13:40

End time: 2026-03-18 12:25:21
结束时间：2026-03-18 12:25:21

Total time: 00:11:41
总耗时：00:11:41

Modified files: src/App.tsx; src/shell.css
修改文件：src/App.tsx；src/shell.css

Summary: Removed the inline avatar zoom/position sliders from the main upload card and moved them into a separate second-step popup with confirm/cancel, while keeping the upload card as the place for file selection and final save.
修改摘要：移除了主上传卡里的内嵌头像缩放/位置滑杆，改成独立的二级调整弹窗并提供确认/取消，同时保留主上传卡负责选图和最终保存。

Verification: npm run typecheck; npm run build:renderer
验证：已执行 npm run typecheck；npm run build:renderer

Sync status: Not synced to any runtime mirror directory; only the workspace source files were updated.
同步状态：未同步到任何运行镜像目录；本次只更新了工作区源码文件。
