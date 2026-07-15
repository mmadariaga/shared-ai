## Why

The `copilot-prompt-tools-probe` change confirmed `vscode/askQuestions` is wireable in VS Code Copilot prompt frontmatter (outcome: `picker=autonomous, semantics=augment`), leaving one prompt file (`sai-explore`) carrying a deliberately narrow single-tool `tools:` field and the other 13 with no `tools:` field at all. Declaring a per-prompt minimum set of tool **categories** guarantees each prompt body's actual needs (Fetch, openspec CLI, edits, browser for the a11y runtime path) without per-tool bookkeeping.

## What Changes

- Add a `tools:` YAML block to each of the 14 Copilot prompt files under `commands/copilot/`.
- Tools are declared as **categories** (first path segment only, e.g. `vscode`, `read`, `edit`) rather than fully-qualified names — VS Code grants the prompt every sub-tool within each declared category.
- Replace `sai-explore.prompt.md`'s existing probe-era `tools: [vscode/askQuestions]` block with the category-form set.
- Every prompt receives the `vscode` category (universal closed-choice picker per `remember.md`).
- Per-prompt category sets follow the minimum each body needs: read-only wrappers omit `edit`; only `sai-8-accessibility` gets `browser`; the `agent` category is excluded everywhere.
- Prompt body text below the frontmatter is untouched in every file.

## Capabilities

### New Capabilities
- `copilot-prompt-tools`: per-prompt minimum tool-category contract for the 14 VS Code Copilot prompt files.

### Modified Capabilities
<!-- none — copilot-prompt-tools-probe recorded the probe outcome; this change establishes the production wiring as a new capability. -->

## Impact

- **Files:** 14 files in `commands/copilot/` only (`budget`, `sai-explore`, `sai-1-spec` … `sai-8-accessibility`, `sai-archive`, `sai-backfill`, `sai-commit`, `sai-pr`).
- **No changes** to `remember.md`, agent files, instruction bodies, or any OpenSpec workflow artifacts beyond this change's own spec.
- Single mechanical commit; no cross-file dependencies.

## Proposal Research Documentation

**Local files**: `commands/copilot/*.prompt.md` (all 14 frontmatter blocks), `openspec/specs/copilot-prompt-tools-probe/spec.md`, `sai/instructions/remember.md` (closed-choice-prompts / universal `vscode` rationale).

**External URLs**: none.

## Additional Notes

- **Category vocabulary** (first-segment grouping VS Code uses):
    - `vscode` — VS Code editor tools (incl. `vscode/askQuestions`, `vscode/problems`, …)
    - `execute` — terminal, tasks, tests (`execute/runInTerminal`, `execute/runTests`, …)
    - `read` — file reads, terminal output (`read/readFile`, `read/terminalLastCommand`, …)
    - `search` — codebase, usages, list, text, changes (`search/codebase`, `search/usages`, …)
    - `edit` — file creation and modification (`edit/createFile`, `edit/editFiles`, …)
    - `web` — fetch, GitHub repo (`web/fetch`, `web/githubRepo`)
    - `browser` — browser automation incl. VS Code browser (`vscodeBrowser/*` + `browser/*`)
    - `todo` — task tracking
    - `agent` — deliberately excluded (no subagent dispatch from prompt frontmatter)
- The probe recorded `semantics=augment`, so a declared `tools:` field is additive to the default toolset; declaring categories explicitly still fixes each prompt's minimum contract regardless of future default-set drift.
- Per-file category assignments are pinned by the change request and reproduced verbatim in the spec.
