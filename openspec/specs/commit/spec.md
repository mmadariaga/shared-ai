# commit Specification

## Purpose
TBD - created by archiving change extract-commit-rules-shared-instruction. Update Purpose after archive.
## Requirements
### Requirement: Rules sourced from shared instruction
`commit.md` SHALL load commit message format rules from `@sai/instructions/commit-rules.md` via a fetch directive rather than inlining them. The inline rule blocks (subject format, body, footer, hard rules, self-critique checklist) MUST be replaced with a single `Fetch @sai/instructions/commit-rules.md` directive.

#### Scenario: commit.md edited without changing workflow steps
- **WHEN** `commit.md` is updated to replace inlined rules with the fetch directive
- **THEN** Steps 1–6 of the sai-commit workflow (git inspection, diff reading, message generation, authorization gating, commit execution, post-commit report) MUST remain intact and unchanged

#### Scenario: Rules updated in commit-rules.md
- **WHEN** commit message format rules are updated in `commit-rules.md`
- **THEN** `commit.md` automatically inherits the updated rules with no edits required to `commit.md` itself

### Requirement: No duplication of rules
`commit.md` MUST NOT contain any inline copy of rules that exist in `commit-rules.md`. The fetch directive is the single point of truth for format rules within the sai-commit workflow.

#### Scenario: Duplicate rule detected in commit.md
- **WHEN** `commit.md` is audited post-implementation
- **THEN** no commit message format rule (subject length, type format, body wrap, footer convention, hard rule, or self-critique item) appears inline in `commit.md`

### Requirement: Repo-style detection sub-step in Step 1

Step 1 (Inspect Staged State) of `commit.md` SHALL include an inline repo-style detection sub-step that runs a single `git log -N --pretty=format:'%h %s%n---%b---END'` call (N declared in the rubric, currently 20) and parses the result inline to produce the four measures defined by the detection rubric in `commit-rules.md` (match rate, type/scope vocabulary, body-presence rate, recurring body section headers). The detection SHALL NOT spawn a subagent and SHALL NOT inline the rubric's thresholds or adoption logic into `commit.md` — that logic remains in `commit-rules.md`.

#### Scenario: Detection runs inline without a subagent
- **WHEN** Step 1 executes on a repo with staged changes
- **THEN** the agent SHALL run one `git log` call and parse it inline to compute the four measures, without spawning any subagent

#### Scenario: Detection result carried into Steps 2–4
- **WHEN** the detection sub-step has computed the measures
- **THEN** Steps 2–4 SHALL consume the detected style per the adoption/fallback branches defined in `commit-rules.md`

#### Scenario: Rubric logic not duplicated in commit.md
- **WHEN** `commit.md` is audited after the change
- **THEN** the adoption threshold and adoption/fallback decision rules SHALL appear only in `commit-rules.md`; `commit.md` contains the git command and the inline parse, not the threshold logic

### Requirement: Optional detected-style notice

`commit.md` SHALL support an optional single-line chat notice reporting the detected style (for example `Detected repo style: Conventional Commits · types=[…] · scopes=[…] · body style=bullets+trailers`), or that the agent fell back to the hard-coded rules. The notice SHALL be **off by default**; the change does not add a flag to enable it, leaving the toggle to a future flag.

#### Scenario: Notice suppressed by default
- **WHEN** Step 1 detection completes and no enabling flag exists
- **THEN** the agent SHALL NOT print the detected-style notice

### Requirement: Faithfulness and stop conditions unchanged

The detection sub-step SHALL NOT alter Step 1's existing stop conditions (no staged changes, only unstaged changes, mixed staged/unstaged, secret-looking staged files) nor the faithfulness rule that every claim in the message maps to a hunk in `git diff --cached`.

#### Scenario: No staged changes still stops
- **WHEN** there are no staged changes
- **THEN** the agent SHALL respond "No staged changes. Use `git add` first." and STOP, regardless of the detection sub-step

#### Scenario: Detection does not introduce unfaithful claims
- **WHEN** the adoption branch supplies a detected type, scope, or body style
- **THEN** the message SHALL still contain only claims that map to staged hunks; detected vocabulary SHALL NOT introduce content absent from `git diff --cached`

