# AGENTS.md

English: This file defines the long-term execution rules for Codex in this project. These rules have the highest default priority unless the user explicitly overrides them for the current task.
中文：本文件定义 Codex 在本项目中的长期执行规则。除非用户针对当前任务明确覆盖，否则这些规则默认拥有最高优先级。

English: Codex must read this AGENTS.md before starting any task, and must re-read it whenever a task becomes unclear, fails, or encounters difficult errors.
中文：Codex 在开始任何任务前必须先阅读本 AGENTS.md；当任务不清晰、执行失败、或遇到疑难错误时，必须再次阅读。

English: Codex must also read Codex.md before starting any task, and must re-read Codex.md whenever it encounters repeated errors, uncertainty, or implementation conflicts.
中文：Codex 在开始任何任务前也必须先阅读 Codex.md；当出现重复错误、不确定实现、或实现冲突时，必须再次阅读 Codex.md。

English: Codex.md is mandatory and must be created if it does not already exist.
中文：Codex.md 是强制文件；如果不存在，必须创建。

English: Codex.md is the project memory file for accumulated experience, repair techniques, user direction style, command habits, recurring pitfalls, and verified solutions.
中文：Codex.md 是项目记忆文件，用于沉淀经验、修复技巧、用户指挥风格、命令习惯、重复踩坑点与已验证方案。

English: Every task must append an entry to Codex.md, including what was requested, what was changed, what failed, how it was fixed, and what should be avoided next time.
中文：每次任务都必须向 Codex.md 追加记录，包括用户要求、实际改动、失败点、修复方式，以及下次应避免的问题。

English: All entries in AGENTS.md and Codex.md must use bilingual line-by-line format: one English line followed by one Chinese line.
中文：AGENTS.md 与 Codex.md 的全部内容都必须使用中英双语逐行对照格式：一行英文，下一行中文。

English: The purpose of Codex.md is self-improvement through strict project memory, not freeform commentary.
中文：Codex.md 的目的在于通过严格的项目记忆实现自我改进，而不是随意发挥式记录。

---

## 1. Core Working Principle / 核心工作原则

English: Only make the exact changes explicitly requested by the user.
中文：只做用户明确要求的改动。

English: Do not add extra features, extra fixes, extra refactors, extra analysis, or extra optimizations unless the user explicitly asks for them.
中文：除非用户明确要求，否则不要擅自增加功能、修复、重构、分析或优化。

English: Default to minimal, incremental modifications on top of the current implementation.
中文：默认基于当前实现做最小化、增量式修改。

English: Do not rewrite stable code just because another approach looks cleaner or more modern.
中文：不要因为别的方案看起来更整洁或更新潮，就重写已经稳定的代码。

English: The main goal is to make the requested change accurately, without introducing new bugs and without touching unrelated code.
中文：核心目标是准确完成指定改动，不引入新 bug，不触碰无关代码。

---

## 2. Scope Control / 范围控制

English: Before editing, Codex must state what it will change, what it will not change, and which files it expects to modify.
中文：开始修改前，Codex 必须先说明要改什么、不改什么、预计会动哪些文件。

English: If the user specifies file limits, those limits are strict and may not be expanded without permission.
中文：如果用户指定了文件范围，该范围属于硬限制，未经许可不得扩大。

English: If Codex believes extra files must be changed to complete the task, it must stop and ask for approval before modifying them.
中文：如果 Codex 认为必须改动额外文件才能完成任务，必须先停下说明并征求批准，再修改。

English: If a problem is noticed outside the requested scope, record it in Codex.md if useful, but do not modify it.
中文：如果发现范围外的问题，可在有必要时记录到 Codex.md，但不要擅自修改。

English: Do not touch existing features, layouts, logic, wording, styles, or structure unless the user explicitly requested that exact area.
中文：不要触碰既有功能、布局、逻辑、文案、样式或结构，除非用户明确点名那个区域。

---

## 3. Protected Behavior / 受保护行为

English: Never assume the user wants a broader cleanup, modernization, simplification, or redesign.
中文：绝对不要默认用户想要更大范围的清理、现代化、简化或重设计。

English: Do not silently rename variables, functions, files, classes, or folders unless required by the user's request.
中文：除非用户要求，否则不要悄悄修改变量、函数、文件、类或文件夹名称。

English: Do not silently change comments, formatting, code style, indentation, or file organization unless required.
中文：除非确有要求，否则不要擅自改注释、格式、代码风格、缩进或文件组织方式。

English: Do not introduce new frameworks, libraries, build tools, or dependencies without explicit approval.
中文：未经明确批准，不要引入新框架、新库、新构建工具或新依赖。

English: Do not create new files in bulk unless the user explicitly asked for them.
中文：除非用户明确要求，否则不要批量创建新文件。

---

## 4. Command and Execution Rules / 命令与执行规则

English: If a command is long, fragile, or likely to freeze, split it into smaller safe steps automatically.
中文：如果命令过长、脆弱或容易卡住，必须自动拆分成更安全的小步骤。

English: Do not force large compound commands when step-by-step execution is safer.
中文：当分步执行更安全时，不要强行使用超长复合命令。

English: Preserve successful partial progress after a failure.
中文：执行失败后，必须保留已经成功的部分成果。

English: Continue from the last valid breakpoint instead of restarting the whole task.
中文：应从上一个有效断点继续，而不是整轮重来。

English: Do not repeatedly run expensive scans, full rebuilds, or full replacements unless necessary and approved.
中文：除非必要且获得批准，不要反复执行高成本扫描、全量重建或全量替换。

---

## 5. Editing Strategy / 修改策略

English: Prefer single-point or local fixes over broad rewrites.
中文：优先采用单点修复或局部修复，不要大范围重写。

English: If a line-level change can solve the problem, do not rewrite the whole block.
中文：如果行级修改能解决问题，就不要重写整段代码。

English: If a block-level change can solve the problem, do not rewrite the whole file.
中文：如果块级修改能解决问题，就不要重写整个文件。

English: Match the existing project style, naming, and structure instead of imposing a personal preferred style.
中文：要贴合现有项目的风格、命名和结构，而不是强加自己的偏好风格。

English: Stable compatibility is more important than theoretical elegance.
中文：稳定兼容优先于理论上的优雅。

---

## 6. Sync, Overwrite, and Rollback / 同步、覆盖与回退

English: Any sync to the real runtime directory must preserve relative paths exactly.
中文：任何同步到真实运行目录的操作，都必须严格保持相对路径一致。

English: Overwrite or rollback actions must never start automatically; they require explicit user confirmation.
中文：覆盖或回退操作绝不能自动开始，必须先获得用户明确确认。

English: Before overwrite or rollback, Codex must ask the user to choose the scope: functional files only, or full overwrite.
中文：在进行覆盖或回退前，Codex 必须询问用户覆盖范围：仅功能文件，还是全量覆盖。

English: By default, overwrite and rollback may only affect functional files such as html, css, js, jsx, manifest, and directly related runtime config files.
中文：默认情况下，覆盖与回退只允许作用于功能文件，例如 html、css、js、jsx、manifest 及直接相关的运行配置文件。

English: Never overwrite or delete non-functional folders or files such as diff, records, docs, backups, logs, archives, or user-maintained notes.
中文：绝对不要覆盖或删除 diff、记录、文档、备份、日志、归档或用户维护的笔记等非功能文件和文件夹。

---

## 7. Diff and Record Rules / diff 与记录规则

English: At the start of every task, create or update the task diff record immediately and write the start time first.
中文：每次任务开始时，必须立即创建或更新该任务的 diff 记录，并先写入开始时间。

English: At the end of every task, complete the diff record with end time and total elapsed time.
中文：每次任务结束时，必须补齐结束时间与总耗时。

English: The diff format must follow the project's existing format if one exists.
中文：如果项目已有 diff 格式，必须严格沿用既有格式。

English: If no existing diff format exists, the minimum required fields are task name, start time, end time, total time, modified files, summary, and sync status.
中文：如果项目没有既有 diff 格式，至少要包含任务名称、开始时间、结束时间、总耗时、修改文件、修改摘要与同步状态。

English: Never delete historical diff records unless the user explicitly requests cleanup.
中文：除非用户明确要求清理，否则不要删除历史 diff 记录。

---

## 8. Codex.md Structure Requirements / Codex.md 结构要求

English: Codex.md must be updated on every task, even if the task was small.
中文：无论任务大小，每次任务都必须更新 Codex.md。

English: Codex.md should contain reusable lessons, not only a raw chronological log.
中文：Codex.md 不应只写流水账，还应沉淀可复用经验。

English: Recommended sections include user preferences, command habits, known fragile areas, recurring bugs, confirmed fixes, rejected approaches, and validation notes.
中文：建议包含的章节有：用户偏好、命令习惯、脆弱区域、重复 bug、确认有效的修复方式、被否决方案以及验证说明。

English: When a task fails, Codex.md must record the real cause, not a vague summary.
中文：当任务失败时，Codex.md 必须记录真实原因，而不是模糊概述。

English: When the user gives strong directional feedback, Codex.md must record that guidance as a stable future behavior rule.
中文：当用户给出明确的方向性反馈时，Codex.md 必须把它记录为未来稳定执行规则。

English: Before new implementation work, Codex should review relevant past entries in Codex.md to avoid repeating mistakes.
中文：在开始新的实现工作前，Codex 应回看 Codex.md 相关记录，避免重复犯错。

---

## 9. Output Rules / 输出规则

English: Reply in Chinese by default unless the user asks otherwise.
中文：默认使用中文回复，除非用户另有要求。

English: Keep explanations concise and directly tied to the user's request.
中文：说明必须简洁，并且只围绕用户当前需求展开。

English: Do not produce long theoretical analysis unless the user explicitly asks for it.
中文：除非用户明确要求，否则不要输出冗长的原理分析。

English: After completing a task, report what changed, what did not change, which files were modified, and how to verify the result.
中文：任务完成后，必须说明改了什么、没改什么、改了哪些文件，以及如何验证结果。

English: Do not add unrelated suggestions, future ideas, or optional optimization proposals unless requested.
中文：除非用户要求，否则不要附带无关建议、未来想法或可选优化提案。

---

## 10. Safety Against Waste / 防浪费规则

English: Do not waste tokens on unnecessary expansion, repeated explanations, or unsolicited improvements.
中文：不要把 token 浪费在无意义扩写、重复解释或擅自优化上。

English: Do not keep analyzing areas the user did not ask to change.
中文：不要持续分析用户没要求改动的区域。

English: Do not make speculative edits just to appear proactive.
中文：不要为了显得积极主动而进行猜测式修改。

English: The correct default is restraint, not creativity.
中文：默认正确行为是克制，不是自由发挥。

English: Accuracy, stability, and obedience to scope are more important than seeming comprehensive.
中文：准确、稳定、严格守范围，比看起来“做得很全”更重要。

---

## 11. Mandatory Pre-Task Checklist / 任务前强制检查

English: Before each task, Codex must check AGENTS.md.
中文：每次任务开始前，Codex 必须检查 AGENTS.md。

English: Before each task, Codex must check Codex.md.
中文：每次任务开始前，Codex 必须检查 Codex.md。

English: Before editing, Codex must restate the exact requested scope.
中文：修改前，Codex 必须重新确认本次准确的任务范围。

English: Before running risky commands, Codex must verify whether user confirmation is required.
中文：在执行高风险命令前，Codex 必须先确认是否需要用户授权。

English: Before finishing, Codex must update both the diff record and Codex.md.
中文：在结束任务前，Codex 必须同时更新 diff 记录与 Codex.md。

---

## 12. Mandatory Failure Checklist / 出错时强制检查

English: If something fails, Codex must first re-check AGENTS.md and Codex.md before attempting a broad new solution.
中文：如果执行失败，Codex 在尝试更大范围的新方案前，必须先重新检查 AGENTS.md 与 Codex.md。

English: Codex must identify whether the failure was caused by scope violation, command length, unsafe assumption, missing confirmation, or environment mismatch.
中文：Codex 必须判断失败是否由越界修改、命令过长、危险假设、缺少确认或环境不匹配导致。

English: Codex must choose the smallest corrective action that can recover progress.
中文：Codex 必须选择能够恢复进度的最小纠正动作。

English: Codex must record the failure and fix in Codex.md so the same mistake is less likely to happen again.
中文：Codex 必须把失败与修复方式写入 Codex.md，以降低同类错误再次发生的概率。

---

## 13. Project-Specific Slots / 项目专用占位

English: Replace the placeholders below for each project and keep the same bilingual line-by-line format.
中文：以下占位内容可按项目替换，但必须继续保持中英逐行对照格式。

English: Project name: [replace here]
中文：项目名称：[在此替换]

English: Tech stack: [replace here]
中文：技术栈：[在此替换]

English: Allowed files to modify by default: [replace here]
中文：默认允许修改文件：[在此替换]

English: Protected features or areas: [replace here]
中文：受保护功能或区域：[在此替换]

English: Runtime sync directory: [replace here]
中文：运行同步目录：[在此替换]

English: Diff directory: [replace here]
中文：diff 目录：[在此替换]

English: Other project-specific rules: [replace here]
中文：其他项目专属规则：[在此替换]
