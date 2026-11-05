# contract-tool-capabilities Specification

## Purpose
Define canonical contract-derived tool capabilities and their native projections, independent command requirements, and evidence-based access diagnostics for Claude Code and opencode.

## Requirements

### Requirement: Canonical capability profiles and assignments

The system SHALL declare abstract capability profiles and agent and command assignments in `sai/install-manifest.json`. Profiles SHALL support inherited flags and replacement of list-valued grants. Resolution SHALL reject unknown capabilities, missing profile assignments, invalid values, and inheritance cycles. The twenty-six shipped command-requirement assignments SHALL include to-backlog, from-backlog, from-next-backlog-item, to-pr, and the skill-only new-change-branch workflow with their own resolvable profiles, alongside the twenty-one SAI commands, including sai-3-implement, sai-build, and sai-cache-warmer. The new-change-branch assignment SHALL NOT require a command wrapper. The sai-cache-warmer assignment SHALL be backed by a `sai-cache-warmer.md` command wrapper on both harnesses and SHALL resolve to cache-warmer-command, inheriting boot access and granting questions, its skill, the `fetch` skill, and invocation of its bundled Node wait.js helper for both harnesses. The `worktree-command`, `new-change-branch-command`, `to-pr-command`, and `to-backlog-command` profiles SHALL grant shell `*`; this grant SHALL NOT change their contracts' confirmation requirements before deleting, publishing, or pushing. The retired sai-pr command SHALL have no current assignment.

#### Scenario: Required identities receive assignments

- **WHEN** canonical capability assignments are inspected
- **THEN** all seventeen managed workers, all three Generic Agent roles under both harness names, and all twenty-six command-requirement assignments have resolvable profiles.

#### Scenario: Invalid profile fails closed

- **WHEN** profile resolution encounters an unknown capability or inheritance cycle
- **THEN** resolution fails instead of granting unspecified access.

#### Scenario: Backlog invocation capabilities

- **WHEN** the to-backlog command profile is resolved for either harness
- **THEN** it grants reading, search, questions, the to-backlog, safe-operations, and fetch skills, and shell `*`, without changing publication confirmation requirements.

#### Scenario: Backlog import capabilities

- **WHEN** the from-backlog command profile is resolved for either harness
- **THEN** it grants reading, search, questions, the from-backlog and fetch skills, and shell invocation of the common from-backlog Node tool, without granting file writes or the publication helper.

#### Scenario: Next backlog-item selection capabilities

- **WHEN** the from-next-backlog-item command profile is resolved for either harness
- **THEN** it inherits the read-only import profile, includes the selector, importer, and fetch skills, and limits shell grants to the selector Node helper select invocation, with and without further arguments, and the existing import Node helper without adding file writes or direct provider-CLI grants.

#### Scenario: PR/MR invocation capabilities

- **WHEN** the to-pr command profile is resolved for either harness
- **THEN** it grants reading, search, questions, the to-pr, safe-operations, and fetch skills, and shell `*`, without authorizing publication or push.

#### Scenario: Change-branch skill capabilities

- **WHEN** the new-change-branch-command profile is resolved for either harness
- **THEN** it inherits boot access, grants search and questions, includes the new-change-branch, safe-operations, and fetch skills, and grants shell `*` without authorizing any operation beyond the workflow requested local creation and switch.

#### Scenario: Skill-only command requirements

- **WHEN** capability requirements and installation projections are generated for new-change-branch under either harness
- **THEN** the requirements registry identifies its new-change-branch-command profile and the universal skill is installed without a new-change-branch command wrapper.

#### Scenario: Cache-warmer skill capabilities

- **WHEN** capability requirements and installation projections are generated for sai-cache-warmer under either harness
- **THEN** the requirements registry identifies cache-warmer-command with questions, the sai-cache-warmer and fetch skills, and its bundled Node wait.js invocation grant, and installs SKILL.md, wait.js, and the `sai-cache-warmer.md` command wrapper.

#### Scenario: Worktree command runs any shell command

- **WHEN** the worktree-command profile is resolved for either harness
- **THEN** its shell grant is exactly `*`.

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

The explore command profile SHALL declare `node {skills}/to-backlog/scripts/prepare-temp.js {harness}` and `node {skills}/to-backlog/scripts/prepare-temp.js {harness} *` in addition to its existing grants; the to-backlog command profile SHALL cover the same invocation through its shell `*` grant. Capability translation SHALL expand `{skills}` to project-local and user-global skill roots and `{harness}` to `claude` or `opencode`, retaining installed `{sai}` expansion. Claude Code SHALL receive concrete Bash pre-approvals for `.claude/skills` and `~/.claude/skills`; opencode SHALL receive explicit shell allow rules for `.opencode/skills` and `~/.config/opencode/skills`. Each harness SHALL also receive the absolute install-root form of the same invocation with the script path double-quoted, as for every generated global shell rule. These additions SHALL NOT add arbitrary Node execution, general-purpose mkdir or chmod grants, or preparation access to the research profile. Declarations SHALL remain separate from operation authorization and live effective-access evidence.

#### Scenario: Claude Code preparation declarations

- **WHEN** the explore command profile is translated for Claude Code
- **THEN** it includes Bash pre-approvals for the concrete local and global to-backlog preparation script invocations with the `claude` argument, both alone and followed by further arguments.

#### Scenario: OpenCode preparation declarations

- **WHEN** the explore command profile is translated for opencode
- **THEN** it includes explicit shell allow rules for the concrete local and global to-backlog preparation script invocations with the `opencode` argument, both alone and followed by ` *`.

#### Scenario: Research profile remains unchanged

- **WHEN** the research profile is resolved after adding the command preparation declarations
- **THEN** it has no preparation-script grant.

#### Scenario: Declaration does not approve publication

- **WHEN** a command has a concrete preparation invocation declaration
- **THEN** that declaration does not replace explicit publication confirmation or establish that the active harness permits the operation at runtime.

#### Scenario: Absolute preparation declaration

- **WHEN** the explore command profile is translated for opencode with install root `/home/u/.config/opencode`
- **THEN** its shell rules include `node "/home/u/.config/opencode/skills/to-backlog/scripts/prepare-temp.js" opencode` and the same rule followed by ` *`

### Requirement: Agent profiles grant every installed skill

Every capability profile assigned to an agent through `capabilities.assignments.agents` in `sai/install-manifest.json` SHALL resolve to the skills grant `["*"]` and SHALL NOT declare its own `skills` key. Command profiles, whose names end in `-command`, SHALL keep their explicit skills lists. Granting every skill SHALL NOT change any tool, shell, delegate, write, or message grant of an agent profile. A test SHALL fail when an agent profile declares its own `skills` key or resolves to a skills list other than `["*"]`.

#### Scenario: Research and executor agents allow every skill on opencode
- **WHEN** the opencode agent files of `budget-explorer` (profile `research`) and `budget-executor` (profile `executor`) are generated
- **THEN** their permissions allow the `skill` action on `*` inherited from `boot`, with no per-name skill denial, as for `sai-3-red-worker` and `sai-3-green-worker` (profile `worker-execution`)

#### Scenario: Claude Code agent tools stay unchanged
- **WHEN** the Claude Code agent files of `budget-explorer`, `budget-executor`, `sai-3-red-worker`, and `sai-3-green-worker` are generated
- **THEN** each keeps the same `tools` and `allowedTools`, because the `Skill` tool was already granted

#### Scenario: Other grants of the widened profiles stay unchanged
- **WHEN** the `research` and `executor` profiles are resolved
- **THEN** `research` keeps its shell limited to `git grep *`, `codegraph explore *`, and `node {skills}/sai-cache-warmer/wait.js *`, and neither profile gains `delegate`, `write`, or `message`

#### Scenario: Command profiles keep explicit skills lists
- **WHEN** command profiles such as `implement-command`, `to-backlog-command`, and `to-pr-command` are resolved
- **THEN** each keeps its own explicit skills list

#### Scenario: A narrowed agent profile fails the guard test
- **WHEN** a profile assigned to an agent declares its own `skills` key or resolves to a skills list other than `["*"]`
- **THEN** the capability profile test fails naming the agent and its profile

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

The capability translation in `bin/capabilities.js` SHALL emit every `{sai}` or `{skills}` shell pattern in three forms: the project-local form, the `~` form, and an absolute form rooted at the install root with the command path double-quoted (`node "<install root>/sai/...`). A path token that ends in a wildcard SHALL keep only its opening quote, so the wildcard still spans the rest of the command. The install root SHALL be written with forward slashes, the drive letter as Node reports it, and no trailing separator. Claude Code SHALL receive the absolute form in `allowed-tools` as both `Bash(...)` and `PowerShell(...)`, and opencode SHALL receive it as shell permission rules. When the caller supplies no install root, the translator SHALL resolve one itself, only when a pattern holds `{sai}` or `{skills}`: `~/.claude` for Claude Code; for opencode, the directory on the `config` line that `opencode debug paths` prints, else `opencode` under `XDG_CONFIG_HOME` when it is set, else `~/.config/opencode`. The install root SHALL default to the root being installed into (`~/.claude` for Claude Code, the base `resolveOpencodeBase` resolves for opencode, including an XDG override), and a project-local refresh SHALL name the global install root rather than the project root. Instruction projections SHALL stay byte copies of their source with no root placeholder, and the user customization suffix and user-owned tunables SHALL be preserved.

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
- **THEN** the translator resolves the install root itself and still emits the quoted absolute form beside the project-local and `~` forms, for example `Bash(node "<home>/.claude/sai/tools/status.js":*)` on Claude Code

#### Scenario: Project-local refresh names the global root
- **WHEN** the installer refreshes manifest-owned overrides in a project
- **THEN** the refreshed permission rules name the global install root, not the project's `.claude` or `.opencode` directory

#### Scenario: XDG override moves the resolved opencode root
- **WHEN** a profile is translated for opencode without an install root, `opencode debug paths` cannot run, and `XDG_CONFIG_HOME` is `/xdg override`
- **THEN** its shell rules include `node "/xdg override/opencode/sai/tools/status.js" *` for the status tool

### Requirement: Permission-carrying projections compare against their generated text

`doctor` and uninstall SHALL compare a projection that carries generated text against that text, never against the raw source file, including the tunable-insensitive comparison of managed agent files. A projection whose rules hold this install's absolute root SHALL be reported in sync by `doctor` and removed by uninstall as unmodified managed content; one whose rules hold a different home path SHALL be reported by `doctor` as drift. Uninstall SHALL materialize each distinct generated text to its own scratch file, so enumerations with different install roots never overwrite each other's expected source.

#### Scenario: Installed projection is in sync and removable
- **WHEN** `doctor` and uninstall inspect commands and workers installed with this install's root
- **THEN** `doctor` reports no drift for them and uninstall removes them as unmodified managed files

#### Scenario: Foreign home is drift
- **WHEN** an installed permission-carrying projection holds the absolute root of a different home
- **THEN** `doctor` reports it as differing, and a reinstall regenerates it

### Requirement: Every capability profile may run the fetch tool

`sai/install-manifest.json` SHALL declare `capabilities.universal.shell` as `["node {skills}/fetch/fetch.js *", "opencode debug paths"]`. `bin/capabilities.js` SHALL add every universal shell pattern to the shell grants of every capability profile on Claude Code and opencode, expanding `{skills}` patterns in the same project-local, `~`, and absolute install-root forms as other `{skills}` patterns. A profile whose shell grant already holds `*` SHALL keep it unchanged. A profile with no shell grant of its own SHALL gain the shell tools and the shell tool requirement for the universal patterns only. A `universal.shell` value that is not an array of non-empty strings SHALL fail registry validation. The universal grant SHALL NOT add any write, delegate, message, or other non-shell grant, and a shell limit stated for an individual profile SHALL be read as a limit on that profile's own grants, to which the universal patterns are added.

#### Scenario: research profile gains the fetch tool
- **WHEN** the `research` profile is translated for Claude Code with install root `/home/u/.claude`
- **THEN** its allowed tools include `Bash(...)` and `PowerShell(...)` entries for `node ~/.claude/skills/fetch/fetch.js` and for `node "/home/u/.claude/skills/fetch/fetch.js`, beside its own `git grep`, `codegraph explore`, and `wait.js` grants

#### Scenario: profile without shell gains only the fetch tool
- **WHEN** a profile that declares no shell grant, such as `boot`, is translated for opencode
- **THEN** its permissions allow the shell action only for the fetch tool patterns and `opencode debug paths`, and its tool requirements include the shell capability

#### Scenario: wildcard shell is unchanged
- **WHEN** a profile whose shell grant is `["*"]` is translated
- **THEN** its shell grant stays `*` with no fetch tool pattern added

#### Scenario: invalid universal shell fails validation
- **WHEN** `capabilities.universal.shell` is a string or holds an empty string
- **THEN** registry validation throws `Capability universal.shell must be a string array`

#### Scenario: opencode tool-location fallback is granted
- **WHEN** a pattern-list profile such as `status-command` is translated for opencode
- **THEN** its shell rules include `opencode debug paths`

### Requirement: Explicit skills lists include the fetch skill

Every capability profile in `sai/install-manifest.json` that declares an explicit `skills` list other than `["*"]` SHALL include `fetch` in that list. A test SHALL fail naming the profile when such a list omits `fetch`.

#### Scenario: Command profile lists fetch
- **WHEN** the `skills` list of a command profile such as `commit-command`, `audit-command`, or `context-cache-benchmark-command` is inspected
- **THEN** it includes `fetch`

#### Scenario: Missing fetch fails the guard test
- **WHEN** a profile declares an explicit skills list without `fetch`
- **THEN** the capability test fails naming that profile

### Requirement: Read-only profiles allow every prescribed shell command in every path form

The research profile and the read-only command profiles (`explore-command`, `status-command`, `retrospective-command`, `from-backlog-command`, `from-next-backlog-item-command`, `cache-warmer-command`, and `context-cache-benchmark-command`) SHALL keep pattern-list shell grants rather than `*`. Their compiled rules on Claude Code and opencode SHALL allow every shell command their instructions prescribe, and every `node` tool invocation in the relative, `~`, and quoted absolute path forms that tool resolution produces. A table-driven test SHALL list those commands per profile and assert that both harnesses' compiled rules match each command in each form, failing on any command a profile does not allow.

#### Scenario: Status tool allowed in every path form
- **WHEN** the `status-command` rules are compiled for either harness
- **THEN** `node <root>/sai/tools/status.js panel my-change --json --cwd .` is allowed with the project-local root, the `~` root, and the quoted absolute install root

#### Scenario: Explorer research commands allowed
- **WHEN** the `research` rules are compiled for either harness
- **THEN** `git grep -l pattern`, `git grep --max-count 5 pattern`, `codegraph explore "<query>"`, `opencode debug paths`, and the fetch tool in every path form are allowed

#### Scenario: Research profile keeps pattern-list shell
- **WHEN** the `research` profile is resolved
- **THEN** its own shell grant holds no `*` rule

#### Scenario: Unallowed prescribed command fails the table test
- **WHEN** a command listed for a read-only profile is not matched by that profile's compiled rules on one harness
- **THEN** the table-driven test fails naming the command

### Requirement: Commandless skill receives its compiled grants in its frontmatter

The universal `new-change-branch` skill, which has no command wrapper, SHALL carry an `allowed-tools: {{capabilityAllowedTools}}` frontmatter placeholder. The Claude Code projection SHALL replace it with the compiled tool grants of `new-change-branch-command`. The opencode projection SHALL remove that frontmatter line, because opencode takes its rules from the primary agent. No projected copy SHALL keep a `{{capability` placeholder.

#### Scenario: Claude Code skill carries compiled grants
- **WHEN** the install manifest is expanded for Claude Code
- **THEN** the projected `skills/new-change-branch/SKILL.md` has an `allowed-tools` line holding the compiled `Bash` grant

#### Scenario: opencode skill drops the grants line
- **WHEN** the install manifest is expanded for opencode
- **THEN** the projected `skills/new-change-branch/SKILL.md` has no `allowed-tools` line and no capability placeholder
