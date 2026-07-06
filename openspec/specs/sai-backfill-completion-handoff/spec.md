## ADDED Requirements

### Requirement: Completion MUST emit a Ready to Archive block

`/sai-backfill` MUST end its completion by printing a `## Ready to Archive` block that names the change and prints the next command. The block MUST replace the current "To archive the change, run `/sai-archive {name}`" line. The block MUST be the LAST output of the command, after any decision summary, summary statistics, or final status line, and MUST be a paste-ready handoff into a fresh chat — not an in-context auto-execution of `/sai-archive`.

The block is a minimal handoff, NOT a recap of the proposal. The `## Ready to Propose` block from `sai/instructions/explore.md:42-53` is the *input* to `/sai-1-spec` and therefore must include What/Why/Capabilities/Key constraints; the `## Ready to Archive` block is the *handoff* to `/sai-archive`, which only needs the change name — the proposal.md the agent just wrote already contains the full context for the user to see.

#### Scenario: Block contains name and next command

    - **WHEN** the agent reaches the Completion section after writing all backfill artifacts
    - **THEN** the agent MUST print a `## Ready to Archive` block containing exactly:
        - a `## Ready to Archive` heading,
        - a `**Change name**: {name}` line, and
        - a line of the form `**Open a new chat** and run \`/sai-archive {name}\`.`

    The block MUST NOT require What/Why/Capabilities/Key constraints fields. The agent MAY include additional optional context, but the only required content is the heading, the change name, and the next-command line.

#### Scenario: Block names the actual change

    - **WHEN** `/sai-backfill my-feature` runs to completion
    - **THEN** the printed `## Ready to Archive` block MUST contain `**Change name**: my-feature` and MUST contain `run \`/sai-archive my-feature\``

#### Scenario: Block is the final output

    - **WHEN** the agent completes `/sai-backfill`
    - **THEN** no tool call, no follow-up command, and no further prose MUST be emitted after the `## Ready to Archive` block; the agent MUST stop

### Requirement: Block is a handoff, not an auto-execution

The `## Ready to Archive` block is paste-ready text for the user to carry into a new chat. The agent MUST NOT invoke `/sai-archive` itself, MUST NOT run any archive-skill step, and MUST NOT prefetch `sai/instructions/archive.md` or `sai/commands/sai-archive.md` as part of backfill's completion. Isolation Mode discipline requires the next-phase command to start with no inherited context.

#### Scenario: No archive skill prefetched

    - **WHEN** the agent completes `/sai-backfill`
    - **THEN** the agent MUST NOT have fetched `sai/instructions/archive.md` or any archive-related skill during the backfill run

#### Scenario: No auto-execution of /sai-archive

    - **WHEN** the user has not typed `/sai-archive {name}` in a fresh chat
    - **THEN** the agent MUST NOT have invoked the archive skill, MUST NOT have called `openspec status --change "{name}" --json` for archive purposes, and MUST NOT have moved the change into `openspec/changes/archive/`
