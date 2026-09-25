# Repository Artifact Scope

This policy defines the shared protected surfaces for implementation-capable
workers. Each consuming command may impose a narrower role-specific scope.

## General scope

An implementation-capable worker may create, modify, or delete any repository
artifact required by the crystallized change, regardless of file format. This
includes code, prompts, instructions, policies, documentation, office files,
spreadsheets, CSV files, images, and other text or binary files.

The artifact must be required by the change. This policy does not authorize
unrelated changes, mutating git commands, subagent dispatch, or actions that
the consuming command does not otherwise authorize.

## Protected update protocols

### Published OpenSpec specifications

An implementation-capable worker does not directly modify `openspec/specs/**`.
Changes to published specifications use a delta under the active change,
backfill, and the OpenSpec archive sync operation.

### ADR and DDR records

Existing ADR and DDR records are historical records and are not edited in
place. A decision change uses a new related record with the applicable
relationship, such as `supersede`, `reframe`, `reverse`, or `amend`.

The relevant ADR or DDR index may be updated when its protocol requires it.
Creating a new record is not an edit to an existing historical record.

## Role-specific scope

Each consuming worker keeps its own narrower role boundary; this policy never
widens it.
