## ADDED Requirements

### Requirement: `interfaces.md` pruning is symmetric with `implementation.md` pruning by integer key

When a fully-applied step's entire section in `implementation.md` is collapsed (all checkboxes checked), the corresponding `## Step N:` section in `interfaces.md` SHALL be pruned to the same format (heading followed by `*(already applied)*`). The pruning criterion SHALL be evaluated once against `implementation.md` checkboxes and applied to both files by the integer key N.

#### Scenario: Pruning a step removes its interface contract

- **WHEN** all checkboxes in `#### Step N:` are marked `[x]` in `implementation.md`
- **AND** a matching `## Step N:` section exists in `interfaces.md`
- **THEN** the `## Step N:` section in `interfaces.md` is replaced with just the heading and `*(already applied)*`
- **AND** the integer key N determines matching across both files

### Requirement: Audit-derived steps SHALL carry interface contracts if and only if they introduce interface changes or testable assertions

When `sai-3-implement` appends an audit-derived step to `implementation.md`, it SHALL append a corresponding `## Step N:` contract section to `interfaces.md` if and only if the step introduces either a modified interface or a testable assertion. Steps introducing neither SHALL omit the contract section.

#### Scenario: Audit step with interface changes gets a contract

- **WHEN** an audit-derived step introduces modified interfaces or testable assertions
- **THEN** a `## Step N:` contract section is appended to `interfaces.md`
- **AND** the section includes applicable subsections per the step-contract format

#### Scenario: Audit step without interface changes or assertions gets no contract

- **WHEN** an audit-derived step introduces neither modified interfaces nor testable assertions
- **THEN** no `## Step N:` contract section is appended to `interfaces.md`

#### Scenario: Sentinel replacement on first audit contract

- **WHEN** `interfaces.md` contains only the `None — no step contracts` sentinel
- **AND** the first appended audit step introduces a contract
- **THEN** the `None — no step contracts` sentinel is replaced by the `## Step N:` section
- **AND** the sentinel is not re-emitted for subsequent audit steps

### Requirement: Audit-derived assertions in `interfaces.md` contracts MUST anchor exclusively to existing requirements in `specs/**`

When an audit-derived step carries assertions in its `## Step N:` contract section in `interfaces.md`, every assertion MUST anchor exclusively to requirements that already exist in `specs/**`. Audit-derived steps cannot establish new acceptance criteria; they can only assert against existing requirements.

#### Scenario: Assertion references existing requirement

- **WHEN** an audit-derived step carries a testable assertion in its `## Step N:` contract
- **THEN** the assertion references a requirement that already exists in `specs/**`
- **AND** no new acceptance criteria are created by the assertion

### Requirement: RED block presence on audit steps SHALL be determined by testability

When `sai-3-implement` appends an audit-derived step to `implementation.md`, the presence of a RED block SHALL be determined by testability: a step that introduces testable code carries a RED block; a step that is not testable (internal refactors, config changes, scaffolding) omits the RED block entirely, regardless of whether any finding violated an existing requirement.

#### Scenario: Testable audit step carries RED block

- **WHEN** an audit-derived step introduces testable code
- **THEN** a RED block is included in the `#### Step N:` section of `implementation.md`
- **AND** the RED block contains verification commands that test the implementation

#### Scenario: Non-testable audit step omits RED block

- **WHEN** an audit-derived step makes internal changes without testable code (refactoring, config, scaffolding)
- **THEN** the RED block is omitted from the `#### Step N:` section
- **AND** this holds regardless of whether the finding violates an existing requirement

### Requirement: Audit-derived RED blocks in `implementation.md` SHALL have exact matching `## Step N:` contracts in `interfaces.md` before delivery

When `sai-3-implement` delivers a plan containing audit-derived steps, every audit-derived step that carries a RED block in `implementation.md` SHALL have an exact, unambiguous matching `## Step N:` contract section in `interfaces.md`. If a RED block lacks a matching contract, the delivery SHALL be repaired by adding the missing contract before the plan is returned. A contract without a RED block SHALL NOT be treated as a violation.

#### Scenario: RED block without contract is repaired

- **WHEN** an audit-derived step carries a RED block in `implementation.md`
- **AND** no matching `## Step N:` contract exists in `interfaces.md`
- **THEN** the delivery is repaired by adding the missing contract
- **AND** the plan is not returned until the contract is present

#### Scenario: Contract without RED block is valid

- **WHEN** an audit-derived step carries a `## Step N:` contract in `interfaces.md`
- **AND** the step does not carry a RED block in `implementation.md`
- **THEN** this is valid and does not require repair or trigger a violation

#### Scenario: Absent `interfaces.md` means no audit step carries a RED block

- **WHEN** `interfaces.md` does not exist for the change, or holds only the `None — no step contracts` sentinel
- **THEN** no audit-derived step appended to `implementation.md` carries a RED block
- **AND** the absent-file fallback is preserved and `interfaces.md` is not created
