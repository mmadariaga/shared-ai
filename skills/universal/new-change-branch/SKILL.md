---
name: new-change-branch
description: Create and switch to a consistently named local change branch from a selected base.
disable-model-invocation: true
---

# New change branch

Run only after an explicit user request for `/new-change-branch` or this workflow.
Reuse relevant conversation context; this invocation does not start in isolation.
Load `safe-operations`. Use the harness-native pickers specified in step 2 for
all closed choices, including type and work-item selection; use conversation
text for open clarification. No OpenSpec dependency is required.

## 1. Inspect and resolve the name

Locate `sai/tools/new-change-branch.js` through `sai/policies/tool-resolution.md`
§ `sai/tools/*.js` copies, read from the harness root holding this skill.
Run `node <tool-path> <operation>` in the target repository, with one JSON object
on stdin; it returns JSON. Quote the tool path separately and use a quoted
heredoc or a safe stdin writer for JSON, never executable interpolation of input.
Run `inspect` with `{}`. Stop on a missing Git repository, missing HEAD commit,
merge or rebase in progress, or unavailable tool; report the concrete reason.

Derive the change type, name, and optional actual work-item identifier from the
current discussion and relevant imported work items, regardless of provider.
Ask only for missing or ambiguous information. For type offer `feat`, `fix`,
`docs`, `chore`. Ask for the name as free text. With no relevant reference omit
the identifier; never invent it. When relevant references describe different
changes, ask which to use. Preserve the selected identifier exactly.
Run `name` with `{type,name,id?}`. It normalizes only the name to lowercase
hyphen-separated words, builds `<type>/<id>_<name>` or `<type>/<name>`, and
validates with Git. For an empty or invalid name or an occupied branch name,
explain the problem and request a correction; never reuse, overwrite, or suffix
an occupied name automatically. **Complete when:** `name` returns `ready` and
the branch matches the resolved conversation data.

## 2. Select and resolve the base

Present `inspect.bases` in its returned order: current branch, detected parent,
then existing main and master references, each reference once. A detected parent
is a convenient starting point, not proof of historical origin: the helper
matches up to 20 first-parent commits, nearest HEAD first, against local and
available remote-tracking tips, excludes the current and symbolic references,
and breaks ties alphabetically by full reference name. Omit a missing parent.
Remote-tracking references may be stale; use them as available, without fetching
or updating remotes. Detached HEAD has no current-branch option.

Use Claude Code's `AskUserQuestion` (at most four options per question, with its
automatic free-text Other entry) or opencode's `question` (custom/free-text entry
enabled). If Claude Code has more than four bases, paginate in returned order
with a More option; retain free-text entry on every page. Display exact reference
values, mapping each label back to its full reference. Accept a free-text base
even when no suggested option exists. Never automatically choose a base.
Run `base` with `{base}`. If it does not resolve to a commit, explain and repeat
the base question. **Complete when:** the user selected or entered one valid
base and the helper returned its exact commit SHA (commit identifier).

## 3. Create once and verify

Show the final branch and selected base with SHA before creation. The explicit
workflow request and base selection authorize only this local creation and
switch. Cancellation at any earlier question ends without calling `create` and
without repository mutation; `create` with `{cancelled:true}` is also read-only.
Run `create` once with `{type,name,id?,base,sha}` from the completed steps.
It rechecks availability, base validity and unchanged SHA, and merge/rebase
state, then creates and switches with separate Git arguments and no remote
tracking. Preserve staged, unstaged and untracked work. If Git prevents switching,
stop; never discard work or automatically stash it. No commit, push, fetch,
reset, deletion or other Git mutation belongs to this workflow.

For pre-creation name or base rejection return to the relevant question; a merge
or rebase stops the run. After an attempted operation fails, stop and report
what executed, whether creation occurred, the active branch, and what remains
incomplete from the helper result. Do not clean up or retry automatically.
**Complete when:** `completed` verifies both the requested active branch and HEAD
SHA. Report the branch name and base used; otherwise report the concrete blocker.
