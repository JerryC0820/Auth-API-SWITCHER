Task: Investigate why multiple cards are showing the sync-failed status in the quota area.
任务：排查为什么多张卡片在额度区域显示“同步失败”状态。

Start time: 2026-03-17 11:26:58
开始时间：2026-03-17 11:26:58

End time: 2026-03-17 11:31:46
结束时间：2026-03-17 11:31:46

Total time: 00:04:48
总耗时：00:04:48

Modified files: records/2026-03-17-sync-failure-cause-check.md; Codex.md
修改文件：records/2026-03-17-sync-failure-cause-check.md；Codex.md

Summary: Investigated the sync-failed card state without changing product code, confirmed the UI shows sync failure whenever usageError is populated, and traced the concrete failure to a persisted 'Unexpected end of JSON input' error from the live usage fetch path that parses the PowerShell wham/usage response as JSON.
修改摘要：本次只排查未改产品代码，确认界面只要 usageError 有值就会显示“同步失败”，并把这次的具体失败定位到实时额度抓取链路里：PowerShell 请求 wham/usage 后在解析 JSON 时抛出了持久化的 “Unexpected end of JSON input”。

Sync status: not synced
同步状态：未同步
