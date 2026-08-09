**Complexity**: medium

## Why

The setup flow needs a stable interactive path and harness boundary before model discovery, effort selection, frontmatter mutation, and filesystem copying are implemented. This slice establishes that path while keeping every customization operation visibly non-persistent.

## What Changes

- Add a TTY-only post-setup menu with `Customize models` and `Exit` choices.
- Add mutually exclusive OpenCode and Claude Code harness selection.
- Traverse every registered agent for the selected harness through isolated adapters.
- Invoke fake settings-selection and fake local-override operations that do not write files.
- Skip the menu silently when setup has no TTY.
- Preserve the existing setup operations and their ordering before the new menu.
- Keep model discovery, real settings validation, frontmatter mutation, and filesystem copying out of scope.

## Capabilities

### New Capabilities

- `agent-customization-menu`: TTY-only setup menu and isolated fake customization adapters for both supported harnesses.

### Modified Capabilities

None.

## Impact

The implementation is expected to extend `bin/setup.js` after existing setup work and use injectable prompt conventions from `bin/install-flow.js`. It will read the canonical agent projection registry in `sai/install-manifest.json` and the existing OpenCode and Claude Code agent definitions under `agents/`, but this proposal does not authorize changes to those definitions or to installed/local agent files. No new dependency is required.

## Proposal Research Documentation

**Local files**: `bin/setup.js:118-143`, `bin/install-flow.js:20-21`, `bin/install-flow.js:104-125`, `bin/install-flow.js:366-509`, `bin/install-flow.js:525-541`, `bin/install-flow.js:839-842`, `sai/install-manifest.json:31-47`, `agents/opencode/`, `agents/claude/`, `openspec/specs/agent-tunable-ownership/spec.md`, `openspec/specs/closed-choice-prompts/spec.md`, `docs/adr/0010-readline-over-npm-for-interactive-checklist.md`, `GLOSSARY.md:91`, and the setup/install test surfaces.

**External URLs**: None.

## Additional Notes

The registry currently contains 10 OpenCode agent projections, including `budget`, `explore`, and `executor`, and 7 Claude Code agent projections. OpenCode's shared UI concept is `effort`, mapped by the future adapter to `variant`; Claude Code maps it to `effort`. The fake adapter operations are intentionally observable only through control-flow tests and must not claim that customization is operational.
