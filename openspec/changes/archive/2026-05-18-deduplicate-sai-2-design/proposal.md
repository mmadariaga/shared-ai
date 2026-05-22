# Proposal: Deduplicate sai-2-design wrappers + reinforce artifact-only scope

## What changes

- Extract duplicated design/tasks generation logic from both `sai-2-design.md` wrappers (Claude + OpenCode) into a shared `instructions/sai/design.md` instruction file.
- Add explicit "Artifact-Only Scope" section to `instructions/sai/spec.propose.md` forbidding sai-1-spec from editing project source files, configuration, or infrastructure.
- Fix bug in `opencode/commands/sai-1-spec.md` where `remember.md` was fetched from the Claude path (`~/.claude/`) instead of the OpenCode path (`~/.config/opencode/`).

## Why

The Claude and OpenCode wrappers for `sai-2-design` contained ~60 lines of identical content (approval gate, generation instructions, design.md sections, tasks.md format, Required Documentation, Implementation Context). This violates the repository's mirror discipline — any change to one wrapper must be mirrored to the other, creating a maintenance burden and drift risk.

The artifact-only scope reinforcement prevents a common failure mode where the spec-generation agent edits project code instead of producing only OpenSpec artifacts.

## Capabilities in scope

- Wrapper deduplication via shared instruction fetch
- Spec-propose scope constraint hardening
- Path fix for OpenCode remember.md fetch

## Out of scope

- Changes to any other sai-* command wrappers
- Changes to the OpenSpec skill files themselves
- Changes to application/project code
