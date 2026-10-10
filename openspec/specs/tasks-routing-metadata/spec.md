# tasks-routing-metadata Specification

## Purpose
TBD - created by archiving change tasks-routing-metadata. Update Purpose after archive.

## Requirements

### Requirement: Each tasks.md step SHALL include a Routing line

Every `## Step N:` section in `tasks.md` SHALL contain a single Routing line formatted as:

    **Routing**: category=<category> · context=<context> · difficulty=<difficulty>

The line SHALL appear immediately after the `## Step N: <title>` heading and BEFORE `**Files Affected**`. The line is the only routing metadata emitted by `tasks.md`; the file SHALL NOT contain a separate routing block, table, JSON sidecar, or `routing.md`.

The middle dot character (·, U+00B7) SHALL be used as the pair separator. ASCII alternatives (`,`, `|`, `/`) are NOT acceptable substitutes.

The three keys (`category`, `context`, `difficulty`) SHALL be present on every Routing line, in that order, each followed by `=` and a token drawn from the enumeration in the corresponding requirement of this spec. A reader SHALL be able to identify which dimension a value belongs to without assuming the token's position in the line. Every Step of one `tasks.md` emitted by `/sai-2-design` SHALL use this format; one file SHALL NOT mix Routing formats.

A trailing parenthetical one-line note MAY follow the three key=value pairs for audit (e.g. `category=frontend-ui · context=medium · difficulty=medium (Next.js component)`). When present, the parenthetical begins with `(` and ends with `)` and SHALL be ignored by any parser of the Routing line — only the three key=value pairs are part of the routing tuple.

#### Scenario: Step has a Routing line in the correct position
- **WHEN** `sai-2-design` writes a `## Step N` section in `tasks.md`
- **THEN** the section contains a `**Routing**: category=<category> · context=<context> · difficulty=<difficulty>` line with keys exactly `category`, `context`, `difficulty` in that order, preceding the `**Files Affected**` line

#### Scenario: Exactly three dimensions on the line
- **WHEN** the Routing line is emitted
- **THEN** the line contains exactly three key=value pairs: category, context, difficulty

#### Scenario: Optional parenthetical justification
- **WHEN** the design agent appends a one-line audit note
- **THEN** the note follows the three key=value pairs as a single `(... )` group
- **THEN** the parser SHALL ignore anything from the first `(` onward on the line
- **THEN** the parenthetical is optional; its absence MUST NOT make the line invalid

#### Scenario: No separate routing artifact
- **WHEN** a reader inspects the change directory for routing metadata
- **THEN** the only routing artifact is the `**Routing**` line on each step
- **THEN** no `routing.md`, no routing table, no routing JSON sidecar, and no per-step machine-readable block is present

#### Scenario: One tasks.md uses one Routing format
- **WHEN** `/sai-2-design` writes or rewrites a `tasks.md`, reruns included
- **THEN** every `## Step N` in that file carries the `category`/`context`/`difficulty` Routing line and none carries the `layer`/`discipline`/`complexity` form

### Requirement: Routing tokens are descriptive, not an agent roster

The tokens in the Routing line SHALL be descriptive dimensions of the work (category, context, difficulty). The vocabulary MUST NOT bind to any specific agent name, model identifier, or vendor. The orchestrator (a future change) is responsible for mapping the descriptive tokens to its own agent roster at dispatch time.

#### Scenario: No agent names in the Routing line
- **WHEN** a reader parses the Routing line
- **THEN** the three key=value pairs can be interpreted without knowing any specific agent name, model literal, or vendor
- **THEN** the orchestrator can map the tokens to its own agent roster at dispatch time

#### Scenario: Orchestrator owns the mapping
- **WHEN** the orchestrator (out of scope for this change) reads the Routing line
- **THEN** the orchestrator applies its own mapping from descriptive tokens to agents
- **THEN** the design agent does not need to know which agents exist

### Requirement: No consumer is built in this change

This spec introduces the metadata only. The change MUST NOT add a router, dispatcher, or any code that reads the Routing line. Downstream phases (`sai-3-implement` and any future orchestrator) MAY read the line, but doing so is out of scope for this change.

#### Scenario: No routing-aware code is added
- **WHEN** a reader searches the repository for code that consumes `**Routing**:` lines
- **THEN** no such consumer exists in this change
- **THEN** the metadata is present in `tasks.md` only; no behavior in the pipeline depends on it yet

### Requirement: Routing values are judged by goal, not derived from paths

The design task-generation step SHALL define each Routing value by its goal. It SHALL NOT contain path pattern tables, precedence lists, equivalence tables, or any rule that derives a Routing value from `**Files Affected**` paths. Two independent design runs are not required to produce identical tokens.

#### Scenario: No path rubric in the design instruction
- **WHEN** `sai/commands/design/steps/tasks.md` is read
- **THEN** its Routing line subsection defines `category`, `context` and `difficulty` by goal and contains no path pattern table or precedence list

### Requirement: Category vocabulary names the kind of work by purpose

The `<category>` token SHALL be one of `frontend-ui`, `frontend-code`, `backend`, `data`, `infra`, `docs`, `other`, and only these values. It SHALL name the kind of work the Step performs, judged by its purpose. A Step mixing kinds of work SHALL take the category that best fits its main purpose. `other` SHALL be used only when the work fits no category at all, and SHALL carry a parenthetical note naming the kind of work.

#### Scenario: Mixed step takes the best-fitting category
- **WHEN** a Step mixes kinds of work
- **THEN** its `category` is the single enumerated token that best fits the Step's main purpose

#### Scenario: other carries a note
- **WHEN** a Step's work fits no enumerated category
- **THEN** its Routing line uses `category=other` followed by a parenthetical note naming the kind of work

### Requirement: Context vocabulary states how much the implementer must load

The `<context>` token SHALL be one of `small`, `medium`, `large`, and only these values. It SHALL state how much the implementer must load: instructions, files to read or touch, and prior information.

#### Scenario: Context token is drawn from the enumeration
- **WHEN** the design agent emits a Routing line
- **THEN** its `context` value is exactly one of `small`, `medium`, `large`

### Requirement: Difficulty vocabulary is measured against the implementer

The design task-generation step SHALL define the implementer once beside the Routing line as the agent that implements the Step in `/sai-4-apply`, no more capable than the design agent and usually less. The `<difficulty>` token SHALL be one of `low`, `medium`, `high`, and only these values. It SHALL state how hard the Step is for the implementer to finish from its plan, its tests, and its `interfaces.md` contract, and SHALL state that `/sai-3-implement` uses it to decide how much production code to write. When unsure, the design agent SHALL choose the higher value. A Step with no RED block SHALL still carry `difficulty`, judged on the plan and contract with no tests to guide the implementer.

#### Scenario: Uncertain difficulty rounds up
- **WHEN** the design agent is unsure between two difficulty levels
- **THEN** it emits the higher of the two

#### Scenario: Step without tests still carries difficulty
- **WHEN** a Step has no RED block (docs or config)
- **THEN** its Routing line still carries a `difficulty` judged on the plan and contract alone

### Requirement: Glossary defines the routing vocabulary

`GLOSSARY.md` SHALL define `Routing Category`, `Routing Context` and `Routing Difficulty`, and SHALL define `Routing Line` with the `category`/`context`/`difficulty` key=value form. It SHALL NOT define `Routing Layer`, `Routing Discipline` or `Routing Complexity`. Its relationships SHALL state that a Routing Line contains exactly one Routing Category, one Routing Context and one Routing Difficulty token in that order, is judged by purpose rather than derived from paths, and measures difficulty against the implementer. They SHALL NOT grant `sai-3-implement` permission to refine or split steps.

#### Scenario: Legacy routing terms are replaced
- **WHEN** `GLOSSARY.md` is read after this change
- **THEN** it carries `Routing Category`, `Routing Context` and `Routing Difficulty` entries and no `Routing Layer`, `Routing Discipline` or `Routing Complexity` entry

### Requirement: The model capability funnel is documented

`README.md` SHALL document, in its model customization section, the capability funnel in which each phase's model is no more capable than the previous one (`sai-2` >= `sai-3` >= `sai-4`), SHALL name the GREEN worker in that rule (the `sai-3` implementation worker >= the `sai-4` GREEN worker), and SHALL state that a more capable later phase is unsupported.

#### Scenario: Funnel note is present
- **WHEN** a reader consults the README model customization section
- **THEN** it finds the `sai-2` >= `sai-3` >= `sai-4` capability funnel note naming the `sai-3` implementation worker >= the `sai-4` GREEN worker and stating that a more capable later phase is unsupported
