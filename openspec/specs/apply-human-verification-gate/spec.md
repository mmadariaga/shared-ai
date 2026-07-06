# apply-human-verification-gate Specification

## Purpose
TBD - created by archiving change enhanced-apply-steps. Update Purpose after archive.
## Requirements
### Requirement: Agent SHALL present Human Verification checklist to user before marking items complete

When a step in `implementation.md` has a Human section containing at least one `- [ ]` checkbox, the apply agent MUST present those checks as a checklist to the user and wait for explicit confirmation before marking any of them `[x]`. The gate keys on **checkbox count**, not on the presence of a `**Human (...)**` header: a Human section that contains zero `- [ ]` checkboxes (for example, one holding only an italic explanatory note), or a step with no Human section at all, does NOT trigger the gate — the agent proceeds directly to the commit proposal after automated checks pass.

#### Scenario: Step has Human Verification checks
- **WHEN** the agent reaches a step whose Human section contains one or more `- [ ]` checkboxes
- **THEN** the agent presents the checklist to the user and waits — it does NOT mark any Human Verification item `[x]` until the user confirms they have reviewed

#### Scenario: User confirms Human Verification
- **WHEN** the user confirms they have reviewed the Human Verification items and asks to continue
- **THEN** the agent marks all Human Verification checks `[x]` in `implementation.md` and proceeds to the commit proposal

#### Scenario: Step has no Human Verification checks
- **WHEN** a step contains only Automated checks (no Human Verification section)
- **THEN** this gate does not apply — the agent proceeds directly to the commit proposal after automated checks pass

#### Scenario: Human section has zero checkboxes
- **WHEN** a step's Human section contains no `- [ ]` checkbox — for example, it holds only an italic explanatory note such as `*(No Human checks — service-side step with no observable browser behavior.)*`
- **THEN** this gate does not apply — the agent treats the step as having no human checks, does not pause for confirmation, and proceeds directly to the commit proposal after automated checks pass

