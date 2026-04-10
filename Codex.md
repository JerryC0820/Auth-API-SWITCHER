# Codex Memory
# Codex 记忆

## Stable Rules
## 稳定规则

English: Reply in concise Chinese by default unless the user asks otherwise.
中文：默认使用简洁中文回复，除非用户另有要求。

English: Only change the explicitly requested release-facing scope in this repo.
中文：本仓库只改用户明确要求的发布侧范围。

English: This release repo keeps release-facing content only; do not add source-code or product-logic edits here.
中文：这个发布仓只保留发布侧内容；不要在这里加入源码或产品逻辑改动。

English: When syncing release docs here, verify the source repo first and then mirror only the required README, manifest, and release-note files.
中文：在这里同步发布文档时，先核对源码仓，再只镜像必要的 README、manifest 和 release note 文件。

## Task Log
## 任务记录

English: Task: Refresh the public release repo README for stable 1.0.3 and add the required local memory/record scaffolding.
中文：任务：刷新公开发布仓的 stable 1.0.3 README，并补上必须的本地记忆文件与记录文件。

English: Request: Surface the latest stable highlights around support chat, cloud sync, and card transfer in the public release repo, without changing product code.
中文：要求：在公开发布仓里把客服会话、云同步和传卡的最新稳定版亮点写出来，不改产品代码。

English: Changed: Updated the release-facing README with the latest 1.0.3 highlights and capability rows, and added the mandatory Codex.md plus a task record for this repo.
中文：改动：更新了发布侧 README 的 1.0.3 最新亮点与能力状态行，并为本仓库补上了必须的 Codex.md 和任务记录。

English: Validation: Verified that the remote release repo already had the 1.0.3 stable manifest and release note, so only README plus the missing local project-memory files needed to be added in this sync step.
中文：验证：已确认远端发布仓本身已经具备 1.0.3 的 stable manifest 和 release note，因此这次同步步骤只需要补 README 和缺失的本地项目记忆文件。

English: Failure: The original local release mirror was stale and not pushable fast-forward, so the safe path was to patch a fresh remote clone instead of rebasing over unrelated local changes.
中文：失败：原来的本地发布镜像已经落后，且无法直接快进推送；因此最安全的做法是改用远端最新克隆来补丁，而不是在本地无关改动上强行 rebase。

English: Avoid next time: If the public release repo rejects a push because remote `master` is ahead, refresh from the remote head first and patch only the true diff instead of replaying a stale local mirror blindly.
中文：下次避免：如果公开发布仓因为远端 `master` 更靠前而拒绝推送，应先从远端头部刷新，再只补真实差异，不要盲目重放一份已经陈旧的本地镜像。
