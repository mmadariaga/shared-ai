# Contract-required tool access

Consult this policy after task disclosure, before the first operation, and when
a required tool is rejected. Tool grants do not authorize operations, change
file-write scope, bypass confirmations, or transfer coordinator responsibilities.

## Profile check

Fetch the declared profile at `@sai/capabilities/{profile}.json` from the active
harness's installed SAI root. Read only that profile, not the complete registry
or another agent's grants. The installer compiles it from
`sai/install-manifest.json`; complete tool inventories belong only in executable
configuration. The full installed `sai/capability-requirements.json` is available
for tooling and command configuration, not an always-loaded prompt reference.

For commands, check the command session itself, independently of workers.
Compare applicable required capabilities with the live tool catalog, including
deferred tools and auxiliary access. Defer panel availability to the panel
adapter. Do not call a tool outside the profile to probe it.

Permission actions are not tool names. In opencode the `edit` action covers
both `edit`/`write` and model-specific `patch`; either tool combination can
fulfil `write`. In Claude Code use the applicable native shell, Bash or
PowerShell 7, rather than warning about the other platform's absent shell.
The compiled `toolRequirements` records these alternatives.

- **Claude Code:** agent `tools` filters the tool pool. Command `allowed-tools`
  pre-approves listed tools for the invocation turn; it does not remove unlisted
  tools and does not override inherited deny or ask rules. Shell restrictions
  and delegation-target restrictions in a nested agent still require the
  contract and permission settings; a `tools: Bash` or `tools: Agent` grant is
  not a command or nested-target sandbox. Inspect `/permissions` and approve
  the required operation normally if inherited settings block it. Never set
  `bypassPermissions` or remove an organization policy to obtain parity.
- **opencode:** agent rules append after inherited rules, with the last match
  winning. Projection denies actions by default and grants selected V2 actions.
  Commands have no permission field: they retain the active primary agent.
  The compiled command requirements supply native rules for configuring that
  agent, not a per-command restriction. If its access is insufficient, stop
  naming the required action and resource; ask the user to select a primary
  agent with that access or add the applicable rules to its `permissions`.
  Hard-deny policies remain authoritative. Do not silently launch a worker
  instead, install a coordinator agent, or change global permissions.

## Effective verification

A rendered file is not evidence of effective access. Use the harness's live
catalog and permission evaluation for representative, non-mutating resources.
For opencode V2, `session.permission.create` evaluates an action and resources
in an existing session, with the selected agent; the result must allow the
operation, not merely parse its configuration. Inspect agent rules through
`agent.get` when needed. For Claude Code, inspect `/permissions` and the actual
available pool; a denied required call remains a permission incompatibility.
If evaluation is unavailable, report unverified access rather than success.
Do not probe mutations, solicit persistent approvals, or bypass safety checks.

Code Mode requires `execute` plus the nested MCP action. An allowed bridge
does not grant other permission-checked tools. V2 session utilities do not have
individual permission actions, so the bridge is not a sandbox for those
utilities; report this runtime limitation rather than claiming isolation that
the harness cannot enforce. Contracts still govern their use.

## Missing tools and remediation

Separate an absent runtime tool from a permission denial. An absent tool needs
installation, configuration, or a supported harness version; a denial needs a
specific native permission grant (subject to policy). Tool grants do not
install MCP servers or create panel tools. Research notices and their filter
live in `@sai/policies/explore-agent.md` § Missing-tool notice presentation;
consult that section when presenting an explorer result. Panel failures remain
in `sai/adapters/{claude,opencode}/panel-render.md`.
