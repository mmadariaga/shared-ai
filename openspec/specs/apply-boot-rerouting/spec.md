# apply-boot-rerouting Specification

## Purpose

Defines the boot-adapter re-routing that moves `apply` from the utility-name list to the routed-name list in both harness boot adapters, so `/sai-4-apply` selects its coordinator card instead of its utility body card.

## Requirements

### Requirement: apply-is-a-routed-boot-name

Both `sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md` SHALL classify `apply` as a routed name: the routed-name list SHALL include `apply` and the utility-name list SHALL exclude it. Selecting `apply` SHALL fetch `@sai/commands/apply/coordinator.md`. The `utility names (apply, archive, ...)` enumerations SHALL be updated to remove `apply`, and any prose stating that `apply` selects `@sai/commands/apply/body.md` SHALL be removed.

#### Scenario: Claude boot adapter routes apply

- **WHEN** the Claude Code boot adapter receives `command_name: apply`
- **THEN** it selects `@sai/commands/apply/coordinator.md` as a routed card

#### Scenario: opencode boot adapter routes apply

- **WHEN** the opencode boot adapter receives `command_name: apply`
- **THEN** it selects `@sai/commands/apply/coordinator.md` as a routed card

#### Scenario: apply is absent from the utility enumerations

- **WHEN** either boot adapter's utility-name list is inspected
- **THEN** `apply` does not appear in it

### Requirement: routed-apply-enters-the-worker-lifecycle

Because `apply` becomes a routed card, the boot adapters' statement that "utility cards never enter a worker lifecycle" SHALL no longer apply to `apply`: the routed apply coordinator SHALL dispatch the RED and GREEN workers through their bindings, per the neutral `command-runner.md` protocol. The boot adapters SHALL use `command_name` for card selection and forward `arguments_value` byte-for-byte to the apply coordinator.

#### Scenario: apply dispatches managed workers

- **WHEN** the apply coordinator routes a Step
- **THEN** it dispatches the RED and/or GREEN worker through the active apply worker binding, entering the worker lifecycle

#### Scenario: envelope forwarding is unchanged

- **WHEN** the boot adapter selects the apply coordinator
- **THEN** it forwards `arguments_value` byte-for-byte, keeping continuation and dispatch metadata adapter-owned
