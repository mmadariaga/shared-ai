## ADDED Requirements

### Requirement: sai-status resolves a missing change name via change-picker

When `/sai-status` is invoked with no change name, the command SHALL inherit the existing `change-picker.md` resolution machinery (the 0/1/N flow driven by `openspec list --json`) exactly as the other change-consuming `sai-*` commands do, without introducing a new resolution mechanism.

#### Scenario: no change name provided
- **WHEN** `/sai-status` is invoked with empty `$ARGUMENTS` and no wrapper-echo change-name line
- **THEN** the command runs `change-picker.md` and resolves the change name through its 0/1/N flow before printing any panel

#### Scenario: change name provided
- **WHEN** `/sai-status <change-name>` is invoked with a non-empty change name
- **THEN** the change-picker is a no-op and the panel is printed for the provided change

### Requirement: sai-status joins the change-picker consumer list

`sai-status` SHALL be added to the consumer list documented in `sai/instructions/change-picker.md`, bringing the documented consumer count from 9 to 10. No `change-picker.md` resolution logic SHALL be modified — only the consumer name is added.

#### Scenario: consumer list includes sai-status
- **WHEN** the consumer list in `sai/instructions/change-picker.md` is read
- **THEN** `sai-status` appears in the list and the list enumerates 10 consumers

#### Scenario: change-picker logic unchanged
- **WHEN** the `change-picker.md` resolution steps are compared before and after this change
- **THEN** only the consumer enumeration differs; the wrapper-echo, invocation-trigger, and 0/1/N steps are unchanged
