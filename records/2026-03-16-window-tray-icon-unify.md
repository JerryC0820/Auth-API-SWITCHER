Task: Unify the status-bar and tray icon so both use the same workspace switcher brand icon shown in the header.
任务：统一状态栏和托盘图标，让它们都使用头部显示的同一个工作区切换器品牌图标。

Start time: 2026-03-16 19:54:00
开始时间：2026-03-16 19:54:00

End time: 2026-03-16 19:54:46
结束时间：2026-03-16 19:54:46

Total time: 0h 0m 46s
总耗时：0小时0分46秒

Modified files: electron/main.ts, src/App.tsx, src/shell.css
修改文件：electron/main.ts、src/App.tsx、src/shell.css

Summary: Replaced the runtime BrowserWindow and tray icon SVG with the same dark-square OpenAI knot brand icon used in the app header, and updated the custom top status-bar brand slot to render that same icon instead of the temporary colored dot. Validation: npm run typecheck passed.
修改摘要：把运行时 BrowserWindow 和托盘图标的 SVG 替换成与应用头部相同的深色方形 OpenAI knot 品牌图标，并把顶部自绘状态栏里临时的彩色圆点改成同一个图标。验证：npm run typecheck 已通过。

Sync status: not synced
同步状态：未同步
