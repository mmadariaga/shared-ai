# sai-build-command Specification

## Purpose
Provide a routed implement-then-apply composition command for one OpenSpec change.

## Requirements

### Requirement: Build is a routed two-phase composition coordinator

The `/sai-build` command SHALL use one ordinary routed coordinator card and the shared chained composition contract, declaring exactly three segments in order: implementation (`/sai-3-implement`) at position 0, review (`/sai-4-review`) at position 1, and implementation again for the selected findings at position 2. It SHALL not use explore supervision, conversation-held dispatch state, a new orchestration primitive, or a build-only design approval gate.

#### Scenario: Build card declares implement then apply

- **WHEN** the `/sai-build` coordinator card is read
- **THEN** its segments are `/sai-3-implement`, `/sai-4-review`, and `/sai-3-implement` again, and none of them is an apply segment

#### Scenario: Build card declares implement, review, then fix
- **WHEN** `/sai-build` starts
- **THEN** the shared runner executes implementation, then review, then the findings fix segment

### Requirement: Change resolution and envelopes are shared

The coordinator SHALL pass the same `arguments_value` string to every segment and SHALL resolve nothing itself: each segment resolves the change in its own Start step. No segment SHALL re-enter a wrapper, and no segment SHALL re-run the change picker once the change name is resolved.

#### Scenario: Both phases receive one resolved name

- **WHEN** resolution yields `{name}`
- **THEN** every segment receives `{name}` as its `arguments_value`, and no segment is re-entered through a wrapper

#### Scenario: Every segment receives one argument value
- **WHEN** `/sai-build` runs with a change name
- **THEN** each segment is invoked with the same `arguments_value` and none is re-entered through a wrapper

### Requirement: Build strips residual fast-track tokens before resolution

Before resolution, every `--fast-track` token SHALL be removed from `arguments_value` in any order, by the first implementation segment's Start step. This SHALL not make build a fifth parser or create build-local fast-track state.

#### Scenario: Flag is absent from picker input
- **WHEN** `/sai-build --fast-track oauth2-auth` is invoked
- **THEN** resolution receives only `oauth2-auth`

### Requirement: Successful implement transitions immediately

A completed implementation segment that is not the last one SHALL communicate its outcome, then activate the next segment immediately, without printing standalone implement completion text or an intermediate approval gate.

#### Scenario: No intermediate gate
- **WHEN** implement completes successfully under build
- **THEN** the review segment activates immediately and no standalone `Implement done.` line is printed

### Requirement: Phase-one failure blocks apply

A blocked, stopped, or failed segment SHALL end the run without starting any later segment, print its report, and print no closing line. The supervisor SHALL report the observed partial work and commits and the reason for the stop in that one report, and SHALL invent no review finding and no success line. Build SHALL print no closing line for a run that did not complete.

#### Scenario: Failed implement stops build
- **WHEN** the first implementation segment returns failed
- **THEN** build prints the segment's report, starts no review segment, and prints no closing line

#### Scenario: Interrupted Build closes without success
- **WHEN** an interruption actually ends Build before its final segment completes
- **THEN** the supervisor identifies the interruption and the observed remaining work and commits in its report without a success line or invented review findings

### Requirement: Re-entry uses implement collapse

Re-entry after interruption or partial fixing SHALL start at the implementation segment again, and that segment's Resuming section SHALL decide the outcome. Build SHALL never resume a later segment directly and SHALL NOT restate implement's resume classifications. The implementation segment SHALL resume at the first unchecked task.

#### Scenario: Pending Steps re-entry continues into apply

- **WHEN** the implementation segment of a re-run over a partly implemented change ends completed
- **THEN** build continues with the review segment, and no apply segment activates

#### Scenario: Incomplete re-entry blocks apply

- **WHEN** the implementation segment of a re-run ends failed or blocked
- **THEN** no later segment starts, and build prints the segment's report without `Build done.`

#### Scenario: Pending tasks re-entry continues into review
- **WHEN** the implementation segment of a re-run over a partly implemented change ends completed
- **THEN** build continues with the review segment

#### Scenario: Blocked re-entry stops the run
- **WHEN** the implementation segment of a re-run ends blocked because an escalation is unresolved
- **THEN** no later segment starts

### Requirement: Apply stops and worker isolation remain unchanged

Build SHALL preserve the implementation segment's escalation stops, its three-attempt obstacle budgets, RED blindness to GREEN, and GREEN's test-file prohibition. It SHALL dispatch only the existing RED and GREEN workers and the review worker, and SHALL add no build worker or matrix entry. When an obstacle of an implementation segment exhausts its three attempts, the implement coordinator SHALL escalate through the native picker before marking, committing, or advancing; build SHALL NOT present a second choice, restart a segment, or mint a second retry grant.

#### Scenario: Non-removable stop prevents completion
- **WHEN** a segment reaches a retained stop
- **THEN** build ends without successful final completion and checkbox state remains the recovery record

#### Scenario: Build delegates exhausted-Step recovery to apply

- **WHEN** the implementation segment reaches an exhausted obstacle budget during Build
- **THEN** the implement coordinator presents the escalation picker while Build adds no second prompt, grant, or restart

#### Scenario: Build delegates exhausted-obstacle recovery to implement
- **WHEN** the implementation segment reaches an exhausted obstacle budget during Build
- **THEN** the implement coordinator presents the escalation picker while Build adds no second prompt, grant, or restart

#### Scenario: Authorized Build retry resumes only apply

- **WHEN** the user answers `continue` to the implement escalation inside Build
- **THEN** only the blocked step resumes with its obstacle counter reset, and the completed steps and earlier attempt history are retained

#### Scenario: Authorized continue resumes only the blocked step
- **WHEN** the user answers `continue` to the implement escalation inside Build
- **THEN** the implementation segment resumes only the blocked step with that obstacle's counter reset, and retains the completed steps and earlier attempt history

### Requirement: Final navigation is apply completion

When the run completes, build SHALL print the finding counts from the review's `Summary:` tally by category, then the Fixed, Excluded, Left open, and Questions lists where they have entries, then the review's `## Recommended Audits` block verbatim, and end with exactly `Build done.`. It SHALL run no audit and SHALL NOT chain another segment. The resolved change name SHALL replace `{name}` wherever it appears. A run that stops SHALL end without `Build done.`.

#### Scenario: Successful build closes at review navigation

- **WHEN** every segment that ran completes and the review has findings
- **THEN** build prints the finding counts, the lists where present, and the review's `## Recommended Audits` block, and the run ends with `Build done.`

#### Scenario: Successful build closes with Build done
- **WHEN** every segment that ran completes and the review has findings
- **THEN** build prints the counts, the lists where present, the recommended audits block verbatim, and ends with `Build done.`

#### Scenario: Completion guidance describes conditional audits

- **WHEN** build prints its successful final completion message
- **THEN** it offers the audits in the review's `## Recommended Audits` block, chosen from the review's findings rather than an unconditional audit suite, and runs none of them

#### Scenario: Recommended audits are offered, not run
- **WHEN** build prints its successful close
- **THEN** it prints the recommended audits block verbatim and runs no audit

#### Scenario: No successful final completion transition
- **WHEN** build stops without completing its final segment
- **THEN** build does not print `Build done.` and uses the stopped-run guidance of its coordinator
