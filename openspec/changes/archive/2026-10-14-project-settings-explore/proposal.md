> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Every non-English `/sai-explore` session asked the Ready to Propose language, and every Plan - Unattended activation asked the overview language, although both are project conventions. A committed project setting now answers each question. Explicit overrides still win, and the settings win over the fast-track fixed values.

## What Changes

- `sai/tools/project-settings.js` adds `explore.readyToProposeLanguage` and `explore.overviewLanguage` to the setting catalogue. Both accept any non-empty string as a language name. `English` and `none` match case-insensitively and return in the canonical forms `English` and `None`. `none` is invalid for `explore.readyToProposeLanguage`. Values are trimmed. The `ask` skip now matches case-insensitively for every id, including the `backlog.*` ids. A catalogue entry may declare a `normalize` function that maps a valid value to the value returned.
- The crystallization language gate (item 8, `sai/commands/explore/steps/crystallization-language-gates.md`) runs `project-settings.js get explore.readyToProposeLanguage` once, before the fast-track skip and the English skip. Order: the user's explicit statement, then the setting, then fast-track `English`, then the normal question. A setting answer prints `Project setting explore.readyToProposeLanguage: <value>` once before the block and also applies in English conversations.
- Gate 9 at Plan - Unattended activation (`sai/commands/explore/steps/pipeline-plan-unattended.md`) runs `project-settings.js get explore.overviewLanguage` once, after an explicit `--overview-lang` or a direct user statement and after a value already resolved for the same crystallized set, and before the fast-track `None`. A setting answer prints `Project setting explore.overviewLanguage: <value>` once before the first worker dispatch. `.sai/settings.jsonc` is read-only input to the gate.
- A non-zero exit, unparseable output, or `value: null` counts as an absent setting at both gates. The gate prints the tool's warnings or one line naming the failure, then continues at the next level.
- The artifact-review language gate (item 3) states that it reads no project setting. Item 8 inherits its conversation-only persistence rule and also reads the setting as read-only input.
- `sai/policies/fast-track-flag.md` states that fast-track fixes only the language questions that no project setting answers.
- The explore step files that describe these gates under fast-track now say that a project setting answers first, and they link `docs/project-settings.md`. In `sai/commands/explore/steps/pipeline-selector.md`, `overview_language` can come from the `explore.overviewLanguage` setting, and the fast-track `None` applies only when no setting answered. `sai/commands/explore/steps/slicing-assessment.md` and `sai/commands/explore/steps/review-edge-cases.md` limit the fast-track bypass to the language questions that no project setting answers.
- New DDR 0164 amends DDR 0123c: a committed project setting is a read-only source for gate 9, and an invocation selection stays unpersisted. `docs/ddr/0000-INDEX.md` lists it under `/sai-explore`, `/sai-2-design`, and the amendments table with `— **Amends** 0123c`.
- `docs/project-settings.md` lists both ids with their values, scope, precedence, and failure handling. `docs/commands/sai-explore.md`, `docs/on-demand-commands.md`, and `docs/sequential-pipeline.md` link that page from their fast-track descriptions.
- `test/project-settings.test.js` covers validation and normalization for both ids, case-insensitive `ask`, and CLI `get` for both ids.

Non-goals: the artifact-review language gate keeps its normal question. Backlog and branch questions, merge, review, audits, and apply gain no settings. No settings writer is added; the `project-settings-setup` change owns it. The `**Overview language**` block field still shows only the `--overview-lang` value or `None`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-settings`: the catalogue gains the two explore language ids, with their validation and canonical normalization. `ask` matches case-insensitively.
- `explore-crystallization-language-gate`: the gate reads `explore.readyToProposeLanguage` before the fast-track and English skips.
- `explore-overview-language-gate`: gate 9 reads `explore.overviewLanguage` before the fast-track `None`.
- `sai-fast-track-flag`: fast-track fixes only the explore language questions that no project setting answers.
- `explore-review-language-gate`: the artifact-review gate reads no project setting.
- `localized-overview-generation`: a committed, read-only `explore.overviewLanguage` setting that answers gate 9 is not a persisted selection. Overview generation still reads no setting and persists no language.

## Impact

New files:
- `docs/ddr/0164-project-settings-answer-the-overview-language-gate-read-only.md`

Modified files:
- `sai/tools/project-settings.js`
- `test/project-settings.test.js`
- `sai/commands/explore/steps/crystallization-language-gates.md`
- `sai/commands/explore/steps/pipeline-plan-unattended.md`
- `sai/commands/explore/steps/artifact-review-language-gate.md`
- `sai/commands/explore/steps/pipeline-selector.md`
- `sai/commands/explore/steps/slicing-assessment.md`
- `sai/commands/explore/steps/review-edge-cases.md`
- `sai/policies/fast-track-flag.md`
- `docs/project-settings.md`
- `docs/commands/sai-explore.md`
- `docs/on-demand-commands.md`
- `docs/sequential-pipeline.md`
- `docs/ddr/0000-INDEX.md`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Related work under parent https://github.com/mmadariaga/shared-ai/issues/108: `project-settings-backlog` (https://github.com/mmadariaga/shared-ai/issues/109) is already delivered on this branch (commit 43d3fa25) and archived, so this change starts from its reader, CLI, and tests. `project-settings-setup` (https://github.com/mmadariaga/shared-ai/issues/111) owns the settings writer and the setup screen; once it lands, that screen offers the two explore ids.
