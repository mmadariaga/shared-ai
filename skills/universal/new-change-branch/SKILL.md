---
name: new-change-branch
description: Create and switch to a consistently named local change branch from a selected base.
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
underscore-separated words, builds `<type>/<id>_<name_with_underscores>` or
`<type>/<name_with_underscores>`, and validates with Git. Existing branches are
never renamed. For an empty or invalid name or an occupied branch name,
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
enabled). If Claude Code has more than four bases, paginate in returned order,
with the first page carrying three bases plus a More option (four or fewer bases
carry all of them without More); retain free-text entry on every page. Display suggested bases
as short names: strip only the leading `refs/heads/` or `refs/remotes/` for display
(for example, `main` or `origin/main`). When short names coincide across local and
remote branches, add localized `local` or `remote` qualifiers to each affected
option; check the complete inventory, including other pages. Map each option back
to its full, exact reference and pass that reference as `{base}` on selection.
This is a presentation exception only for suggested branch-base options; preserve
the general verbatim-identifier rule elsewhere and the helper's returned data.
Accept a free-text base unchanged by this display rule
even when no suggested option exists. Never automatically choose a base.
The one exception is an invoking workflow that supplies `base` (and a resolved
type, name, and optional identifier) bound to a user answer it already collected
for this exact base reference, or an advance authorization of the whole creation:
skip the base question, run `base` with the supplied value, show the final branch
and base without waiting, and continue. A supplied base that does not match the
prepared base reference, or no supplied answer, keeps the base question above.
Run `base` with `{base}`. If it does not resolve to a commit, explain and repeat
the base question. **Complete when:** the user selected or entered one valid
base and the helper returned its exact commit SHA (commit identifier).

## Prepare for a caller

Any workflow may ask this skill to prepare without creating: run section 1's
`inspect` and return the suggested bases in their returned order, as the display
options and exact references of the first page (up to four options in all: with
more than four bases, three bases plus `More`; with four or fewer, every base
without `More`; plus the free-text entry), without asking and without
repository mutation. The caller presents that question and hands the answer back
as the supplied base of section 2. This skill never names or depends on its
caller; standalone use keeps sections 1–3 exactly as written.

A caller may also supply the resolved `type`, `name`, and optional identifier.
Section 1 still runs `name` with them and asks only for what `name` rejects or
leaves ambiguous.

## 3. Create once and verify

Show the final branch and selected base with SHA before creation. The explicit
workflow request and base selection authorize only this local creation and
switch. Cancellation at any earlier question ends without calling `create` and
without repository mutation; `create` with `{cancelled:true}` is also read-only.
Run `create` once with `{type,name,id?,base,sha}` from the completed steps.
A caller that chains branches adds `require_clean: true`; creation then stops,
without creating a branch, while the working tree has uncommitted changes. The
standalone flow omits it.
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
