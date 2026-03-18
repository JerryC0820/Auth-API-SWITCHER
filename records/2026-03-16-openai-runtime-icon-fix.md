Task: Force the runtime status-bar and tray icons to use the OpenAI brand icon instead of the fallback icon.
任务：强制运行时状态栏图标和托盘图标使用 OpenAI 品牌图标，而不是当前的回退图标。

Start time: 2026-03-16 21:18:08
开始时间：2026-03-16 21:18:08

End time: 2026-03-16 21:26:00
结束时间：2026-03-16 21:26:00

Total time: 00:07:52
总耗时：00:07:52

Modified files: electron/main.ts; Codex.md
修改文件：electron/main.ts；Codex.md

Summary: Switched runtime window and tray icon loading from an in-memory SVG-only nativeImage to a file-backed PNG cache under userData/runtime-icons, then used that file path for BrowserWindow creation and Tray creation so Windows shell can recognize the OpenAI icon reliably.
修改摘要：把运行时窗口和托盘图标的加载方式从仅使用内存中的 SVG nativeImage，改成先落盘到 userData/runtime-icons 的 PNG 缓存，再在 BrowserWindow 和 Tray 创建时使用这个文件路径，从而让 Windows shell 更稳定地识别 OpenAI 图标。

Sync status: not synced
同步状态：未同步
