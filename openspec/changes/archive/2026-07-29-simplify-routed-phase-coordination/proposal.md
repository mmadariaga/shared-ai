**Complexity**: high (11 capabilities, 31 requirements, breaking, 17 affected paths)

## Why

The dedicated opencode `sai-coordinator` primary profile now carries nothing but an enumerated worker task-allowlist that must grow with every new numbered worker, because its model and variant can be declared directly on the `sai-2-design` and `sai-3-implement` wrappers. Separately, the sai-2 → sai-3 "Continue now" transition couples two phase lifecycles in one prompt without transferring any worker context, since implementation planning already reconstructs everything it needs from the durable OpenSpec artifacts on disk.

## What Changes

- Remove the dedicated opencode `sai-coordinator` primary agent profile from the canonical config sample, the installer's managed-agent projection, and the doctor inventory it derives.
- **BREAKING** Accept that the opencode coordinator's native `question` capability and its `task` dispatch to the numbered workers become preconditions on the session's currently selected primary agent, rather than permissions shipped in configuration. Document the prerequisite and its remediation (switch to a permissive primary agent).
- Declare the coordinator runtime on the opencode `sai-2-design` and `sai-3-implement` wrappers themselves: `model: opencode-go/glm-5.2` with `variant: high`, replacing `agent: sai-coordinator`.
- Keep the logical coordinator role exactly where it lives today — inside the shared `sai/commands/sai-2-design.md` and `sai/commands/sai-3-implement.md` bodies and the canonical coordinator contract. Only the named harness agent disappears.
- End `/sai-2-design` after the design artifacts are written and the artifact-feedback gate completes. The post-feedback Stop / Continue-now question and the entire Continue-now branch are removed; the design command emits its existing completion stop unconditionally.
- **BREAKING** `/sai-3-implement {name}` must now be invoked explicitly in a new chat after `/sai-2-design` finishes. The previously supported same-prompt continuation into implementation planning is gone on Claude Code, opencode, and GitHub Copilot alike.
- Drop the `sai-3-implementation-worker` binding fetch and its dispatch permission from the `sai-2-design` wrappers, since sai-2 no longer dispatches that worker.
- Preserve the routed coordinator → worker architecture unchanged, so a future slice can read `**Complexity**` from the proposal after startup and route the technical worker accordingly.
- Update the installer projections, the opencode config sample, doctor expectations, the affected tests, and the installation/architecture documentation so they describe the runtime that actually ships.

## Capabilities

### New Capabilities

- `opencode-coordinator-runtime`: the opencode `sai-2-design` and `sai-3-implement` wrappers own the logical coordinator's model and variant (`opencode-go/glm-5.2`, `variant: high`); no dedicated primary coordinator profile is installed or configured.
- `design-phase-navigation`: `/sai-2-design` terminates after design-artifact completion and the artifact-feedback gate, with no post-feedback continuation question and no implementation-worker dispatch.
- `harness-coordination-parity`: Claude Code, opencode, and GitHub Copilot expose the identical sai-2 → sai-3 phase boundary while each keeps its own worker-dispatch or inline mechanism.
- `installer-and-documentation-alignment`: installation, configuration, doctor checks, tests, and documentation describe the coordinator runtime without a dedicated coordinator profile and without a same-prompt design-to-implementation continuation.

### Modified Capabilities

- `design-coordinator`: removes the `shared-routed-coordinator-profile` requirement and narrows post-design navigation to the Stop-only terminal path.
- `implementation-coordinator`: removes the `shared-routed-coordinator-profile` requirement and the wrapper's `agent: sai-coordinator` selection.
- `design-harness-bindings`: retires `opencode-config-coordinator-restrictions`; the opencode coordinator is no longer a configured agent with a task allowlist.
- `design-behavioral-parity`: the "Stop and Continue navigation remain equivalent" requirement becomes a Stop-only parity requirement across the three harnesses.
- `sai-2-continue-branch-flow`: removed in full — the (b) Continue-now branch it constrains no longer exists.
- `implementation-continuation`: removed in full — the recommended-default-first gate it constrains no longer exists.
- `implementation-harness-bindings`: the opencode coordinator-worker binding drops the configured coordinator agent, its task allowlist, and its live permission probe in favour of wrapper-declared model and variant.

## Impact

Affected files:

- `commands/opencode/sai-2-design.md`
- `commands/opencode/sai-3-implement.md`
- `commands/claude/sai-2-design.md`
- `configs/opencode.jsonc`
- `bin/install-flow.js`
- `sai/commands/sai-2-design.md`
- `sai/orchestration/inline-invocation.md`
- `test/design-coordinator-worker.test.js`
- `test/implement-coordinator-worker.test.js`
- `test/install-opencode.test.js`
- `test/implementation-harness-bindings-step-3.test.js`
- `README.md`
- `INSTALL.opencode.md`
- `AGENTS.md`
- `docs/adr/0089-shared-sai-coordinator-profile.md`
- `docs/adr/0080-design-to-implementation-lifecycle-boundary.md`
- `docs/adr/0000-INDEX.md`

Explicitly not touched: `sai/orchestration/coordinator-contract.md`, `sai/orchestration/worker-lifecycle.md`, the worker definitions under `sai/orchestration/workers/`, and the worker bindings — the routed architecture and worker model/effort configuration stay exactly as they are.

Dependencies: none added or removed.

Systems: `bin/doctor.js` derives its opencode agent inventory from `install-flow.js`'s `OPENCODE_MANAGED_AGENTS`, so removing the entry there propagates to doctor without a separate edit; the doctor tests that assert the coordinator entry still need updating.

## Proposal Research Documentation

**Local files**:

- `sai/commands/sai-1-spec.md`, `sai/commands/sai-2-design.md`, `sai/commands/sai-3-implement.md`, `sai/commands/sai-2-design-inline.md`
- `sai/policies/prereqs.md`, `sai/policies/remember.md`, `sai/policies/glossary-format.md`, `sai/policies/artifact-feedback-gate.md`
- `sai/instructions/spec.propose.md`
- `sai/orchestration/inline-invocation.md`
- `sai/install-manifest.json`
- `commands/opencode/sai-1-spec.md`, `commands/opencode/sai-2-design.md`, `commands/opencode/sai-3-implement.md`
- `commands/claude/sai-2-design.md`, `commands/copilot/sai-2-design.prompt.md`
- `configs/opencode.jsonc`
- `bin/install-flow.js`, `bin/doctor.js`
- `README.md`, `INSTALL.opencode.md`
- `openspec/specs/design-coordinator/spec.md`, `openspec/specs/implementation-coordinator/spec.md`, `openspec/specs/design-harness-bindings/spec.md`, `openspec/specs/design-behavioral-parity/spec.md`, `openspec/specs/sai-2-continue-branch-flow/spec.md`, `openspec/specs/implementation-continuation/spec.md`, `openspec/specs/opencode-wrapper-frontmatter-defaulting/spec.md`

**External URLs**:

- `https://opencode.ai/docs/commands/` — resolved that a command's `agent` field "defaults to your current agent" when omitted
- `https://opencode.ai/docs/agents/` — primary vs subagent modes, `build` as the default primary agent, `switch_agent` / Tab switching

## Additional Notes

- Current opencode wrapper frontmatter is `agent: sai-coordinator` plus `subtask: false`; the replacement is `model: opencode-go/glm-5.2`, `variant: high`, `subtask: false`. Removing `agent:` means the invocation runs under the session's **currently selected** primary agent, not a fixed built-in one: opencode's command documentation states the `agent` field "defaults to your current agent", and primary agents are switchable mid-session via the `switch_agent` keybind (Tab). In a stock setup that is `build`, which has all tools enabled, and `configs/opencode.jsonc` declares no top-level `permission.task` or `permission.question` restriction — so the default path works. A user sitting in a restrictive primary agent (`plan`, a custom profile, or a leftover `sai-coordinator` whose allowlist predates a newer worker) will see the phase fail; the documented remedy is to switch primary agents.
- The removed profile granted two things: the worker task allowlist and `permission.question: allow`. Losing the second matters more than losing the first, because both routed coordinators must present `needs_input` questions and the artifact-feedback gate through the native picker. Neither is replaced by shipped configuration; both become documented preconditions on the invoking agent.
- `subagent_depth: 2` lives at the top level of `configs/opencode.jsonc`, not inside the coordinator profile, so worker dispatch depth survives the profile removal untouched.
- `openspec/specs/opencode-wrapper-frontmatter-defaulting/spec.md` requires wrappers to omit `variant: default`; `variant: high` is a non-default value and is therefore required to be explicit.
- The Continue-now text lives in three places: `sai/commands/sai-2-design.md` (`## Design navigation`, routed), `sai/orchestration/inline-invocation.md` steps 8–10 (Copilot inline), and the `commands/claude/sai-2-design.md` + `commands/opencode/sai-2-design.md` wrappers that preload the `sai-3-implementation-worker` binding skill.
- `commands/claude/sai-2-design.md` frontmatter currently lists `allowed-tools: Skill, Agent, SendMessage, AskUserQuestion`; `Agent`/`SendMessage` remain needed for the design worker itself, so only the sai-3 worker skill fetch is dropped, not the tool grants.
- `docs/adr/0089-shared-sai-coordinator-profile.md` and `docs/adr/0080-design-to-implementation-lifecycle-boundary.md` record decisions this change reverses; per repo ADR convention they should be superseded rather than deleted.
- Complexity-based worker selection is deliberately out of scope. The requirement to preserve the routed coordinator → worker seam exists solely to keep that path open.
- The two halves of this change are technically independent: coordinator-profile removal is an opencode runtime/configuration concern, and continuation removal is a cross-harness phase-boundary concern. They were scoped together deliberately in the originating handoff, and the change is kept as one unit; splitting it into two sequenced changes remains a viable de-risking option if review or rollback proves unwieldy. The split line is clean — capabilities `opencode-coordinator-runtime` + `implementation-harness-bindings` + `design-harness-bindings` on one side, `design-phase-navigation` + `harness-coordination-parity` + `design-behavioral-parity` + `sai-2-continue-branch-flow` + `implementation-continuation` on the other, with `design-coordinator`, `implementation-coordinator`, and `installer-and-documentation-alignment` split across both.
- `/sai-2-design`'s completion message recommends a new chat; it cannot prevent the user from invoking `/sai-3-implement` in the same one. The enforceable guarantee is that no design-phase invocation state is forwarded; same-chat conversational carryover is handled by the existing Isolation Mode block at the top of each command body.
