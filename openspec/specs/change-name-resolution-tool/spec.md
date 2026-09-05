# change-name-resolution-tool Specification

## Purpose
TBD - created by archiving change unify-change-and-status-pickers. Update Purpose after archive.
## Requirements
### Requirement: Deterministic change-name resolution tool

A deterministic Node tool at `sai/tools/change-picker.js` SHALL resolve a change name for the `sai-*` change-name pickers and report a structured outcome. It SHALL expose exactly one sub-command, `resolve`, taking at most one positional supplied-name argument, and SHALL accept `--bulk-option`, `--json`, and `--cwd <dir>`. No consuming policy SHALL re-derive the resolution from prose.

The active change list SHALL come from `openspec list --json` and from nothing else — no filesystem globbing of `openspec/changes/`, no additional CLI flags — and only `changes[].name` SHALL be read.

The output contract SHALL be closed and aligned with the established `sai/tools/*.js` precedent: JSON on stdout under `--json`, and exit code 0 when a name was resolved or an option set is reported, 1 when the tool refuses because there is no active change to pick (payload carrying `refused: true` and `reason`), and 2 for a usage error or CLI/IO failure reported on stderr. A usage or IO error SHALL NOT emit an outcome.

#### Scenario: two or more changes report one option per change in list order
- **WHEN** `node <tool-path> resolve --json --cwd <project-root>` runs with no supplied name and `openspec list --json` reports three active changes
- **THEN** the tool writes a JSON payload with `outcome: "select"`, one option per change name in the reported list order, and a matching `option_count`, and exits 0

#### Scenario: an empty change list is a refusal, not an outcome
- **WHEN** the tool runs with no supplied name and `openspec list --json` reports an empty `changes` array
- **THEN** it writes a payload with `refused: true`, `reason: "no-active-changes"`, and `outcome: "none"`, and exits 1

#### Scenario: a usage or IO error is never an outcome
- **WHEN** the tool is invoked with an unknown sub-command, an unknown flag, more than one positional argument, or a `--cwd` directory that does not exist
- **THEN** it reports the error on stderr, writes no outcome to stdout, and exits 2

### Requirement: A supplied name short-circuits the change list

When the positional supplied name is present and non-empty after trimming, the tool SHALL report it as the resolved name with `outcome: "supplied"` and SHALL NOT consult the active change list, invoke the `openspec` CLI, or report an option set. When it is absent, empty, or whitespace-only, the tool SHALL fall through to the change-list branches.

#### Scenario: the change list is never consulted for a supplied name
- **WHEN** the tool resolves a non-empty supplied name in an environment where the `openspec` binary is not available at all
- **THEN** it reports `outcome: "supplied"` with the trimmed name in `resolved_name` and succeeds without any CLI invocation

### Requirement: The bulk-view option is a parameter of the two-or-more branch

`--bulk-option` SHALL prepend a single bulk-view option with label `See all` and value `see-all` to the two-or-more option set, and to that branch only. The tool SHALL NOT offer the bulk-view option on the zero-change or one-change branch under any flag combination. Apart from that prepended option, an invocation with `--bulk-option` SHALL report an option set identical to the same invocation without it, and its `option_count` SHALL be exactly one greater. The `see-all` value SHALL be chosen so it cannot collide with an active change name.

#### Scenario: the one-change branch refuses the bulk option
- **WHEN** the tool runs with `--bulk-option` and `openspec list --json` reports exactly one active change
- **THEN** it reports `outcome: "confirm"` with a `yes`/`no` option set and no option whose value is `see-all`

#### Scenario: the bulk option is the only difference between the two pickers
- **WHEN** the same two-or-more change list is resolved once with `--bulk-option` and once without
- **THEN** the bulk run's first option is `{ label: "See all", value: "see-all" }`, its remaining options equal the plain run's options exactly, and its `option_count` is one greater

### Requirement: The tool resolves and the caller asks

The tool SHALL report the resolved name or the ordered option set and MUST NOT print a question, assume an answer, or carry any user-facing literal. The zero-changes STOP literal, the one-change confirmation question, the two-or-more selection question, their numbered plain-text fallbacks, and the `> BULK-MODE ACTIVE` signal line SHALL remain owned by `sai/policies/change-picker.md` and `sai/policies/status-picker.md` and SHALL NOT appear anywhere in the tool's output on any branch. A consumer SHALL present the reported options in the reported order, using each option's `label`, and SHALL NOT add, drop, or reorder one.

#### Scenario: no user-facing literal crosses the tool boundary
- **WHEN** the tool is run on the zero-change, one-change, and two-or-more branches, each with and without `--bulk-option`, and every payload is serialized
- **THEN** no serialized payload contains the zero-changes STOP literal, either picker question, either numbered fallback prompt, or the `> BULK-MODE ACTIVE` signal line

### Requirement: Both picker policies delegate to the one tool

`sai/policies/change-picker.md` and `sai/policies/status-picker.md` SHALL delegate the supplied-name short-circuit and the 0/1/N branches to `sai/tools/change-picker.js` and MUST NOT re-derive them in prose or read the change list themselves. Each SHALL resolve the tool through a per-harness ordered list of verbatim path candidates — project-local root before user-global, with an `opencode debug paths` probe as the only fallback for a non-default opencode config root — and MUST NOT compose a tool path by joining a root string to a suffix. When no candidate exists, the consumer SHALL name the candidates it tried and stop, and MUST NOT fall back to resolving the name in prose.

The invocation SHALL be a byte-identical literal so a single whitelist entry per root covers it: `node <tool-path> resolve "<arguments_value>" --json --cwd <project-root>` for `change-picker.md`, and the same literal with `--bulk-option` for `status-picker.md`. Each policy SHALL map `outcome` to its own prompt, SHALL treat exit 1 with `reason: no-active-changes` as its STOP branch, and SHALL treat exit 2 as an incomplete resolution — reporting it as-is, printing no literal, and not continuing as if a name had been resolved.

#### Scenario: the policies name the tool rather than the mechanics
- **WHEN** `sai/policies/change-picker.md` and `sai/policies/status-picker.md` are read
- **THEN** each directs the reader to run the tool and present the prompt matching the reported `outcome`, instructs them not to list the changes themselves, not to second-guess an outcome, and not to let the tool phrase a question, and neither carries the previous instruction to run `openspec list --json` and parse the `changes` array

#### Scenario: an unresolvable tool never becomes a resolved name
- **WHEN** the tool exits 2, or no path candidate exists under the active harness
- **THEN** the consuming policy reports that the resolution could not be completed, prints no STOP or picker literal, and does not proceed as if a change name had been resolved

