# Spec: sai-command-model-defaults

## MODIFIED Requirements

### Requirement: The `/sai-2-design` command SHALL use `claude-opus-4-8` as its default Claude Code model.

Previously `claude-opus-4-7`. Updated to reflect the latest Opus model version.

#### Scenario: User runs /sai-2-design without overriding the model
- **WHEN** the user invokes `/sai-2-design` in Claude Code without specifying a model override
- **THEN** the command executes using `claude-opus-4-8` at high effort

---

### Requirement: The `/sai-6-security` command SHALL use `claude-opus-4-8` as its default Claude Code model.

Previously `claude-opus-4-7`. Updated to reflect the latest Opus model version.

#### Scenario: User runs /sai-6-security without overriding the model
- **WHEN** the user invokes `/sai-6-security` in Claude Code without specifying a model override
- **THEN** the command executes using `claude-opus-4-8` at high effort

---

### Requirement: The README model defaults table SHALL reference `claude-sonnet-4-6` for the spec (sai-1-spec) Claude Code column.

Previously `claude-sonnet-4-7`.

#### Scenario: User consults README for recommended model defaults
- **WHEN** the user reads the model defaults table in README.md
- **THEN** the spec row Claude Code column shows `claude-sonnet-4-6`

---

### Requirement: The README model defaults table SHALL reference `claude-opus-4-8` for the design (sai-2-design) and security (sai-6-security) Claude Code columns.

Previously `claude-opus-4-7`.

#### Scenario: User consults README for recommended model defaults
- **WHEN** the user reads the model defaults table in README.md
- **THEN** the design and security rows Claude Code column show `claude-opus-4-8`
