**Complexity**: high (5 capabilities, 17 requirements, no breaking change)

## Why

Changing a command's model materializes a project-local copy of the command file (`bin/model-customization.js:143-193` — `materializeLocalOverride` reads the existing destination and patches only its tunable frontmatter keys, leaving the body frozen), and that copy is snapshotted once and never refreshed again — commands get no tunable-splice refresh semantics (`bin/install-flow.js:104-127` applies those to agents only). Every line of library wiring sitting in that file is therefore frozen at the moment the user picked a model, while the library keeps evolving — the observed case is `.opencode/agents/explore.md`, still carrying an inline body that the source replaced with a single fetch line. Shrinking the wrapper body to a small fixed skeleton — three directives plus the envelope block and, on opencode change-consuming wrappers, the change-picker echo line — leaves almost nothing of the library wiring in the frozen copy: the behaviour lives in `sai/`, which the installer rewrites wholesale on every upgrade (the `sai-commands` projection copies `sai/commands/` recursively).

## What Changes

- Every in-scope command wrapper (15 of the 16 per harness; `budget` excluded) collapses its body to exactly three directives, in order: load the harness fetch skill, load the harness boot adapter, call `@sai/commands/{name}/launcher.md` forwarding the invocation envelope. `sai-explore` keeps a fourth harness-specific card fetch (the `idea-list-render` load; opencode explore additionally keeps its opencode-only `spec-worker` binding) because the launcher cannot know its harness.
- The post-change wrapper body is not literally three lines: the three directives are followed by the standalone `InvocationEnvelope:` block (four lines) and, on opencode change-consuming wrappers, the change-picker wrapper-echo line — the largest utility case lands around eight body lines, versus today's seven directives plus envelope and labels for `sai-1-spec`. The win is a reduction of the frozen surface to a fixed skeleton, not a collapse to three lines: everything that moves (behaviour-skill loads, worker bindings, card fetches) is library wiring, and what stays is the skeleton plus envelope data.
- The cosmetic `## Sai <Phase>` section heading (present on 28 of the 30 wrappers today; both `sai-worktree` wrappers lack it — the two `budget.md` files also carry no heading but are out of scope) is dropped by the rewrite — it carries no contract role, since the envelope's `command_name` identifies the command — so the frozen skeleton is directives plus envelope data and nothing else; for the `sai-worktree` wrappers the heading drop is a no-op.
- The invocation envelope — `command_name`, `wrapper_echo_value`, `arguments_value` — rides in the command file with the launcher call (a standalone `InvocationEnvelope:` block directly after the launcher-call directive), because `$ARGUMENTS` is substituted only in the command file; the envelope is never defined inside the launcher. Existing wrapper-echo lines (opencode change-picker contract) remain in the wrapper.
- 15 new `sai/commands/{name}/launcher.md` cards hold the glossary/behaviour skill loads, worker bindings, and card fetches the wrappers carry today. The seven commands with nothing to move (apply, archive, backfill, commit, pr, status, worktree) still receive a launcher that starts near-empty — uniformity plus a ready extension point that keeps future additions out of the user-owned wrapper.
- The launcher is harness-neutral: every harness difference (fetch-skill path, boot-adapter path, wrapper-echo value, harness-specific card fetches) stays in the per-harness wrapper.
- No frontmatter is edited in any file. No file is added under `commands/claude/` or `commands/opencode/` (the model menu enumerates every `.md` there, all preselected). No installer or manifest change: the `sai-commands` projection already copies `sai/commands/` recursively.
- Tests that assert against command bodies move those assertions to `launcher.md`; tests pinning frontmatter or the three wrapper directives stay on the wrapper.
- Spec contracts updated: `thin-wrappers` (wrapper shape, file list, template), `wrapper-fetch-paths` (wrapper fetch pattern), `source-layout` (card inventory).
- Behaviour is unchanged; only file layout and load order move — the boot adapter now loads before the behaviour skills, which must not change any command's outcome.

## Capabilities

### New Capabilities
- `command-wrapper-body`: the three-directive command body and the invocation envelope it forwards — fetch skill, boot adapter, launcher call (with `sai-explore`'s harness-specific loads), the envelope as a standalone `InvocationEnvelope:` block in the wrapper after the launcher call, frontmatter untouched, no files added under `commands/`.
- `command-launcher-card`: a `launcher.md` card per in-scope command under `sai/commands/{name}/`, holding the glossary/behaviour skill loads and worker binding the wrapper carries today, and existing as an extension point even when currently near-empty — harness-neutral, load-parity-preserving, failure-stopping, installed through the existing recursive projection.

### Modified Capabilities
- `thin-wrappers`: `wrapper-shape` reduced to a reference — the normative body shape defers to `command-wrapper-body` and is not restated; `wrapper-file-list` corrected from 13 to 15 files (adds `sai-status`, `sai-worktree`); `wrapper-template` reduced to the per-file variance set, with the skeleton deferred to `command-wrapper-body`.
- `wrapper-fetch-paths`: `wrapper-sai-commands-fetch-path` — the wrapper's sai-command fetch pattern becomes `@sai/commands/{name}/launcher.md`; flat and legacy forms forbidden.
- `source-layout`: `sai-payload-directory` — the `sai/commands/` card inventory gains the per-command launcher card.

## Impact

- `commands/claude/*.md` and `commands/opencode/*.md` — 15 of 16 files per harness rewritten (all `sai-*`; `budget.md` untouched). Frontmatter of every file byte-identical.
- `sai/commands/{name}/launcher.md` — 15 new files, one per in-scope command (spec, design, implement, apply, review, security, performance, accessibility, archive, backfill, commit, explore, pr, status, worktree). No `sai/install-manifest.json` change: the `sai-commands` projection copies `sai/commands/` recursively into the `sai` destination class for both harnesses.
- `openspec/specs/` — two new delta specs (`command-wrapper-body`, `command-launcher-card`) and three modified deltas (`thin-wrappers`, `wrapper-fetch-paths`, `source-layout`).
- `GLOSSARY.md` — one appended term (`Command Launcher`) plus a relationship line.
- `test/` — roughly 12 test files whose assertions reference wrapper bodies move those assertions to `launcher.md` (e.g. `doctor-fetch-resolution.test.js` counts wrapper binding fetches; `spec-coordinator-worker.test.js` asserts wrapper fetch content). Install byte-equality tests (`install-claude.test.js`, `install-opencode.test.js`) compare the installed copy against the repo wrapper and remain valid because both change together. Frontmatter assertions (`spec-coordinator-worker.test.js` model/effort pins) stay on the wrapper.
- Not touched: `bin/`, `skills/`, `sai/adapters/`, `sai/orchestration/`, `sai/install-manifest.json`, `configs/`, and the `budget` command files.

## Proposal Research Documentation

**Local files**:
- `bin/model-customization.js` — `materializeLocalOverride` (143-193): existing destination is read and only tunable frontmatter keys patched; body preserved. `enumerateCommands` (220-239): every `.md` in the commands-class source dirs is listed for the model menu with all entries preselected.
- `bin/install-flow.js` — `tunableSeedInstaller` (104-127): splice/refresh semantics exist for agents; commands use plain copy.
- `sai/install-manifest.json` — `claude-commands` / `opencode-commands` (copy, include `*.md`); `sai-commands` (copy, recursive, include `**/*.md`, both harnesses).
- `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md` (line 7) — routing by `command_name` to `coordinator.md` (routed) or `body.md` (utility).
- `skills/claude/fetch/SKILL.md`, `skills/opencode/fetch/SKILL.md` — path-scope rule: only `sai/`, `commands/`, `skills/` prefixes; harness root never named.
- `commands/claude/sai-1-spec.md`, `commands/opencode/sai-1-spec.md` (worst case, 7 fetch directives each), `commands/claude/sai-status.md`, `commands/opencode/sai-status.md`, `commands/claude/sai-explore.md` (fetch-skill, boot, `design-worker` binding, `idea-list-render` card), `commands/opencode/sai-explore.md` (fetch-skill, boot, `spec-worker` binding, `design-worker` binding, `idea-list-render` card — the `design-worker` binding is the harness-neutral one that moves to the explore launcher), `commands/claude/budget.md`, `commands/opencode/budget.md`.
- `openspec/specs/thin-wrappers/spec.md`, `openspec/specs/wrapper-fetch-paths/spec.md`, `openspec/specs/source-layout/spec.md`, `openspec/specs/command-wrappers/spec.md`, `openspec/specs/model-customization-menu/spec.md`, `openspec/specs/claude-commands-fetch-load/spec.md`, `openspec/specs/extract-bodies/spec.md`, `openspec/specs/dedup-numbered-wrappers/spec.md`, `openspec/specs/dedup-nonnumbered-wrappers/spec.md`.
- `openspec/schemas/sai-workflow/templates/specs.md` — delta spec format (ADDED/MODIFIED/REMOVED Requirements).
- `GLOSSARY.md`.

**External URLs**: none.

## Additional Notes

- The freeze is the intended consequence of the copy being user-owned; the lever is therefore what goes into the copy, not how the copy is refreshed. The command file is a user-owned settings file that happens to hold library wiring; the fix separates knobs from wiring.
- `enumerateCommands` explains why nothing new may be added under `commands/`: the model menu lists every `.md` there with all entries preselected, so a sibling internal file could itself acquire a frozen local copy. `sai/` is never enumerated and is not invocable.
- OpenCode `sai-explore` additionally carries an opencode-only `spec-worker` binding fetch; per the harness-neutral launcher rule it stays in the wrapper (openCode explore's directive count is five, Claude's four).
- Already-frozen project-local copies (e.g. the author's `.opencode/agents/explore.md`) are out of scope and will be deleted by hand.
- Trade-offs accepted: the frozen local copy still carries the full frontmatter, including Claude's `allowed-tools` — a future library version needing a new tool will fail opaquely for anyone holding a local copy; the wrapper's own small skeleton (three directives, the envelope block, and the opencode echo line) can still go stale (the surface shrinks, it does not vanish); near-empty launchers cost a read that returns almost nothing, in exchange for a uniform shape.
- `thin-wrappers` (13-file list, flat `sai/commands/<cmd>.md` fetch) and `extract-bodies` (flat 12-file layout) were already stale relative to the live wrappers; this change reconciles the wrapper-body contract in `thin-wrappers` only.
- Load-order note for the implementer: the boot adapter's routing still selects `coordinator.md` / `body.md`; the launcher carries the directives the wrapper carried beyond fetch-skill and boot (e.g. for `sai-1-spec`: glossary-format, budget, safe-operations, `spec-worker` binding, coordinator card — in the same relative order).
- The order-change outcome claim ("the reorder SHALL NOT change the command's outcome") is accepted as unverified risk, recorded explicitly: the boot adapter is a routing-only neutral file and every command's work happens after the full load completes, so the reorder's observable risk is bounded; the pipeline's own downstream phases (`sai-5-review`) provide the eventual verification surface, and the `load-parity` "outcome preserved" scenario pins the observable consequence at spec level.
