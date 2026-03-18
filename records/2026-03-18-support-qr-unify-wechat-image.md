Task: Replace all customer support QR displays with the provided weixin客服.png and keep the group QR display empty for now.
任务：把所有客服二维码展示统一替换为提供的 weixin客服.png，并让群聊二维码暂时保持空占位。

Start time: 2026-03-18 10:57:26
开始时间：2026-03-18 10:57:26

End time: 2026-03-18 11:02:22
结束时间：2026-03-18 11:02:22

Total time: 00:04:56
总耗时：00:04:56

Modified files: public/assets/support/wechat-support.png, src/App.tsx, src/components/AboutDialog.tsx, src/components/FooterHelpCard.tsx, src/shell.css, records/2026-03-18-support-qr-unify-wechat-image.md, Codex.md
修改文件：public/assets/support/wechat-support.png、src/App.tsx、src/components/AboutDialog.tsx、src/components/FooterHelpCard.tsx、src/shell.css、records/2026-03-18-support-qr-unify-wechat-image.md、Codex.md

Summary: Copied the provided weixin客服.png into a public support asset path, wired all customer-support QR displays to use that image in the About dialog, footer help card, and auth-gate support area, and changed the group-QR slots to render as an empty “暂未开放” placeholder instead of a fake QR icon.
修改摘要：已把提供的 weixin客服.png 复制到 public 支持资源目录，并让关于页、底部帮助卡和未授权支持区的所有客服二维码展示都改用这张图片；同时把群聊二维码位改成“暂未开放”的空占位，而不是继续显示假的二维码图标。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
