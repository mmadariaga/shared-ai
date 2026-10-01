# Contract-derived tool capabilities

## Ownership and projection

`sai/install-manifest.json` owns capability profiles and assignments for every
managed worker, the three Generic Agents, and every command. Profiles inherit
shared access and replace list-valued fields when a role narrows a grant.
`bin/capabilities.js` validates and translates them; native syntax stays in
the Claude Code and opencode templates. The installer, doctor, and uninstall
consume the same compiled `sourceText`. Generated source paths use `.tmp/`,
so uninstall's source materialization cannot overwrite executable or template
sources. Source command/Generic Agent files contain projection tokens and are
not installed verbatim.

The installed `sai/capabilities/{profile}.json` files provide just-in-time
profile disclosure. Agents and commands read only their declared profile;
the full command requirements registry is for tooling, not repeated prompt
context.

Worker contracts retain mutation ownership, allowed files, confirmation gates,
and delegation rules. Profiles grant access only. Implement's one-time initial
URL read receives direct web fetch; Design delegates web research and receives
the budget target needed for overview generation. Audits and Backfill receive
their explorer target. RED/GREEN and the direct implementation/fix roles gain
no delegation. Archive's validated Direct Build mutations use shell, not native
file-edit tools. Backfill's draft-write exception receives both native creation
and modification access through the single abstract `write` capability.

Commands have independent assignments and compiled requirements. Claude Code
receives projected `allowed-tools` pre-approvals. Opencode keeps the active
primary agent; the installed requirements supply native permission rules to
configure it when needed, not an unsupported command permission field or a new
managed coordinator agent. Boot checks command access separately from workers.

## Native semantics and verification

Verified against the published native references and the available CLIs:
Claude Code 2.1.285 and opencode 2.0.21.

- Claude Code agent `tools` filters the pool. Command `allowed-tools` is a
  turn-scoped pre-approval, not a deny-list. Inherited deny/ask and organization
  policies can still block a required operation. Nested agent target lists
  and a bare `Bash` tool do not provide argument-level isolation.
- Opencode's V2 actions are `shell`, `subagent`, `edit`, `skill`, `execute`,
  and the other native actions documented in its permission reference. Agent
  rules append after inherited rules; the last matching rule wins. The
  projection's leading deny prevents inherited allow from opening excluded
  tools. Specific grants restore required actions even after inherited denies.
- CodeGraph MCP requires its exact action and the Code Mode bridge. Nested
  permission-checked tools remain denied when excluded. Native session utilities
  have no individual permission action; therefore this bridge is not a sandbox
  against those utilities. Contracts still constrain their use. Do not claim
  stronger isolation than the native runtime supplies.
- Neither a permission declaration nor an API permission result proves a tool
  exists. Compare the live catalog separately. Panel absence stays adapter-owned.

`test/capability-profiles.test.js` covers assignments, translation, exclusions,
auxiliary grants, notices, source protection, and unchanged model seeds.
`SAI_RUNTIME_ACCESS_TEST=1 node --test test/capability-runtime.test.js` additionally
uses the installed V2 server's configuration merge and permission evaluator on
representative non-mutating resources for every profile. It deliberately mixes
inherited grants and denies, verifies new/unknown actions stay denied, and
checks native Markdown model/variant parsing. It launches no model or worker,
probes no mutation, saves no approval, and leaves its fixture/session as evidence.
The runtime test bounds initialization reads because newly created definitions
are discovered asynchronously. Skipping this opt-in test is not a runtime pass.

The agent tunable-seed lifecycle keeps body-compatible definitions untouched.
When grants change the managed body/frontmatter, installation updates that
managed content while preserving the destination's model and effort/variant
lines, including omitted optional tunables. First installation still seeds the
repository defaults, and no ownership sidecar is introduced. This restores the
documented user-owned-tunable boundary: the prior installer compared full bytes
and reset tuning on every divergent reinstall. Project-local overrides,
managed policies, configuration merge ownership, and confirmations stay unchanged.

## Notices

`sai/policies/explore-agent.md` owns the research ladder and classification of
its discard payload. Its presentation section is consumed by Explore and
Design through precise references; `sai/tools/tool-access.js notices` filters
the structured diagnostics. Only granted, applicable environmental absences
with enabling guidance appear as missing-tool notices. Exclusions, irrelevant
queries, permission errors, and caller-instruction errors remain internal.
Legacy unclassified reasons do not become environmental warnings by inference.

## Native references

- https://code.claude.com/docs/en/sub-agents — tool pools and inherited permissions
- https://code.claude.com/docs/en/skills — command/skill pre-approval semantics
- https://code.claude.com/docs/en/permissions — deny/ask precedence and shell patterns
- https://opencode.ai/v2/docs/agents — agent merge and Markdown registration
- https://opencode.ai/v2/docs/permissions — native actions and nested permission checks
- https://opencode.ai/v2/docs/commands — supported command fields and active-agent behavior
- https://opencode.ai/v2/docs/tools — Code Mode, session utilities, and current built-ins
