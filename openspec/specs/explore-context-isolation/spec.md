# explore-context-isolation Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements
### Requirement: explore-no-inline-proposal

`sai-explore` SHALL NOT create a change proposal or run `/sai-1-spec` inline during an explore session. When an idea becomes solid, `sai-explore` SHALL emit a one-line readiness signal (per the `explore-crystallization-on-demand` capability) instead of auto-printing a block. It SHALL offer the structured summary block (or, for sliced features, an ordered set of blocks) that the user can copy and paste into `/sai-1-spec` in a new session ONLY when the user explicitly asks to crystallize. The block content and the isolation guarantee — no inline `/sai-1-spec` execution — are unchanged; only the emission trigger becomes on-demand.

The single-change summary block SHALL contain:
- **Change name** (suggested kebab-case)
- **What**: one or two sentences describing the change
- **Why**: one or two sentences stating the motivation
- **Capabilities in scope**: bullet list of proposed capabilities with brief descriptions
- **Key constraints**: bullet list of constraints or non-goals surfaced during exploration

For sliced features, the slicing assessment and the sliced crystallization protocol are governed by the `explore-vertical-slicing` capability.

#### Scenario: idea crystallizes during exploration (single change)

- **WHEN** the user's idea becomes clear enough to propose during a `sai-explore` session, the idea fits a single change per the slicing assessment, AND the user explicitly asks to crystallize (for example, asks for the paste-ready block or to create a proposal / run `/sai-1-spec`)
- **THEN** `sai-explore` presents a structured summary block (formatted for copy-paste) and instructs the user to open a new chat and run `/sai-1-spec` with the content — it does NOT call or execute `/sai-1-spec` in the current session

#### Scenario: idea becomes clear without an explicit crystallize request

- **WHEN** the user's idea becomes clear enough to propose but the user has NOT explicitly asked to crystallize
- **THEN** `sai-explore` emits the one-line readiness signal only (per the `explore-crystallization-on-demand` capability) and does NOT present the structured summary block

#### Scenario: user explicitly asks to create a proposal inline

- **WHEN** a user says "create a proposal" or "run /sai-1-spec" while in a `sai-explore` session
- **THEN** `sai-explore` explains that creating a proposal opens a new context and offers the paste-ready block(s) instead, so the user can start that new session cleanly

---

### Requirement: explore-context-preserved

`sai-explore` MUST NOT execute any write-producing slash command or skill that transitions out of explore mode. The explore session SHALL remain a read-and-discuss context until the user explicitly ends it.

#### Scenario: explore session stays in explore mode

- **WHEN** a `sai-explore` session is active
- **THEN** no `/sai-1-spec`, `/sai-2-design`, or other write-producing sai-* command is invoked within the same session

