Task: Investigate why the UI is not marking the current active profile and whether an external re-login under another OpenClaw directory caused the mismatch.
任务：排查界面为什么没有标记当前激活 profile，并确认另一个 OpenClaw 目录下的重新登录是否导致了当前识别错位。

Start time: 2026-03-16 14:34:30
开始时间：2026-03-16 14:34:30

End time:
End time: 2026-03-16 14:35:18
结束时间：2026-03-16 14:35:18

Total time:
Total time: 00:00:48
总耗时：00:00:48

Modified files:
Modified files:
- records/2026-03-16-active-profile-detection-investigation.md
- Codex.md
修改文件：
- records/2026-03-16-active-profile-detection-investigation.md
- Codex.md

Summary:
Summary:
- Verified that active-profile detection compares the hash of C:\\Users\\Mr.Chen\\.codex\\auth.json against each profile auth.json under C:\\codex-profiles, and the current auth hash no longer matches any stored profile.
- Confirmed that the external OpenClaw source directory itself is not read by this app for Codex active-state detection; only the shared user auth file under %USERPROFILE%\\.codex matters, so an external re-login that rewrites that file is enough to make the app show “已检测到待导入”.
- Confirmed that the left “当前 PROFILE” card falls back to the first profile when no profile is truly active, which is why a62 can still be shown there even though the top bar says no active profile is recognized.
修改摘要：
- 确认了当前激活识别逻辑是把 C:\\Users\\Mr.Chen\\.codex\\auth.json 的哈希与 C:\\codex-profiles 下各 profile 的 auth.json 逐一比对，而当前这份 auth 已经和任何已存 profile 都对不上。
- 确认了这个应用在 Codex 激活识别上并不会直接读取你提到的外部 OpenClaw 源码目录；它只认 %USERPROFILE%\\.codex 下那份共享 auth，所以外部重新登录只要重写了这份文件，就足以让界面显示“已检测到待导入”。
- 确认了左侧“当前 PROFILE”卡片在没有真正激活项时会退回显示第一张 profile，这就是为什么顶部说没识别到当前激活，但左侧仍可能显示 a62。

Sync status:
Sync status: not synced
同步状态：未同步
