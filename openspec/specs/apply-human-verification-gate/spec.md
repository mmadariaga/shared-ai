# apply-human-verification-gate Specification

## Purpose
TBD - created by archiving change enhanced-apply-steps. Update Purpose after archive.
## Requirements
### Requirement: Agent SHALL present Human Verification checklist to user before marking items complete

When a step in `implementation.md` contains Human Verification checks, the apply agent MUST present those checks as a checklist to the user and wait for explicit confirmation before marking any of them `[x]`.

#### Scenario: Step has Human Verification checks
- **WHEN** the agent reaches a step that contains one or more Human Verification items
- **THEN** the agent presents the checklist to the user and waits — it does NOT mark any Human Verification item `[x]` until the user confirms they have reviewed

#### Scenario: User confirms Human Verification
- **WHEN** the user confirms they have reviewed the Human Verification items and asks to continue
- **THEN** the agent marks all Human Verification checks `[x]` in `implementation.md` and proceeds to the commit proposal

#### Scenario: Step has no Human Verification checks
- **WHEN** a step contains only Automated checks (no Human Verification section)
- **THEN** this gate does not apply — the agent proceeds directly to the commit proposal after automated checks pass

