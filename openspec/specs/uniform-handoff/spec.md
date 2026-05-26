## ADDED Requirements

### Requirement: sai-1-handoff
`instructions/sai/spec.propose.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Specs ready in openspec/changes/{name}/. Review and run /sai-2-design {name} when ready.`

#### Scenario: sai-1 handoff fires on completion
- **WHEN** the sai-1 step completes and spec.propose.md is followed to its end
- **THEN** the agent stops and prints the sai-1 handoff text verbatim, substituting the actual change name for `{name}`

### Requirement: sai-2-handoff
`instructions/sai/design.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Design and tasks ready in openspec/changes/{name}/. Review and run /sai-3-implement {name} when ready.`

#### Scenario: sai-2 handoff fires on completion
- **WHEN** the sai-2 step completes
- **THEN** the agent stops and prints the sai-2 handoff text verbatim

### Requirement: sai-3-handoff
`instructions/sai/implement.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Implementation plan ready in openspec/changes/{name}/. Review and run /sai-4-apply {name} when ready.`

#### Scenario: sai-3 handoff present in implement.md
- **WHEN** `instructions/sai/implement.md` is read
- **THEN** the final STOP+print block contains the sai-3 handoff text

### Requirement: sai-4-handoff
`instructions/sai/apply.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Implementation done in openspec/changes/{name}/. Run /sai-5-review {name} when ready.`

#### Scenario: sai-4 handoff present in apply.md
- **WHEN** `instructions/sai/apply.md` is read
- **THEN** the final STOP+print block contains the sai-4 handoff text

### Requirement: sai-5-handoff
`instructions/sai/review.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Code review ready in openspec/changes/{name}/. Review and run /sai-6-security {name} when ready.`

#### Scenario: sai-5 handoff present in review.md
- **WHEN** `instructions/sai/review.md` is read
- **THEN** the final STOP+print block contains the sai-5 handoff text

### Requirement: sai-6-handoff
`instructions/sai/security.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Security audit ready in openspec/changes/{name}/. Review and run /sai-7-performance {name} when ready.`

#### Scenario: sai-6 handoff present in security.md
- **WHEN** `instructions/sai/security.md` is read
- **THEN** the final STOP+print block contains the sai-6 handoff text

### Requirement: sai-7-handoff
`instructions/sai/performance.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Performance audit ready in openspec/changes/{name}/. Review and run /sai-8-accessibility {name} when ready.`

#### Scenario: sai-7 handoff present in performance.md
- **WHEN** `instructions/sai/performance.md` is read
- **THEN** the final STOP+print block contains the sai-7 handoff text

### Requirement: sai-8-terminal-handoff
`instructions/sai/accessibility.md` SHALL end with a mandatory STOP+print block that outputs exactly:
`Accessibility audit ready in openspec/changes/{name}/. Audit chain complete.`
It SHALL NOT reference `/sai-commit`, `/sai-pr`, or any next sai step.

#### Scenario: sai-8 terminal handoff fires
- **WHEN** the sai-8 step completes
- **THEN** the agent prints the terminal handoff text and does not suggest a next command

#### Scenario: sai-8 handoff is terminal
- **WHEN** `instructions/sai/accessibility.md` is read
- **THEN** the STOP+print text contains "Audit chain complete." and no `/sai-` command reference

### Requirement: handoff-placement
The STOP+print block SHALL be the last substantive section in each step instruction file, after all other content.

#### Scenario: no content after handoff
- **WHEN** any of the 8 step instruction files is read
- **THEN** no requirement, scenario, or instruction text follows the STOP+print block

### Requirement: no-handoff-in-nonnumbered
Non-numbered instruction files (commit.md, pr.md, and explore/archive instruction files) SHALL NOT receive a STOP+print handoff block.

#### Scenario: commit.md unchanged
- **WHEN** `instructions/sai/commit.md` is read
- **THEN** it contains no STOP+print handoff block matching the uniform-handoff pattern
