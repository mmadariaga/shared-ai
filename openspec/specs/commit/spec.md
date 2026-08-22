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

Step 1 (Inspect Staged State) of `sai/commands/commit/instructions.md` SHALL include an inline repo-style detection sub-step that runs a single `git log -N --pretty=format:'%h %s%n---%b---END'` call (N declared in the rubric, currently 20) and parses the result inline to produce the four measures defined by the detection rubric in `commit-rules.md` (match rate, type/scope vocabulary, body-presence rate, recurring body section headers). Executed inside the dispatched worker session, the detection SHALL NOT spawn any additional subagent beyond the phase worker itself and SHALL NOT inline the rubric's thresholds or adoption logic into `instructions.md` — that logic remains in `commit-rules.md`.

#### Scenario: Detection runs inline without an extra subagent
- **WHEN** Step 1 executes on a repo with staged changes
- **THEN** the worker session runs one `git log` call and parses it inline to compute the four measures, without spawning any subagent beyond its own dispatched phase worker

#### Scenario: Detection result carried into Steps 2–4
- **WHEN** the detection sub-step has computed the measures
- **THEN** Steps 2–4 SHALL consume the detected style per the adoption/fallback branches defined in `commit-rules.md`

#### Scenario: Rubric logic not duplicated in instructions.md
- **WHEN** `sai/commands/commit/instructions.md` is audited after the change
- **THEN** the adoption threshold and adoption/fallback decision rules appear only in `commit-rules.md`; the instruction file contains the git command and the inline parse, not the threshold logic

### Requirement: Optional detected-style notice

The sai-commit flow SHALL support an optional single-line chat notice reporting the detected style (for example `Detected repo style: Conventional Commits · types=[…] · scopes=[…] · body style=bullets+trailers`), or that the agent fell back to the hard-coded rules. The notice SHALL be **off by default**; no flag exists to enable it, leaving the toggle to a future flag.

#### Scenario: Notice suppressed by default
- **WHEN** Step 1 detection completes and no enabling flag exists
- **THEN** no detected-style notice reaches the user

### Requirement: Faithfulness and stop conditions unchanged

The migration to the routed card set SHALL NOT alter Step 1's existing stop conditions (no staged changes, only unstaged changes, mixed staged/unstaged, secret-looking staged files) nor the faithfulness rule that every claim in the message maps to a hunk in `git diff --cached`. Stop texts stay exact: with nothing staged the run closes on a terminal payload whose summary is "No staged changes. Use `git add` first."; a secret-looking staged file returns a `needs_input` confirmation instead of proceeding silently.

#### Scenario: No staged changes still stops
- **WHEN** there are no staged changes
- **THEN** the run closes with exactly "No staged changes. Use `git add` first." regardless of the detection sub-step or the card split

#### Scenario: Detection does not introduce unfaithful claims
- **WHEN** the adoption branch supplies a detected type, scope, or body style
- **THEN** the message SHALL still contain only claims that map to staged hunks; detected vocabulary SHALL NOT introduce content absent from `git diff --cached`
