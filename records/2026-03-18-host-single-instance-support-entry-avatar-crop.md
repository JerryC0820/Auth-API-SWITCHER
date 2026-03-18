Task: List the old app sources, prevent multiple license-host windows, add top-right support entry, change group placeholder copy, fix avatar circle display, and add avatar crop positioning controls.
任务：列出旧版应用来源、禁止授权主机多开、增加右上角客服支持入口、修改群聊占位文案、修复头像圆形显示，并增加头像上传的缩放与位置调整控制。

Start time: 2026-03-18 11:43:20
开始时间：2026-03-18 11:43:20

End time: 2026-03-18 12:01:53
结束时间：2026-03-18 12:01:53

Total time: 00:18:33
总耗时：00:18:33

Modified files: electron/main.ts; src/App.tsx; src/components/FooterHelpCard.tsx; src/shell.css
修改文件：electron/main.ts；src/App.tsx；src/components/FooterHelpCard.tsx；src/shell.css

Summary: Added a top-right support entry that reuses the existing help card, changed group placeholders to “敬请期待” in the touched support views, introduced avatar upload zoom/position controls with final save rendering, and changed standalone license-host startup to use its own Electron single-instance name so repeated launches no longer create multiple host processes.
修改摘要：增加了右上角客服支持入口并复用现有帮助卡；把本次触达的群聊占位文案改为“敬请期待”；补上头像上传的缩放与位置调整并按最终构图保存；同时让独立授权主机使用单独的 Electron 单实例名称，重复启动时不再生成多个主机进程。

Verification: npm run typecheck; npm run build:renderer; npm run build:electron; launched the standalone host twice with electron.exe . license-host-mode and confirmed only one host process remained.
验证：已执行 npm run typecheck；npm run build:renderer；npm run build:electron；并用 electron.exe . license-host-mode 连续启动两次独立主机，确认最终只保留一个主机进程。

Sync status: Not synced to any runtime mirror directory; only the workspace source files were updated.
同步状态：未同步到任何运行镜像目录；本次只更新了工作区源码文件。
