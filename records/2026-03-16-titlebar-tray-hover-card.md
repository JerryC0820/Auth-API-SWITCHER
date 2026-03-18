Task: Restyle the top window controls to match the reference app, add a resident tray icon, and show the current-card info when hovering the tray icon.
任务：把顶部窗口控件改成参考产品的样式，增加常驻托盘图标，并在托盘悬停时显示当前卡片信息。

Start time: 2026-03-16 19:20:30
开始时间：2026-03-16 19:20:30

End time: 2026-03-16 19:40:10
结束时间：2026-03-16 19:40:10

Total time: 0h 19m 40s
总耗时：0小时19分40秒

Modified files: electron/main.ts, electron/preload.ts, shared/ipc.ts, shared/types.ts, src/App.tsx, src/main.tsx, src/index.css, src/shell.css
修改文件：electron/main.ts、electron/preload.ts、shared/ipc.ts、shared/types.ts、src/App.tsx、src/main.tsx、src/index.css、src/shell.css

Summary: Converted the main window to a frameless shell with a custom drag bar and traffic-light controls, added resident tray behavior with close-to-tray handling, created a custom tray hover card window that shows the current profile snapshot in the same glass-style visual framework, and added the required window/tray IPC bridge plus renderer guards for stale preload sessions. Validation: npm run typecheck passed.
修改摘要：把主窗口改成无原生边框的自绘壳，新增可拖拽顶部条和三圆点窗口控件；加入常驻托盘与关闭收至托盘逻辑；新增一个自定义托盘悬浮卡片窗口，用与现有玻璃弹窗一致的视觉框架展示当前 profile 摘要；同时补齐窗口/托盘 IPC 桥，并给渲染层新增 preload API 做了运行时兜底。验证：npm run typecheck 已通过。

Sync status: not synced
同步状态：未同步
