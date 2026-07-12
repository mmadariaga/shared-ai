# spec-quality Specification

## ADDED Requirements

### Requirement: Decision summary printed at end of spec phase

When `sai/commands/sai-1-spec.md` reaches its Completion section, the agent SHALL print a structured decision summary to the screen before the mandatory stop message. The summary is derived exclusively from the artifacts just written (`proposal.md` and `specs/**/*.md`) — not from prior conversation.

The summary SHALL contain two blocks:
- **Scope**: one line per capability listed in the proposal's Capabilities section (new and modified).
- **Requirements**: one line per requirement across all spec files, grouped by capability.

#### Scenario: Summary printed before mandatory stop message
- **WHEN** the agent has written all spec artifacts and reaches the Completion section
- **THEN** the agent SHALL print the decision summary first, then print the mandatory stop message ("Spec proposal done in openspec/changes/{name}/...") as the LAST line

#### Scenario: Summary respects hard line cap
- **WHEN** the decision summary is composed
- **THEN** the total output SHALL NOT exceed 15 lines (excluding blank separator lines)

#### Scenario: Summary is derived from artifacts, not conversation
- **WHEN** the agent generates the decision summary
- **THEN** every line in the summary SHALL trace to content in `proposal.md` or `specs/**/*.md` just written; no information from prior conversation SHALL appear

### Requirement: One line per decision in summary

Each capability in the Scope block and each requirement in the Requirements block SHALL be expressed in exactly one line. No multi-line descriptions.

#### Scenario: Scope block has one line per capability (when items fit under the cap)
- **WHEN** the proposal lists 3 capabilities (2 new, 1 modified) AND the total scope+requirements count is within the 15-line cap
- **THEN** the Scope block SHALL contain exactly 3 lines, one per capability

#### Scenario: Requirements block has one line per requirement (when items fit under the cap)
- **WHEN** a spec file defines 4 requirements AND the total scope+requirements count is within the 15-line cap
- **THEN** the Requirements block for that capability SHALL contain exactly 4 lines

#### Scenario: Empty blocks are omitted
- **WHEN** the proposal declares zero modified capabilities, or zero requirements for a given capability
- **THEN** the corresponding empty Scope or Requirements subsection SHALL be omitted entirely; the block header is not printed as an empty shell

### Requirement: Items omitted under the hard cap are signaled

When the total count of scope and requirements items would exceed the hard 15-line cap, the agent SHALL compress by trimming only the largest block(s) (preserving the highest-priority items — capabilities before requirements), reserve one slot for a single trailing signal line of the form `+N more — see openspec/changes/{name}/specs/**` (where N is the count of omitted items), and emit that signal line as the last line of the summary block. Silent drops are forbidden.

#### Scenario: Overflow produces a signal line
- **WHEN** the change has more than 15 scope+requirements items combined
- **THEN** the summary SHALL print up to 14 content lines plus one `+N more — see …` line, never exceeding 15 non-blank lines total, and SHALL NOT silently omit items without the signal

#### Scenario: No overflow when items fit
- **WHEN** the change has 15 or fewer scope+requirements items combined
- **THEN** the summary SHALL print exactly one line per item with no `+N more` signal

### Requirement: Proposal-to-spec self-consistency gate at Completion

When `sai/commands/sai-1-spec.md` reaches its Completion section, the agent SHALL reconcile the proposal narrative against the specs before printing the decision summary, so that no statement in `proposal.md` contradicts a requirement or scenario in `specs/**/*.md`. The reconciliation SHALL reuse the artifact re-read that already produces the decision summary — it adds no I/O beyond that re-read.

The specs' requirements and scenarios are normative. When a proposal statement and a spec requirement/scenario contradict each other, the agent SHALL reconcile by adjusting the proposal narrative to the spec — not the spec to the proposal — and SHALL note in the decision summary that a reconciliation correction was made, so the correction is not invisible to the user. When it is genuinely ambiguous which side reflects the user's intent, the agent SHALL NOT guess or silently correct either artifact; it SHALL instead raise a visible warning to the user (the same additive, gate-adjacent warning defined for source divergences below) and let the user decide.

The absence of spec coverage is NOT a contradiction: a proposal note describing something intentionally deferred, out of scope, or left to a future iteration — where the specs are simply silent — SHALL NOT be flagged as an inconsistency.

This behavior is harness-agnostic: it applies identically under Claude, opencode, and Copilot.

#### Scenario: Proposal aspiration contradicts a spec literal, spec is normative
- **WHEN** the proposal asserts a behavior (for example, "source the model default from a config file") that contradicts a requirement or scenario in `specs/**` (for example, a spec that pins a hardcoded literal default)
- **THEN** the agent SHALL treat the spec as normative, reconcile by adjusting the proposal narrative to the spec, note the correction in the decision summary, and print it before the mandatory stop message

#### Scenario: Ambiguous intent is surfaced, not guessed
- **WHEN** a proposal statement and a spec requirement/scenario contradict each other AND it is genuinely ambiguous which side reflects the user's intent
- **THEN** the agent SHALL NOT silently correct either artifact, and SHALL raise the visible gate-adjacent warning naming both sides and their locations, leaving the user to decide

#### Scenario: Deferred or out-of-scope note is not a contradiction
- **WHEN** the proposal carries a note describing something intentionally deferred, out of scope, or left to a future iteration, and the specs are simply silent on it (no requirement or scenario asserts the opposite)
- **THEN** the agent SHALL NOT flag it as an inconsistency and SHALL make no correction

#### Scenario: Reconciliation reuses the decision-summary re-read
- **WHEN** the agent performs the Completion-phase self-consistency reconciliation
- **THEN** it SHALL operate on the same re-read of `proposal.md` and `specs/**/*.md` that produces the decision summary, without performing additional exploration reads

#### Scenario: Consistent artifacts pass the gate unchanged
- **WHEN** no statement in `proposal.md` contradicts any requirement or scenario in `specs/**`
- **THEN** the agent SHALL make no correction and proceed directly to the decision summary

### Requirement: Source-grounding of spec-pinned literals

When a spec written during the change pins a literal string — a value the requirement or scenario reproduces verbatim (a message string, config key, path, or flag), most commonly in a MODIFIED requirement, and also in an ADDED requirement that quotes an existing source string — the agent SHALL classify the literal as **preserved**, **introduced**, or **ambiguous** before grounding:
- **Preserved** — a value the spec restates WITHOUT intending to change it. Two forms: (i) a MODIFIED requirement whose pinned value equals its prior spec baseline value (the spec touches surrounding wording but leaves the literal unchanged), or (ii) an ADDED requirement quoting an existing source string unchanged. A preserved literal SHALL match current source; a divergence from current source is a drift bug.
- **Introduced** — the new value the change intends to establish as its purpose. Two forms: (i) a MODIFIED requirement whose pinned value differs from its prior spec baseline value (by definition changing the literal — current source still holds the OLD value, so a divergence from current source is EXPECTED, it is the change itself, not a drift bug), or (ii) a new ADDED requirement introducing a literal that did not exist before (in which case current source has nothing to compare against — the not-found path applies, not divergence).
- **Ambiguous** — when preserved vs introduced cannot be determined from the spec text plus the change's own proposal/scope.

Classification is derived from the spec's own text (the MODIFIED requirement's pinned new value vs its prior-baseline value; whether an ADDED requirement is framed as "quote existing source" vs first introduction) — no read beyond the grounding targeted read is required for classification.

The agent SHALL verify the pinned literal against the current project source, not only against the prior spec baseline. Verification SHALL use a targeted read or grep for the specific literal (the existing Cost Discipline single-known-file / targeted-symbol-search exception); broad exploration is forbidden and the budget rules stay intact. The check SHALL fire only within the literals the phase is already grounding — the values it pins and the MODIFIED requirements it touches — never a full spec-vs-source audit of unrelated specs. When no spec-pinned literal exists, no source read is required. This behavior is harness-agnostic: it applies identically under Claude, opencode, and Copilot.

When the verification finds the spec-pinned literal and the current source contradicting each other, the agent's reaction depends on the classification:
- **Preserved** — the agent SHALL NOT silently reconcile the divergence or auto-prefer either side. It SHALL instead raise a visible warning to the user that names (a) the spec assertion and its location (spec file + requirement/scenario), (b) the divergent source value and its location (file:line), and (c) a one-line statement that the two disagree. The contradiction is signal — the spec may be stale or the source may be wrong — and the user decides which.
- **Introduced** — the divergence from current source is the expected and intended behavior of the change, not a drift bug. The agent SHALL NOT raise the divergence warning. (When the introduced literal genuinely does not yet exist in source — a new ADDED requirement's first introduction — the agent reports `could not ground literal <X>: not found` per the grounding not-found path, not a divergence.)
- **Ambiguous** — the agent SHALL fall through to the SAME warning defined for the preserved case (the same additive, gate-adjacent warning defined for source divergences below), matching the "Ambiguous intent is surfaced, not guessed" handling of the proposal-to-spec self-consistency gate above — surface the divergence and let the user decide; do not guess.

The warning is additive and SHALL NEVER be silently swallowed, and it SHALL be surfaced immediately adjacent to the feedback gate — printed just before the gate or referenced in the gate prompt — so it cannot be scrolled past above the interactive gate.

#### Scenario: Preserved spec-pinned literal contradicts the current source
- **WHEN** a PRESERVED spec-pinned literal (for example, an intro line fixed by a MODIFIED requirement whose pinned value equals its prior spec baseline value, leaving the literal unchanged) differs from the current source value found by the targeted read/grep
- **THEN** the agent SHALL NOT auto-prefer or silently reconcile either side, and SHALL raise a visible warning naming the spec assertion and its location, the divergent source value and its `file:line`, and a one-line statement that they disagree, leaving the user to resolve which side is wrong

#### Scenario: Introduced spec-pinned literal diverges as an intended change — no warning
- **WHEN** an INTRODUCED spec-pinned literal (a MODIFIED requirement whose pinned value differs from its prior spec baseline value — the change's purpose is to set that literal) diverges from the current source value (current source still holds the OLD value)
- **THEN** the agent SHALL NOT raise the divergence warning — the divergence is the expected and intended behavior of the change, not a drift bug. Raising the warning on every intentional literal change would alarm-fatigue users into dismissing the warning and silently re-open the defect this rule exists to catch.

#### Scenario: Ambiguous preserved-vs-introduced classification falls through to the warning
- **WHEN** a spec-pinned literal diverges from current source AND preserved-vs-introduced classification is genuinely ambiguous from the spec text plus the change's own proposal/scope
- **THEN** the agent SHALL NOT silently suppress the divergence AND SHALL NOT silently correct either side; it SHALL fall through to the same additive, gate-adjacent warning defined for the preserved case, treating the divergence as ambiguous and surfacing it for the user to decide — matching the "Ambiguous intent is surfaced, not guessed" handling of the proposal-to-spec self-consistency gate above

#### Scenario: Warning is additive, never swallowed
- **WHEN** a spec-vs-source contradiction is detected during grounding
- **THEN** the warning SHALL be surfaced to the user in addition to any other Completion output, and SHALL NOT be suppressed, auto-resolved, or hidden by the agent

#### Scenario: Warning is placed adjacent to the feedback gate
- **WHEN** a contradiction warning (spec-vs-source divergence, or an ambiguous proposal-vs-spec contradiction) is raised at Completion
- **THEN** it SHALL be surfaced immediately adjacent to the feedback gate — printed just before the gate or referenced in the gate prompt — so it is not scrolled past above the interactive gate

#### Scenario: ADDED requirement quoting existing source is grounded
- **WHEN** an ADDED requirement quotes a literal string that already exists in the project source
- **THEN** the agent SHALL verify that literal against the current source via a targeted read/grep before pinning it, raising the contradiction warning if the two diverge

#### Scenario: Grounding stays within cost discipline
- **WHEN** the agent verifies a spec-pinned literal
- **THEN** it SHALL perform only a targeted read or grep for that specific literal and SHALL NOT perform broad exploration

#### Scenario: Grounding does not audit unrelated specs
- **WHEN** the agent grounds spec-pinned literals
- **THEN** it SHALL check only the literals the phase pins or the MODIFIED requirements it touches, and SHALL NOT perform a full spec-vs-source audit of unrelated specs

#### Scenario: No literal, no read
- **WHEN** the specs written during the change pin no literal string against project source
- **THEN** the agent SHALL NOT perform any source-grounding read
