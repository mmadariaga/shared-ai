# self-contained-installable-prompts Specification

## Purpose
Keep every installable file usable in a project that does not contain shared-ai's own `openspec/specs/` directory. Installable files state the rules their reader needs in installable text and never point at a shared-ai capability spec.

## Requirements

### Requirement: Installable files cite no shared-ai capability spec

An installable file is any file under `sai/`, `skills/`, `agents/`, `commands/`, or `openspec/schemas/sai-workflow/`, the folders copied into other projects. An installable file SHALL NOT cite a capability of shared-ai's own `openspec/specs/`, either by a `specs/<name>/` path (with or without the `openspec/` prefix) or by a backticked capability name followed by the word `capability` or `spec`. This covers prompt text, templates, and comments in installed code.

#### Scenario: A design step names its own lists instead of a spec

- **WHEN** a worker reads the routing derivation in `sai/commands/design/steps/tasks.md`
- **THEN** the layer and discipline derivations point at the pattern lists written in that same file and name no shared-ai capability or spec path

#### Scenario: A comment in installed code names no capability

- **WHEN** a maintainer reads the header comment of `sai/tools/file-manifest.js`
- **THEN** the comment describes the net-fold rules without naming a shared-ai capability

#### Scenario: A schema template carries no spec path

- **WHEN** the proposal template at `openspec/schemas/sai-workflow/templates/proposal.md` is read
- **THEN** its first-line comment contains no path into shared-ai's `openspec/specs/`

### Requirement: An installable file states the rules its reader needs

Every rule a reader of an installable file needs at run time SHALL be written in an installable file that the reader has loaded. A citation SHALL NOT be removed in a way that leaves the reader without the rule: when the rule existed only in a shared-ai spec, it is written into the installable file.

#### Scenario: The design step states the closed-vocabulary rule

- **WHEN** a planned step fits none of the listed `layer` or `discipline` tokens
- **THEN** `sai/commands/design/steps/tasks.md` itself tells the worker to pick the closest listed token (with `cross-cutting` also valid for `layer`) and to flag the gap in `design.md` Open Questions

#### Scenario: The overview step lists the overview state values

- **WHEN** the design worker reads `sai/commands/design/steps/overview.md`
- **THEN** the step states that `overview.state` holds exactly one of `unmaterialized`, `materializing`, `failed`, `current`, or `stale`, and that an absent key on a non-backfilled change reads as `unmaterialized`

#### Scenario: The opencode budget skills state the dispatch-safety invariant

- **WHEN** a dispatcher reads the `## Dispatch mode` section of `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, or `skills/opencode/budget-subagent/SKILL.md`
- **THEN** the section names the dispatch-safety invariant as the containing rule and states it in one sentence — a background child is dispatched only from a dispatcher that outlives it and awaits its result, and synchronous dispatch satisfies this — with no spec path

#### Scenario: The decision-record index step states its own rules

- **WHEN** the planning worker reads `sai/commands/implement/steps/decision-record-index.md` in a project that has no shared-ai specs
- **THEN** the step file itself gives the domain-unit noun rules with their precedence and fallback, the cross-cutting thresholds, the relationship family boundary, and the five index-output invariants

### Requirement: References to the target project's own specs remain

Text in an installable file that refers to the specs of the project where SAI runs SHALL remain permitted. Generic placeholder forms such as `openspec/specs/{name}/spec.md`, `specs/<capability>/spec.md`, and `openspec/specs/**` name no shared-ai capability and are not own-spec citations.

#### Scenario: A generic placeholder path is kept

- **WHEN** an installable file refers to `openspec/specs/{name}/spec.md` or `specs/<capability>/spec.md`
- **THEN** the reference is kept as a target-project reference

### Requirement: The repository guidance records the citation rule

`AGENTS.md` SHALL state, under its instructions for adding or modifying an instruction, that installable files state their rules in their own text and never cite a shared-ai capability spec, and SHALL name the regression test that guards the rule. `SAI_LEARNINGS.md` SHALL carry one `## Avoid` entry with the key `openspec/specs/ citations in installable prompts` that records the rule and the observed failure.

#### Scenario: An agent reads the modification rules

- **WHEN** an agent reads the "Add / modify an instruction" section of `AGENTS.md`
- **THEN** it finds the rule naming the five installable folders and `test/installable-spec-citations.test.js`

#### Scenario: The design phase reads the learnings file

- **WHEN** `SAI_LEARNINGS.md` is read
- **THEN** its `## Avoid` section contains the entry keyed `openspec/specs/ citations in installable prompts` with an `*Observed:*` line naming this change
