# Spec: sai-command-model-defaults

## Purpose

Keep coordinator and worker model defaults rooted in their live harness declarations rather than duplicating versioned identifiers in prose.

## Requirements

### Requirement: Coordinator defaults are declared by wrappers

The coordinator defaults for `/sai-1-spec`, `/sai-2-design`, and `/sai-6-security` SHALL come from the `model` and `effort` frontmatter of their respective `commands/claude/sai-*.md` wrappers (or `model` and `variant` for `commands/opencode/sai-*.md`). No spec or README table SHALL independently pin those values.

#### Scenario: User runs a numbered command without a model override
- **WHEN** the user invokes a numbered command in Claude Code or opencode
- **THEN** its coordinator uses the active wrapper's model and effort or variant declaration

### Requirement: Managed worker seeds are declared by the worker matrix

The default managed worker settings for spec, design, and security SHALL come from their respective entries in `sai/install-manifest.json`'s `worker-matrix`. Runtime dispatch SHALL use the resolved installed agent file's tunables, which may be user-owned overrides. These values are independent of coordinator wrapper defaults.

#### Scenario: A worker file is absent during installation
- **WHEN** the installer materializes the spec, design, or security worker for either harness
- **THEN** it seeds the worker agent's model and effort or variant from the corresponding worker-matrix entry

#### Scenario: A worker has customized tunables
- **WHEN** a worker is dispatched with a user-owned model or effort or variant override
- **THEN** it runs with the configured agent-file tunables rather than the repository seed
