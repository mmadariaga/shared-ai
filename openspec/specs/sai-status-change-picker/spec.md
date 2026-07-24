## REMOVED Requirements

### Requirement: sai-status resolves a missing change name via change-picker
**Reason**: Superseded by the new `status-picker` capability. `sai-status` no longer inherits `change-picker.md`; it resolves missing change names via a dedicated `status-picker.md` so it can offer a "See all" bulk view on the 2+ branch without touching the shared picker.
**Migration**: `sai/commands/sai-status.md` fetches `sai/instructions/status-picker.md` instead of `change-picker.md`. The 0-change and 1-change resolution behavior is preserved verbatim by `status-picker.md`; see the `status-picker` capability.

### Requirement: sai-status joins the change-picker consumer list
**Reason**: Superseded by the new `status-picker` capability. With `sai-status` decoupled from `change-picker.md`, it is no longer one of that instruction's consumers, so the consumer count returns to 9.
**Migration**: Remove `sai-status` from the consumer list in `sai/instructions/change-picker.md` (10 → 9). The `change-picker` capability's new consumer-scope requirement locks this exclusion; see the `change-picker` capability.
