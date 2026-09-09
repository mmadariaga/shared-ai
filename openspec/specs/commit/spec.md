# commit Specification

## Purpose
TBD - created by archiving change extract-commit-rules-shared-instruction. Update Purpose after archive.
## Requirements
### Requirement: Rules sourced from shared instruction

The routed commit cards SHALL load commit message format rules from `@sai/policies/commit-rules.md` via fetch directives rather than inlining them: the coordinator card fetches `commit-rules.md` and follows it at the commit gate, and the worker card loads the command-local `sai/commands/commit/instructions.md`, which stays free of inline rule blocks (subject format, body, footer, hard rules, self-critique checklist) and defers all rule logic to the policy.

#### Scenario: Workflow steps remain intact while distributed across the routed cards
- **WHEN** the routed commit flow is compared with the former monolithic workflow
- **THEN** all six steps survive — staged-state inspection, diff reading, message generation, authorization gating, commit execution, and the post-commit report — with Steps 1–5 plus report and ask authoring owned by the worker through `instructions.md`, and ask presentation plus commit execution owned by the coordinator

#### Scenario: Rules updated in commit-rules.md
- **WHEN** commit message format rules are updated in `commit-rules.md`
- **THEN** both the coordinator gate and the worker-authored flow automatically inherit the updated rules with no edits required to either commit card or to `instructions.md`

### Requirement: No duplication of rules
Neither `sai/commands/commit/coordinator.md`, nor `sai/commands/commit/worker.md`, nor `sai/commands/commit/instructions.md` MUST contain any inline copy of rules that exist in `commit-rules.md`. The fetch directives are the single point of truth for format rules within the sai-commit workflow.

#### Scenario: Duplicate rule detected in the commit cards
- **WHEN** the commit card set is audited post-implementation
- **THEN** no commit message format rule (subject length, type format, body wrap, footer convention, hard rule, or self-critique item) appears inline in any of the three files

### Requirement: Repo-style detection sub-step in Step 1

Step 1 (Inspect Staged State) of `sai/commands/commit/instructions.md` SHALL obtain the repository commit style measures by calling `node sai/tools/commit.js collect --json` and extracting the `detected_style` object from its payload, rather than by an inline `git log -N` call and inline parse. The collect tool computes the four measures defined by the detection rubric in `commit-rules.md` (match rate, type/scope vocabulary, body-presence rate, recurring body section headers) and returns them as structured data. Executed inside the dispatched worker session, the detection SHALL NOT spawn any additional subagent beyond the phase worker itself and SHALL NOT inline the rubric's thresholds or adoption logic into `instructions.md` — that logic remains in `commit-rules.md`.

#### Scenario: Detection runs inline without an extra subagent
- **WHEN** Step 1 executes on a repo with staged changes
- **THEN** the worker session performs the detection without spawning any subagent beyond the phase worker itself

#### Scenario: Detection obtains measures from collect subcommand
- **WHEN** Step 1 executes on a repo with staged changes
- **THEN** the worker session calls `node sai/tools/commit.js collect --json`, extracts `detected_style` from the result, and obtains the four measures without an inline git log or inline parse

#### Scenario: Detection result carried into Steps 2–4
- **WHEN** the collect subcommand has returned the detected style
- **THEN** Steps 2–4 SHALL consume the detected style per the adoption/fallback branches defined in `commit-rules.md`

#### Scenario: Rubric logic not duplicated in instructions.md
- **WHEN** `sai/commands/commit/instructions.md` is audited after the change
- **THEN** the adoption threshold and adoption/fallback decision rules appear only in `commit-rules.md`; the instruction file contains the collect invocation, not the threshold logic

### Requirement: Optional detected-style notice

The sai-commit flow SHALL support an optional single-line chat notice reporting the detected style (for example `Detected repo style: Conventional Commits · types=[…] · scopes=[…] · body style=bullets+trailers`), or that the agent fell back to the hard-coded rules. The notice SHALL be **off by default**; no flag exists to enable it, leaving the toggle to a future flag.

#### Scenario: Notice suppressed by default
- **WHEN** Step 1 detection completes and no enabling flag exists
- **THEN** no detected-style notice reaches the user

### Requirement: Faithfulness and stop conditions unchanged

The migration to the tool-based model SHALL NOT alter Step 1's existing stop conditions (no staged changes in the ordinary path, only unstaged changes, mixed staged/unstaged, secret-looking staged files) nor the faithfulness rule that every claim in the message maps to a hunk in `git diff --cached`. Stop texts stay exact: with nothing staged on the ordinary path the run closes on a terminal payload whose summary is "No staged changes. Use `git add` first."; a secret-looking staged file returns a `needs_input` confirmation instead of proceeding silently. Under the `--amend` path, an empty staging area is not a stop condition, because a message-only amend is a legitimate use case; the secret-looking-file confirmation still applies, and the faithfulness rule (every message claim maps to actual changes) still holds.

#### Scenario: No staged changes still stops
- **WHEN** there are no staged changes
- **THEN** the run closes with exactly "No staged changes. Use `git add` first." on the ordinary path; under `--amend`, an empty staging area does not stop the run and the amend target is processed instead

#### Scenario: Detection does not introduce unfaithful claims
- **WHEN** the adoption branch supplies a detected type, scope, or body style
- **THEN** the message SHALL still contain only claims that map to staged hunks; detected vocabulary SHALL NOT introduce content absent from `git diff --cached`

