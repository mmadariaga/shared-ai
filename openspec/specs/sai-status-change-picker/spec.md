# sai-status-change-picker Specification

## Purpose

This capability records the migration of missing-name resolution from the shared change picker to the dedicated status picker, including its bulk-view behavior.

## Requirements
### Requirement: sai-status resolves missing change names via status-picker
`sai-status` SHALL resolve missing change names through the dedicated `status-picker.md`, preserving zero- and one-change behavior while allowing a bulk view when multiple changes are available.

**Reason**: Superseded by the new `status-picker` capability. `sai-status` no longer inherits `change-picker.md`; it resolves missing change names via a dedicated `status-picker.md` so it can offer a "See all" bulk view on the 2+ branch without touching the shared picker.
**Migration**: `sai/commands/status/body.md` fetches `sai/policies/status-picker.md` instead of `change-picker.md`. The 0-change and 1-change resolution behavior is preserved verbatim by `status-picker.md`; see the `status-picker` capability.

#### Scenario: Status uses its dedicated picker

- **WHEN** `sai-status` is invoked without a change name
- **THEN** it follows `status-picker.md` for resolution, including the bulk-view choice when two or more changes are available

### Requirement: sai-status is excluded from the change-picker consumer list
The shared `change-picker.md` consumer list SHALL exclude `sai-status`, whose missing-name flow is owned by `status-picker.md`.

**Reason**: Superseded by the new `status-picker` capability. With `sai-status` decoupled from `change-picker.md`, it is no longer one of that instruction's consumers, so the consumer count returns to 9.

**Migration**: Remove `sai-status` from the consumer list in `sai/policies/change-picker.md` (10 → 9). The `change-picker` capability's new consumer-scope requirement locks this exclusion; see the `change-picker` capability.

#### Scenario: Shared picker excludes status

- **WHEN** the consumers of `change-picker.md` are listed
- **THEN** `sai-status` is absent because it uses the dedicated status picker
