# unplanned-stop-options Specification

## Purpose
TBD - created by archiving change stop-options. Update Purpose after archive.

## Requirements

### Requirement: Unplanned stops close with stop options

An unplanned stop SHALL be a run, segment, or Step that halts on an error or an unexpected condition and leaves the next move to the user. Every SAI command SHALL close an unplanned stop with a stop report followed by two or three concrete, costed options, with the recommended option first and a one-line reason for the recommendation. Each option SHALL name one concrete action, its cost, and its effect.

#### Scenario: Run halts on an error with several viable paths
- **WHEN** a run halts on an error or an unexpected condition and the evidence supports more than one viable path
- **THEN** the closing message gives the stop report followed by two or three concrete, costed options with the recommended one first

### Requirement: Planned stops get no stop options

A planned stop SHALL NOT receive stop options. Planned stops are a MANDATORY STOP after a completed phase, approval and feedback gates, and stops the user chose (a declined confirmation or a cancellation).

#### Scenario: Phase completes at its mandatory stop
- **WHEN** a command ends at a MANDATORY STOP after a completed phase, at an approval or feedback gate, or at a stop the user chose
- **THEN** the command keeps its own closing contract and appends no stop options

### Requirement: Contract-pinned stop text is the whole output

When a contract pins the exact stop text (for example the prerequisite literals or "No active changes found. Run `/sai-1-spec` to create one."), that text SHALL be the whole output and no stop options SHALL be appended.

#### Scenario: Stop text is pinned by the contract
- **WHEN** an unplanned stop has an exact stop text pinned by its contract
- **THEN** that text is printed byte-identical as the whole output with no options appended

### Requirement: Contract-defined choice serves as the options

When a contract already defines the choice for a stop (for example apply's exhausted Step: manual correction or one authorized fresh attempt), that choice SHALL be the options for that stop and no second question SHALL be added.

#### Scenario: Apply Step exhausts its recovery budget
- **WHEN** an unplanned stop falls on a stop whose contract already defines the user's choice
- **THEN** the contract-defined choice is presented as the options and no second question is added

### Requirement: A single viable path is presented as the next step

When the evidence supports only one viable path, that path SHALL be presented as the next step, with no picker and no filler alternatives.

#### Scenario: Evidence supports one path
- **WHEN** an unplanned stop has only one viable path supported by the evidence
- **THEN** the closing message presents that path as the next step without a picker and without invented alternatives

### Requirement: Stop report precedes the options

The stop report SHALL be the report the contract requires. When the contract requires a report without pinned text (for example "name the candidates you tried and stop"), that report SHALL come first and the options second. When the contract defines no report, the default stop report SHALL state what stopped and why, what is done, what is pending, and the exact state left behind (files written, staged, or committed, and whether the change stays retryable).

#### Scenario: Contract requires a report without pinned text
- **WHEN** an unplanned stop has a contract that requires a report but pins no text
- **THEN** the required report is given first, followed by the options

#### Scenario: Contract defines no report
- **WHEN** an unplanned stop has a contract that defines no report
- **THEN** the default stop report states what stopped and why, what is done, what is pending, and the exact state left behind

### Requirement: Unattended stop notice presents the decision as stop options

In unattended lanes, the "what the user must decide" part of the stop notice in `unattended-runtime-recovery.md` SHALL be presented as the stop options of the policy. The rule against a routine "how should I proceed?" question SHALL remain in force, because the options are concrete actions and not a generic question.

#### Scenario: Unattended lane stops
- **WHEN** an unattended lane closes its stop notice with the decision the user must make
- **THEN** that decision is presented as concrete, costed stop options and not as a routine "how should I proceed?" question

### Requirement: Direct Build final report keeps four sections

The Direct Build final report SHALL keep its four exact sections (Outcome / Changes / Verification / Incidents). On an incomplete run the stop options SHALL follow after `Incidents` as a separate decision prompt and SHALL NOT form a fifth section.

#### Scenario: Direct Build run ends incomplete
- **WHEN** a Direct Build run ends incomplete and its final report is printed
- **THEN** the report keeps its four sections and the stop options follow as a separate decision prompt

### Requirement: Composition stops close once at the supervisor

In a composition (`/sai-build`, `/sai-review`), a stop inside a segment SHALL close once, at the supervisor, with options covering the whole invocation (for example re-entering through `/sai-build`), and SHALL NOT produce one set of options per segment.

#### Scenario: A segment stops inside a composition
- **WHEN** a segment of a composition halts on an error or an unexpected condition
- **THEN** the supervisor closes the stop once with options covering the whole invocation

### Requirement: Options rest on evidence already held

Stop options SHALL rest on the evidence the stopping surface already holds (payload, diagnosis, hand-back, or what it may read under its contract). Offering options SHALL NOT widen its read or write scope.

#### Scenario: Surface composes options for a stop
- **WHEN** a stopping surface composes stop options
- **THEN** the options draw only on evidence it already holds or may read under its contract and its read and write scope is unchanged

### Requirement: Options are proposals that grant no authority

Choosing a stop option SHALL authorize only the named action, inside the gates that action already carries: safe-operations confirmations, commit gates, and recovery budgets stay in force. No option SHALL grant a retry budget; apply's authorized Step retry remains the only grant. An option that involves a destructive operation SHALL name it so its confirmation fires. Contract-pinned stop texts, report layouts, and existing choice prompts SHALL stay byte-identical.

#### Scenario: User selects an option that involves a destructive operation
- **WHEN** the user selects a stop option whose action involves a destructive operation
- **THEN** only that named action is authorized and the safe-operations confirmation for it still fires

### Requirement: Options are presented through the native picker

Stop options SHALL be presented with the native picker per `@sai/policies/question-context.md`, with context before the picker and a short picker. A free-text reply (the picker's "Other" entry) SHALL be treated as the user's own instruction and not as an invalid option.

#### Scenario: User answers with free text
- **WHEN** the user replies to the stop-options picker with free text
- **THEN** the reply is treated as the user's own instruction and not rejected as an invalid option

### Requirement: Stop-options rule is single-sourced and loaded only on a stop

The rule SHALL live in one policy, `sai/policies/stop-options.md`, reached through a conditional pointer in `sai/orchestration/command-runner.md` placed right after the `public-chat.md` line: "When a run stops on an error or an unexpected condition, Fetch @sai/policies/stop-options.md and close the stop with its options." The policy SHALL load only on a stop, SHALL name no harness so Claude Code and opencode behave identically, and SHALL be installed by the existing `sai-policies` projection without a change to `sai/install-manifest.json`.

#### Scenario: Run finishes cleanly
- **WHEN** a run finishes without stopping on an error or an unexpected condition
- **THEN** the stop-options policy is not fetched and costs no context

#### Scenario: Run stops on an error
- **WHEN** a run stops on an error or an unexpected condition
- **THEN** the command runner's conditional pointer causes `@sai/policies/stop-options.md` to be fetched and the stop is closed with its options
