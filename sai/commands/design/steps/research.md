# Design Step — Research

Active step: research. Complete codebase research and resolve all Open Questions, then report the `research` progress event per the worker contract.

## Inputs

Read the following known files in the main agent (paths are fixed by convention):
- `openspec/changes/$ARGUMENTS/proposal.md` — motivation, what changes, capabilities in scope
- All files matching `openspec/changes/$ARGUMENTS/specs/**/*.md` — capability delta specs

## Codebase Research (DELEGATED)

**ALL** codebase discovery and deep reading MUST be delegated to a **`budget-explorer`** subagent. The main agent MUST NOT run `glob`, `grep`, `Read`, or any file operation on source code.

Launch ONE **`budget-explorer`** subagent with this prompt:

> Read the proposal and specs for change `$ARGUMENTS`. Discover and deeply read the most relevant source files for this change. Search broadly (glob/grep) — do not assume frameworks. For each discovered file, report: `filePath`, `keyExports`, `isReusableForThisChange` (boolean), `notes` (max 20 words). Return structured data only. No prose narrative.

The main agent acts **exclusively** on the `budget-explorer` subagent's output. If the output is ambiguous, spawn another `budget-explorer` subagent with a more targeted prompt. Do NOT open files to "verify".

## Trust Rule

The `budget-explorer` subagent is the single source of truth for codebase facts during design. The main agent MUST NOT re-read any source file the `budget-explorer` has already reported on, even if the report contains something surprising (e.g. "this component has a bug" or "this pattern is unusual"). Assume the `budget-explorer` is correct and design accordingly.

The only exception: files the `budget-explorer` explicitly marks as `NOT_FOUND` or files not in its list (e.g. external URLs, newly created files).

## Budget-explorer delegation specifics

How to spawn subagents, which model tier to use, task classification (lookup / synthesis / audit), tool-call caps, and output contract format are all defined by the budget skill (loaded at dispatch via common.md). Follow it.
