## ADDED Requirements

### Requirement: Caveman suspension during crystallization output

When the agent determines that an idea is ready to crystallize and begins printing the "Ready to Propose" block, caveman mode (regardless of current intensity level: lite, full, or ultra) SHALL be suspended for the entire duration of that output block, including the instruction to open a new chat that follows it. The suspension is temporary: caveman mode resumes at its previous intensity level immediately after the crystallization output is complete.

This requirement exists because the "Ready to Propose" block is a handoff artifact — it will be copy-pasted into a new chat and used as the sole input to `/sai-1-spec`. Compressed or fragmented language in that block risks losing constraints, omitting key context, or producing an ambiguous spec. The cost of verbosity here is low; the cost of an incomplete handoff is high.

#### Scenario: Caveman active when idea crystallizes

- **WHEN** the user is in explore mode with caveman mode active (any level) and the agent determines the idea is clear enough to crystallize
- **THEN** the agent suspends caveman mode before printing the "Ready to Propose" block, writes the block and the follow-up instruction in plain, complete prose, then resumes caveman at its prior intensity level for any subsequent response

#### Scenario: Caveman inactive when idea crystallizes

- **WHEN** the user is in explore mode without caveman mode active and the agent determines the idea is clear enough to crystallize
- **THEN** the agent prints the "Ready to Propose" block in plain prose as normal — no behavior change

---

### Requirement: Full verbosity for crystallization output

When printing the "Ready to Propose" block, the agent SHALL write at whatever length and depth is necessary to convey the idea faithfully. There is no token budget constraint or length cap during this output.

Concretely, this means:

- **What** and **Why** fields: MUST be complete sentences with enough context that a reader unfamiliar with the current conversation can understand the intent.
- **Capabilities in scope**: MUST include enough detail per capability that downstream spec generation does not require re-asking clarifying questions.
- **Key constraints**: MUST enumerate non-goals and assumptions explicitly, not implicitly.
- **Examples**: MAY be included inline when they materially reduce ambiguity. An example is warranted when the field describes behavior that could be interpreted in two or more different ways without one. Examples are not required when the description is already unambiguous.

#### Scenario: Complex idea requires detailed capabilities description

- **WHEN** the crystallized idea involves a capability with non-trivial behavioral rules (e.g., conditional logic, multiple modes, or interaction between components)
- **THEN** the agent writes the capability description at whatever length fully captures that behavior, including a concrete example if the behavior would otherwise be ambiguous

#### Scenario: Simple idea does not need examples

- **WHEN** the crystallized idea is straightforward and all fields are unambiguous without examples
- **THEN** the agent does NOT add examples — verbosity is permitted, not mandated

---

### Requirement: Crystallization output boundaries

The verbosity and caveman-suspension rules apply exclusively to:

1. The "Ready to Propose" structured block itself (from the `## Ready to Propose` header through the last bullet point of **Key constraints**)
2. The immediate follow-up sentence instructing the user to open a new chat and run `/sai-1-spec`

They do NOT apply to any other part of the explore session. Exploratory back-and-forth before crystallization remains subject to normal caveman intensity rules.

#### Scenario: Post-crystallization conversation

- **WHEN** after printing the "Ready to Propose" block, the user continues the conversation (e.g., asks a follow-up question or requests a modification)
- **THEN** caveman mode resumes at its prior intensity level and verbosity rules revert to normal explore-mode behavior
