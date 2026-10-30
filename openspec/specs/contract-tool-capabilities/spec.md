# contract-tool-capabilities Specification

## Purpose
Define canonical contract-derived tool capabilities and their native projections, independent command requirements, and evidence-based access diagnostics for Claude Code and opencode.

## Requirements

### Requirement: Canonical capability profiles and assignments

The system SHALL declare abstract capability profiles and agent and command assignments in `sai/install-manifest.json`. Profiles SHALL support inherited flags and replacement of list-valued grants. Resolution SHALL reject unknown capabilities, missing profile assignments, invalid values, and inheritance cycles. The twenty-five shipped command-requirement assignments SHALL include to-backlog, from-backlog, from-next-backlog-item, to-pr, and the skill-only new-change-branch workflow with their own resolvable profiles, alongside the twenty SAI commands, including sai-3-implement and sai-build. The new-change-branch and sai-cache-warmer assignments SHALL NOT require command wrappers. The sai-cache-warmer assignment SHALL resolve to cache-warmer-command, inheriting boot access and granting questions, its skill, and invocation of its bundled Node wait.js helper for both harnesses. The retired sai-pr command SHALL have no current assignment.

#### Scenario: Required identities receive assignments

- **WHEN** canonical capability assignments are inspected
- **THEN** all seventeen managed workers, all three Generic Agent roles under both harness names, and all twenty-five command-requirement assignments have resolvable profiles.

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
- **THEN** it inherits the read-only import profile, includes the selector and importer skills, and limits shell grants to the selector Node helper select invocation and the existing import Node helper without adding file writes or direct provider-CLI grants.

#### Scenario: PR/MR invocation capabilities

- **WHEN** the to-pr command profile is resolved for either harness
- **THEN** it grants reading, search, questions, the to-pr and safe-operations skills, and shell invocation of the common to-pr Node tool without authorizing publication or push.

#### Scenario: Change-branch skill capabilities

- **WHEN** the new-change-branch-command profile is resolved for either harness
- **THEN** it inherits boot access, grants search and questions, includes the new-change-branch and safe-operations skills, and grants invocation of the common new-change-branch Node helper without authorizing any operation beyond the workflow requested local creation and switch.

#### Scenario: Skill-only command requirements

- **WHEN** capability requirements and installation projections are generated for new-change-branch under either harness
- **THEN** the requirements registry identifies its new-change-branch-command profile and the universal skill is installed without a new-change-branch command wrapper.

#### Scenario: Cache-warmer skill capabilities

- **WHEN** capability requirements and installation projections are generated for sai-cache-warmer under either harness
- **THEN** the requirements registry identifies cache-warmer-command with questions, the sai-cache-warmer skill, and its bundled Node wait.js invocation grant, and installs SKILL.md and wait.js without a command wrapper.

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

The to-backlog and explore command profiles SHALL declare `node {skills}/to-backlog/scripts/prepare-temp.js {harness}` in addition to their existing grants. Capability translation SHALL expand `{skills}` to project-local and user-global skill roots and `{harness}` to `claude` or `opencode`, retaining installed `{sai}` expansion. Claude Code SHALL receive concrete Bash pre-approvals for `.claude/skills` and `~/.claude/skills`; opencode SHALL receive explicit shell allow rules for `.opencode/skills` and `~/.config/opencode/skills`. When an install root is supplied, each harness SHALL also receive the absolute install-root form of the same invocation with the script path double-quoted, as for every generated global shell rule. These additions SHALL NOT add arbitrary Node execution, general-purpose mkdir or chmod grants, or preparation access to the research profile. Declarations SHALL remain separate from operation authorization and live effective-access evidence.

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

#### Scenario: Absolute preparation declaration

- **WHEN** the to-backlog command profile is translated for opencode with install root `/home/u/.config/opencode`
- **THEN** its shell rules include `node "/home/u/.config/opencode/skills/to-backlog/scripts/prepare-temp.js" opencode`

### Requirement: Explore command wait-script grant

The `explore-command` capability profile in `sai/install-manifest.json` SHALL grant the shell invocation `node {skills}/sai-cache-warmer/wait.js *`, in the same form `cache-warmer-command` uses, so `/sai-explore` can arm and wake its own cache-warming waits on Claude Code and opencode. `resolveProfile` in `bin/capabilities.js` SHALL keep replacing an inherited list-valued grant, so the effective permissions of every other profile stay unchanged.

#### Scenario: Explore allows the wait script
- **WHEN** capability requirements are generated for `sai-explore` under either harness
- **THEN** the explore command's shell grants include the `wait.js` invocation

#### Scenario: Other profiles keep their grants
- **WHEN** profiles that replace an inherited shell list are resolved
- **THEN** their effective grants are unchanged by the explore grant

### Requirement: Explore command may stop its own background task

The `explore-command` capability profile in `sai/install-manifest.json` SHALL set `stopTask: true`, and `bin/capabilities.js` SHALL accept `stopTask` as a boolean profile flag. On Claude Code the flag SHALL project the native `TaskStop` tool into the command's tools and allowed tools; on opencode, which ends a task by removing its shell through the session API with no permission action, the flag SHALL add no rule. Profiles that do not set the flag, including `coordinator`, SHALL NOT receive `TaskStop`.

#### Scenario: Claude Code explore receives TaskStop
- **WHEN** capability requirements are generated for `explore-command` on Claude Code
- **THEN** its native tools and allowed tools include `TaskStop`

#### Scenario: opencode explore gains no rule
- **WHEN** capability requirements are generated for `explore-command` on opencode
- **THEN** no `TaskStop` native action is added

#### Scenario: Coordinator profile is unchanged
- **WHEN** the `coordinator` profile is translated for Claude Code
- **THEN** its native tools do not include `TaskStop`

### Requirement: Generated global shell rules carry the absolute install-root form

The capability translation in `bin/capabilities.js` SHALL emit every `{sai}` or `{skills}` shell pattern in three forms when an install root is supplied: the project-local form, the `~` form, and an absolute form rooted at the install root with the command path double-quoted (`node "<install root>/sai/...`). A path token that ends in a wildcard SHALL keep only its opening quote, so the wildcard still spans the rest of the command. The install root SHALL be written with forward slashes, the drive letter as Node reports it, and no trailing separator. Claude Code SHALL receive the absolute form in `allowed-tools` as both `Bash(...)` and `PowerShell(...)`, and opencode SHALL receive it as shell permission rules. Without an install root only the project-local and `~` forms SHALL be generated. The install root SHALL default to the root being installed into (`~/.claude` for Claude Code, the base `resolveOpencodeBase` resolves for opencode, including an XDG override), and a project-local refresh SHALL name the global install root rather than the project root. Instruction projections SHALL stay byte copies of their source with no root placeholder, and the user customization suffix and user-owned tunables SHALL be preserved.

#### Scenario: Claude Code rules carry both forms
- **WHEN** a command or worker with a `{sai}` shell grant is projected for Claude Code with install root `/home/u/.claude`
- **THEN** its `allowed-tools` holds `Bash(...)` and `PowerShell(...)` entries for the `~/.claude/sai/...` form and for the `node "/home/u/.claude/sai/...` form

#### Scenario: opencode rules carry the resolved config base
- **WHEN** a profile with a `{sai}` shell grant is projected for opencode with the resolved config base as install root
- **THEN** its shell permission rules hold the `~/.config/opencode/sai/...` form and the absolute form rooted at that base

#### Scenario: Wildcard path keeps only the opening quote
- **WHEN** a shell pattern's path token ends in `*`
- **THEN** the absolute form opens the double quote before the path and adds no closing quote

#### Scenario: No install root generates no absolute form
- **WHEN** a profile is translated without an install root
- **THEN** only the project-local and `~` forms are generated

#### Scenario: Project-local refresh names the global root
- **WHEN** the installer refreshes manifest-owned overrides in a project
- **THEN** the refreshed permission rules name the global install root, not the project's `.claude` or `.opencode` directory

### Requirement: Permission-carrying projections compare against their generated text

`doctor` and uninstall SHALL compare a projection that carries generated text against that text, never against the raw source file, including the tunable-insensitive comparison of managed agent files. A projection whose rules hold this install's absolute root SHALL be reported in sync by `doctor` and removed by uninstall as unmodified managed content; one whose rules hold a different home path SHALL be reported by `doctor` as drift. Uninstall SHALL materialize each distinct generated text to its own scratch file, so enumerations with different install roots never overwrite each other's expected source.

#### Scenario: Installed projection is in sync and removable
- **WHEN** `doctor` and uninstall inspect commands and workers installed with this install's root
- **THEN** `doctor` reports no drift for them and uninstall removes them as unmodified managed files

#### Scenario: Foreign home is drift
- **WHEN** an installed permission-carrying projection holds the absolute root of a different home
- **THEN** `doctor` reports it as differing, and a reinstall regenerates it
