Start: 2026-04-10 20:37:29 +08:00
Task: public release README 1.0.3 sync
Request: Update the public release repo README so the latest stable 1.0.3 highlights cover support chat, card transfer, cloud sync, and related user-facing improvements; add the missing Codex/record scaffolding required by the repo rules.
Scope: Release-facing docs only: README.md, Codex.md, and this record. The remote release repo already carries the 1.0.3 manifest and release note, so those are intentionally left unchanged in this sync step.
Status: In progress

## Summary / 摘要

Modified files
- Codex.md
- README.md
- records/01-2026-04-10-203729-public-release-readme-103-sync.md

Summary
- Confirmed the public release repo remote was already at stable `1.0.3` for manifest and release note.
- Updated the public README to surface the latest stable highlights around support chat, cloud backup, card transfer, and secondary-password protection.
- Added the missing `Codex.md` and per-task `records/` entry in this repo clone.

Not changed
- release-manifests/stable/latest.json
- release-notes/1.0.3.md
- Any product source code or release assets

Validation
- Read `release-manifests/stable/latest.json` and confirmed it already references `1.0.3`.
- Read `release-notes/1.0.3.md` and confirmed it already exists remotely.
- Verified the updated `README.md` now includes the `## 🆕 最新稳定版 1.0.3 亮点` section and the new status rows for support chat, cloud backup / card transfer, and secondary-password protection.

Failure
- The original local release mirror was stale and could not be pushed fast-forward because the remote branch was ahead.

Sync status
- Prepared for commit and push to `origin` and `gitee` from this fresh remote clone.

## Code-Level Change Ledger / 代码级修改台账

### File 1: README.md
- Path: README.md
- Change type: updated
- Exact location or anchor: top tagline, nav links, `## 🆕 最新稳定版 1.0.3 亮点`, `## ✨ 核心能力`, `### 当前交付状态`
- Reason: Update the public release-facing README so it actually reflects the user-visible 1.0.3 highlights and current feature set.
- Before code:
```md
> 面向 Codex / Trae / OpenClaw 场景的桌面授权与空间切换器，集成多 profile 切换、统一授权中心、本地授权主机、更新底座与在线授权后端预留。
```
```md
### 3. 本地授权主机
...
### 4. 更新底座
...
### 5. 在线授权后端骨架
```
- After code:
```md
> 面向 Codex / Trae / OpenClaw 场景的桌面授权与空间切换器，集成多 profile 切换、统一授权中心、客服支持会话、发送卡片与云同步、本地授权主机、更新底座与在线授权后端预留。
```
```md
## 🆕 最新稳定版 1.0.3 亮点

- 在线更新安装闭环：Windows 更新下载并校验完成后，会自动退出旧版并直接拉起安装器。
- 云同步体验收口：支持云备份中心、下载覆盖本地、更新云端，云下载中的占位卡会回到主卡片池并使用日常翻面切换样式。
- 发送卡片与接卡更顺：支持把空间卡片发送给其他账号，接收后直接导入当前卡片池，并保留“他人传送 / 云备份”来源语义。
```
```md
### 3. 客服支持与持续会话
...
### 4. 云备份、发送卡片与跨设备恢复
...
### 5. 二次密码与可信设备保护
```
- Added code: latest stable highlights section, support/cloud/security capability blocks, and new status rows
- Removed code: old generic-only wording that omitted the new user-facing highlights
- Rollback action: restore the old tagline, remove the `1.0.3` highlights section, revert the capability numbering/content, and drop the added status rows

### File 2: Codex.md
- Path: Codex.md
- Change type: added
- Exact location or anchor: whole file
- Reason: This repo did not contain the mandatory project-memory file required by its own rules.
- Before code: file did not exist
- After code: added a minimal bilingual Codex memory file with stable rules and the current task entry
- Added code: the full file
- Removed code: none
- Rollback action: remove this file only if the user explicitly requests cleanup and no later task depends on it

### File 3: records/01-2026-04-10-203729-public-release-readme-103-sync.md
- Path: records/01-2026-04-10-203729-public-release-readme-103-sync.md
- Change type: added
- Exact location or anchor: whole file
- Reason: Required task record before editing release-facing docs in this repo clone.
- Before code: file did not exist
- After code: created the task record with the remote-ahead context and the README-sync scope
- Added code: the full file
- Removed code: none
- Rollback action: delete this file if the user explicitly requests record cleanup

End: 2026-04-10 20:37:29 +08:00
Elapsed: 00:00:00
