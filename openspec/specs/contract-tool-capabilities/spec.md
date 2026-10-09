# contract-tool-capabilities Specification

## Purpose
Define canonical contract-derived tool capabilities and their native projections, independent command requirements, and evidence-based access diagnostics for Claude Code and opencode.

## Requirements

### Requirement: Canonical capability profiles and assignments

The system SHALL declare abstract capability profiles and agent and command
assignments in `sai/install-manifest.json`. Profiles SHALL support inherited
flags and replacement of list-valued grants. Resolution SHALL reject unknown
capabilities, missing profile assignments, invalid values, and inheritance
cycles. The twenty-two shipped commands SHALL include to-backlog, from-backlog,
from-next-backlog-item, and to-pr with their own resolvable command profiles,
alongside the eighteen SAI commands. The retired sai-pr command SHALL have no
current assignment.

#### Scenario: Required identities receive assignments

- **WHEN** canonical capability assignments are inspected
- **THEN** all fifteen managed workers, all three Generic Agent roles under both harness names, and all twenty-two commands have resolvable profiles.

#### Scenario: Invalid profile fails closed

- **WHEN** profile resolution encounters an unknown capability or inheritance cycle
- **THEN** resolution fails instead of granting unspecified access.

#### Scenario: Backlog invocation capabilities

- **WHEN** the to-backlog command profile is resolved for either harness
- **THEN** it grants reading, search, questions, the to-backlog and safe-operations skills, and shell invocation of the common to-backlog Node tool without changing publication confirmation requirements.

#### Scenario: Backlog import capabilities

- **WHEN** the from-backlog command profile is resolved for either harness
- **THEN** it grants reading, search, questions, the from-backlog skill, and shell invocation of the common from-backlog Node tool, without granting file writes or the publication helper.

#### Scenario: Next backlog-item selection capabilities

- **WHEN** the from-next-backlog-item command profile is resolved for either harness
- **THEN** it inherits the read-only import profile, includes the selector and importer skills, and limits shell grants to the selector Node helper's select invocation and the existing import Node helper without adding file writes or direct provider-CLI grants.

#### Scenario: PR/MR invocation capabilities

- **WHEN** the to-pr command profile is resolved for either harness
- **THEN** it grants reading, search, questions, the to-pr and safe-operations skills, and shell invocation of the common to-pr Node tool without authorizing publication or push.

### Requirement: Harness-native capability translation

The system SHALL translate each profile into Claude Code agent tools and command pre-approvals, or ordered opencode V2 permission actions. Opencode translation SHALL begin with a deny-all rule and append explicit grants. The write capability SHALL translate to Edit and Write in Claude Code and the edit permission action in opencode. CodeGraph access SHALL include the applicable native auxiliary access.

#### Scenario: Equivalent write capabilities use different native mechanisms
- **WHEN** a write-capable profile is translated for both harnesses
- **THEN** Claude Code receives Edit and Write while opencode receives edit permission covering its supported write-tool alternatives

#### Scenario: Auxiliary bridge does not grant unrelated checked tools
- **WHEN** an opencode profile grants CodeGraph access
- **THEN** it grants execute and the exact CodeGraph action without granting unrelated permission-checked tools

### Requirement: Installed profile and command requirements projections

The system SHALL project one JSON disclosure file per capability profile and a separate command requirements registry for each harness. Generated source materialization SHALL use temporary source paths rather than overwrite canonical executable or template sources. Installation, doctor, and uninstall SHALL consume the compiled projection content.

#### Scenario: Command requirements remain independent of worker requirements
- **WHEN** a command's installed requirements are inspected
- **THEN** they identify the command's own profile and translated requirements rather than treating a worker grant as command access

#### Scenario: Materialization protects canonical sources
- **WHEN** generated projection content is materialized
- **THEN** the materialized source uses the generated temporary surface and leaves canonical executable and template sources unchanged

### Requirement: Contract-specific grants preserve authorization boundaries

Capability grants SHALL remain distinct from operation authorization, file-write scope, safety confirmations, and coordinator ownership. Implement SHALL receive its required direct URL fetch, Design SHALL receive its contracted delegation targets, Backfill SHALL receive write access for its authorized exception, and Archive SHALL receive shell access for its authorized mutation route.

#### Scenario: Native grant does not authorize a prepare write
- **WHEN** Backfill has write capability but is preparing Direct Build drafts
- **THEN** its contract still prohibits draft writes until a validated execution continuation authorizes them

### Requirement: Effective access evidence and remediation

Access verification SHALL distinguish allowed operations, permission-blocked operations, unavailable tools, and unverified operations using supplied live evidence for exact action and resource pairs. It SHALL report pass only when every required operation has evidence of availability and permission to proceed. Missing evidence SHALL NOT be inferred from rendered declarations.

#### Scenario: Declared access lacks live evidence
- **WHEN** a required action and resource have no matching live evidence
- **THEN** verification reports unverified access with guidance to evaluate that operation

#### Scenario: Present tool is denied
- **WHEN** matching evidence reports an available tool with deny or ask permission
- **THEN** verification reports permission-blocked access with native permission guidance

### Requirement: Access checks preserve native enforcement limitations

Commands SHALL check their own applicable required access separately from workers. Opencode commands SHALL retain the active primary agent without an invented command permission field. Claude Code command allowed-tools SHALL be described as pre-approval rather than a deny-list. Unavailable evaluation SHALL remain unverified, and Code Mode's permission-free session utilities SHALL NOT be described as isolated by nested tool permissions.

#### Scenario: Active opencode primary agent lacks access
- **WHEN** a command requires access that its active primary agent does not provide
- **THEN** the command names the required action and resource and requests an appropriate agent or applicable native rules without silently changing global permissions

### Requirement: Permission-evaluator regression coverage

The opt-in runtime test SHALL exercise the actual opencode permission evaluator for every profile using representative non-mutating resources, conflicting inherited grants and denies, unknown actions, auxiliary access, exclusions, and generated Markdown registration. It SHALL NOT launch a model or mutation probe, and a skipped test SHALL NOT count as runtime success.

#### Scenario: Inherited permissions conflict with a profile
- **WHEN** the opt-in test evaluates profile permissions after conflicting inherited rules
- **THEN** required grants are allowed and excluded or unknown actions remain denied

### Requirement: Concrete skill-owned preparation invocation declarations

The to-backlog and explore command profiles SHALL declare `node {skills}/to-backlog/scripts/prepare-temp.js {harness}` in addition to their existing grants. Capability translation SHALL expand `{skills}` to project-local and user-global skill roots and `{harness}` to `claude` or `opencode`, retaining installed `{sai}` expansion. Claude Code SHALL receive concrete Bash pre-approvals for `.claude/skills` and `~/.claude/skills`; opencode SHALL receive explicit shell allow rules for `.opencode/skills` and `~/.config/opencode/skills`. These additions SHALL NOT add arbitrary Node execution, general-purpose mkdir or chmod grants, or preparation access to the research profile. Declarations SHALL remain separate from operation authorization and live effective-access evidence.

#### Scenario: Claude Code preparation declarations

- **WHEN** the to-backlog or explore command profile is translated for Claude Code
- **THEN** it includes Bash pre-approvals for the concrete local and global to-backlog preparation script invocations with the `claude` argument.

#### Scenario: OpenCode preparation declarations

- **WHEN** the to-backlog or explore command profile is translated for opencode
- **THEN** it includes explicit shell allow rules for the concrete local and global to-backlog preparation script invocations with the `opencode` argument.

#### Scenario: Research profile remains unchanged

- **WHEN** the research profile is resolved after adding the command preparation declarations
- **THEN** it has no preparation-script grant.

#### Scenario: Declaration does not approve publication

- **WHEN** a command has a concrete preparation invocation declaration
- **THEN** that declaration does not replace explicit publication confirmation or establish that the active harness permits the operation at runtime.
