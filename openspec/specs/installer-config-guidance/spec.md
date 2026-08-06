# installer-config-guidance Specification

## Purpose
TBD: Define preservation-first installer guidance and seeded settings for the binding-derived opencode worker census.

## Requirements

### Requirement: Seeded opencode configuration is a guarded settings projection
The checked-in `configs/opencode.jsonc` agent map SHALL remain an explicit settings projection rather than a source of managed-agent membership. Its managed agent keys MUST exactly equal the binding-derived census, and automated parity coverage MUST fail when a derived key is missing or an unbound managed key is present. For every derived worker, its model, `mode: "subagent"`, variant when present, and `permission.task` value SHALL equal the corresponding canonical repository registration default.

#### Scenario: Seeded configuration matches the binding census
- **WHEN** parity coverage compares the repository-provided opencode configuration with the binding-derived census
- **THEN** both managed-agent key sets are equal, including a corresponding entry for `sai-1-spec-proposal-worker`

#### Scenario: Worker-specific seeded settings are preserved
- **WHEN** the checked-in seeded agent map is reviewed against the explicit registration defaults
- **THEN** each worker's model, `mode: "subagent"`, variant when present, and helper-permission differences match the corresponding canonical default for the same worker name

#### Scenario: A binding change without a seed update is visible
- **WHEN** a valid binding adds a worker without a corresponding seeded settings entry
- **THEN** parity coverage fails and identifies the missing managed-agent key before the stale seed can be treated as complete

#### Scenario: Seed values diverge from canonical defaults
- **WHEN** a seeded worker entry has a missing or non-subagent mode, or a different model, variant, or `permission.task` value than its canonical repository registration default
- **THEN** parity coverage fails and identifies the worker and divergent managed field before the seed can be treated as complete

### Requirement: Installer guidance reports the complete derived census
`printOpencodeConfigMessage` SHALL report the full derived managed-agent census and SHALL not omit a worker because its registration was absent from a hand-maintained settings entry. Guidance for a missing or newly added worker MUST name that worker clearly.

#### Scenario: First-time guidance names the spec worker
- **WHEN** the installer prints opencode configuration guidance for a destination without the managed entries
- **THEN** the guidance includes `sai-1-spec-proposal-worker` together with the other binding-dispatched workers

#### Scenario: Guidance tracks a newly added binding
- **WHEN** a valid new worker binding is added and its explicit registration defaults are present
- **THEN** the next installer guidance output includes the new worker without a separate guidance-list edit

### Requirement: Census-driven config merging remains preservation-first
When installer guidance is applied through opencode configuration merging, the installer SHALL add only missing derived agent keys. It MUST preserve existing agent definitions, user-selected models, variants, task permissions, comments, formatting, unrelated keys, JSON/JSONC precedence, malformed-config fallback, and idempotent behavior established by the existing opencode configuration contract.

#### Scenario: Existing customized entries survive full-census insertion
- **WHEN** an existing `opencode.json` or `opencode.jsonc` contains customized definitions for some derived workers and omits others
- **THEN** the customized definitions remain unchanged and only the omitted derived workers are inserted

#### Scenario: A fully configured destination is unchanged
- **WHEN** the selected opencode configuration already contains every derived managed-agent name
- **THEN** the installer performs no agent overwrite and preserves the selected file byte-for-byte

#### Scenario: The selected malformed config is protected
- **WHEN** the selected config is unparsable or has a non-object root
- **THEN** the installer leaves it unchanged and emits the existing manual-guidance fallback rather than partially writing the census
