## ADDED Requirements

### Requirement: Harness-specific adapter carve-out
The mirror discipline (the requirement that any change to `commands/claude/`, `commands/opencode/`, or `commands/copilot/` be mirrored to the other two harness directories in the same commit) recognizes one explicit exception category: a **harness-specific adapter**. A change qualifies as a harness-specific adapter when ALL of the following hold:
1. The change fills a gap in exactly one harness's wrapper or instruction set.
2. The underlying behavior difference is unique to that harness (e.g. opencode's `$ARGUMENTS` substitution is a wrapper-template-only behavior that Claude Code and Copilot do not have).
3. The fix has no meaning in the other harnesses, or would be actively wrong noise if mirrored (e.g. emitting a wrapper-echo line in Claude Code or Copilot, where `$ARGUMENTS` is substituted into the body file directly and the line is consumed by nothing).

A harness-specific adapter MAY be confined to a single harness directory and exempted from the mirror discipline. The change proposal SHALL justify the adapter category by naming the unique harness behavior, the gap being filled, and why the fix is wrong or meaningless in the other harnesses; the proposal's "What Changes" or "Additional Notes" section is the conventional location. Adapters are recorded per change and are not blanket exemptions — a future change that does not fit the three conditions above SHALL follow full mirror discipline.

#### Scenario: Adapter change is confined to one harness
- **WHEN** a change qualifies as a harness-specific adapter per the three conditions above
- **THEN** the change edits exactly one of `commands/claude/`, `commands/opencode/`, or `commands/copilot/` and SHALL NOT edit the other two harness directories in the same commit
- **AND** the change proposal names the unique harness behavior, the gap being filled, and why the fix is meaningless in the other harnesses

#### Scenario: Non-adapter change still requires full mirror
- **WHEN** a change does NOT fit all three adapter conditions (e.g. it changes cross-cutting behavior, the gap exists in two or more harnesses, or the fix is meaningful in all harnesses)
- **THEN** the change SHALL follow full mirror discipline and edit all three harness directories in the same commit

#### Scenario: Proposal justification is required
- **WHEN** a change is filed as a harness-specific adapter
- **THEN** the proposal contains an explicit justification naming (a) the unique harness behavior being adapted, (b) the gap being filled, and (c) why the fix is meaningless in the other harnesses — without that justification, the change is not a valid adapter and the mirror discipline applies

## MODIFIED Requirements

(none)

## REMOVED Requirements

(none)
