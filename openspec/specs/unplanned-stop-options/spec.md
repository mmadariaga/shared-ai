# unplanned-stop-options Specification

## Purpose
TBD - created by archiving change stop-options. Update Purpose after archive.

## Requirements

### Requirement: Planned stops get no stop options
A planned stop SHALL NOT receive escalation options. Planned stops are a stop the card's contract defines — a literal stop text, an approval or authorization gate, and a stop the user chose (a declined confirmation or a cancellation) — as stated by the Planned stops rule of `sai/policies/obstacle-escalation.md`.

#### Scenario: Phase completes at its mandatory stop
- **WHEN** a command ends at a MANDATORY STOP after a completed phase, at an approval or feedback gate, or at a stop the user chose
- **THEN** the command keeps its own closing contract and appends no stop options

### Requirement: Contract-pinned stop text is the whole output
When a contract pins the exact stop text (for example the prerequisite literals or "No active changes found. Run `/sai-1-spec` to create one."), that text SHALL be the whole output and no escalation options SHALL be appended, because `sai/policies/obstacle-escalation.md` treats a literal stop text as a planned stop that keeps its own text.

#### Scenario: Stop text is pinned by the contract
- **WHEN** an unplanned stop has an exact stop text pinned by its contract
- **THEN** that text is printed byte-identical as the whole output with no options appended

### Requirement: A single viable path is presented as the next step
When the evidence supports only one viable path, that path SHALL be presented as the next step, with no picker and no filler alternatives, as `sai/policies/obstacle-escalation.md` § Escalate to the user states.

#### Scenario: Evidence supports one path
- **WHEN** an unplanned stop has only one viable path supported by the evidence
- **THEN** the closing message presents that path as the next step without a picker and without invented alternatives

### Requirement: Direct Build final report keeps four sections

Full Direct Build SHALL use `sai/policies/implementation-closing-report.md` for its closing report instead of the former Direct Build four-section presentation. Next step SHALL name the required decision, and after an escalation the options of `sai/policies/obstacle-escalation.md` SHALL follow Execution details as a separate decision prompt outside the report. Existing choices and planned-stop exclusions SHALL remain in force; cancellation and a stop the user chose SHALL get no options; a pending execution question SHALL remain a pause rather than a terminal closing. The `--no-specs` POC SHALL retain its own closing behavior. The `/sai-build` closing line is defined by its coordinator and is not governed by this requirement.

#### Scenario: Direct Build run ends incomplete

- **WHEN** a full Direct Build run ends incomplete and its final report is printed
- **THEN** the shared stopped report identifies the required decision in Next step and the escalation options of `sai/policies/obstacle-escalation.md` follow Execution details as a separate decision prompt outside the report

### Requirement: Options rest on evidence already held
Escalation options SHALL rest on the evidence the card already holds, per `sai/policies/obstacle-escalation.md`. Offering options SHALL NOT widen its read or write scope.

#### Scenario: Surface composes options for a stop
- **WHEN** a stopping surface composes stop options
- **THEN** the options draw only on evidence it already holds or may read under its contract and its read and write scope is unchanged

### Requirement: Options are proposals that grant no authority
Choosing an escalation option SHALL authorize only the named action, inside the gates that action already carries: safe-operations confirmations, commit gates, and the card's own authority line stay in force, per the Authority rule of `sai/policies/obstacle-escalation.md`. No option SHALL grant new retry, read, or write authority; choosing a way to continue resets only that obstacle's counter. An option that involves a destructive operation SHALL name it so its confirmation fires. Contract-pinned stop texts, report layouts, and existing choice prompts SHALL stay byte-identical.

#### Scenario: User selects an option that involves a destructive operation
- **WHEN** the user selects a stop option whose action involves a destructive operation
- **THEN** only that named action is authorized and the safe-operations confirmation for it still fires

### Requirement: Options are presented through the native picker
Escalation options SHALL be presented with the native picker per `@sai/policies/question-context.md`, with context before the picker and a short picker, as `sai/policies/obstacle-escalation.md` states. A free-text reply SHALL be treated as the user's own instruction and not as an invalid option.

#### Scenario: User answers with free text
- **WHEN** the user replies to the stop-options picker with free text
- **THEN** the reply is treated as the user's own instruction and not rejected as an invalid option
