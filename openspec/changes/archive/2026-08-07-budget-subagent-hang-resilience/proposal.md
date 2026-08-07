**Complexity**: high (8 capabilities, 8 spec files, 6 skill files, 15 affected paths, no breaking change, no new dependency)

## Why

A budget subagent that blocks inside a single tool call today takes the whole session with it. Three automatic defenses were assumed to catch this case and were disproved by direct probing in this session: the harness stall watchdog did not fire after roughly 600 seconds of complete silence, the Bash timeout does not kill a hung command but moves it to the background (leaving it orphaned), and a step budget cannot fire on a hang because the counter never advances past the blocked turn. The stall watchdog was probed with `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` unset, which matches this project's current configuration; the configured case (a non-zero value set explicitly) was not probed and is recorded below as an open question.

The seven Claude Code routed workers already declare `run_in_background: true` (`sai/orchestration/workers/bindings/claude/design-worker.md:5`), but the six `budget-*` skill bindings declare nothing — leaving the dispatch mode to be inherited as an unstated harness default. A synchronous dispatcher that spawns a background child loses the child's result silently, and the worker-lifecycle protocol has no terminal status representing "never returned" (`openspec/specs/worker-lifecycle-protocol/spec.md:23`).

This change adopts background dispatch for blast-radius containment on Claude Code, codifies the dispatch-safety invariant that must accompany it, adds evidence-backed read guardrails to keep a budget subagent from blocking inside one unbounded Read, and records the stall-watchdog gap and the absence of an opencode equivalent of `run_in_background` as documented asymmetries. The Claude Code half delivers the stated hang-containment benefit; the opencode half is a documentation-parity improvement only, because opencode's `task` tool has no `run_in_background` parameter and no in-scope containment mechanism is specified. Cross-harness parity is preserved at the binding-declaration level; behavioural parity for hang containment on opencode is recorded as an open platform gap.

## What Changes

The `openspec/specs/*.md` entries below describe the **post-sync main-spec state**, not files the change's implementation commits edit directly: the delta specs in `openspec/changes/budget-subagent-hang-resilience/specs/` merge into the main specs at archive time via the archive step-4 sync (`sai/instructions/archive.md:42-47`) and the `openspec-sync-specs` operation. The implementation commits of this change edit only the six skill files and `AGENTS.md`.

- **MODIFIED `skills/claude/budget-explorer/SKILL.md`** — adds an explicit dispatch-mode declaration (`run_in_background: true`) to the Subagent binding section, with a normative note identifying the dispatcher that must await the child's result.
- **MODIFIED `skills/claude/budget-executor/SKILL.md`** — same.
- **MODIFIED `skills/claude/budget-subagent/SKILL.md`** — same.
- **MODIFIED `skills/opencode/budget-explorer/SKILL.md`** — declares the opencode dispatch mode explicitly; opencode has no `run_in_background` parameter on the `task` tool, so the binding records the synchronous default and points to the dispatch-safety invariant as the containing rule.
- **MODIFIED `skills/opencode/budget-executor/SKILL.md`** — same.
- **MODIFIED `skills/opencode/budget-subagent/SKILL.md`** — same.
- **NEW `openspec/specs/dispatch-safety-invariant/spec.md`** — codifies the rule that background dispatch is only valid from a dispatcher whose own lifetime outlives the child, enumerates the permitted dispatcher call sites, and requires a check that verifies the dispatcher-class declaration.
- **MODIFIED `openspec/specs/budget-subagent-platform-bindings/spec.md`** — adds an umbrella requirement that all six `budget-*` bindings declare the dispatch mode and identify the awaiting dispatcher.
- **MODIFIED `openspec/specs/budget-explorer-file-reading/spec.md`** — designates this spec as the canonical home of the bounded-read guardrails (transcript, JSONL/.output, binary, bounded Grep with `head_limit`); rewrites the rationale as risk-reduction hygiene rather than a demonstrated causal remedy.
- **MODIFIED `openspec/specs/budget-subagent-file-reading/spec.md`** — consumes the bounded-read guardrails from `budget-explorer-file-reading` by reference instead of duplicating them; the existing readFile tool-binding requirement is unchanged.
- **MODIFIED `openspec/specs/budget-explorer-file-discovery/spec.md`** — extends the bounded-read guardrails to discovery paths.
- **MODIFIED `openspec/specs/budget-executor-file-discovery/spec.md`** — same.
- **MODIFIED `openspec/specs/budget-subagent-file-discovery/spec.md`** — extends the bounded-read guardrails to the budget-subagent's discovery paths (previously omitted from this change's scope; added for parity with the explorer and executor discovery specs).
- **MODIFIED `openspec/specs/asymmetry-documentation/spec.md`** — narrows the stall-watchdog claim to what was observed (unset, inactive by default); reframes the no-dependency rule to apply to this change's design only; records the configured case as an open question.
- **MODIFIED `AGENTS.md`** — adds the documented-asymmetries entry for the unset `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` and the opencode `run_in_background` gap, and the no-stall-watchdog-by-default rule for this change's design constraints.

*(Wording alignment note: per the design-phase review of this change, the `openspec/specs/*.md` entries above are archive-time merge targets of the delta specs, governed by `sai/instructions/archive.md:42-47` and the `openspec-sync-specs` operation — see `design.md` Context for full provenance.)*

## Capabilities

### New Capabilities

- `dispatch-safety-invariant`: normative rule that background dispatch is only valid from a dispatcher whose own lifetime outlives the child, and that violating it discards the child's result silently.

### Modified Capabilities

- `budget-subagent-platform-bindings`: every `budget-*` binding declares the dispatch mode explicitly (Claude Code: `run_in_background: true`; opencode: synchronous default documented) and names the dispatcher that must await the child.
- `budget-explorer-file-reading`: bounded-read guardrails (canonical home) — never Read an agent transcript or `.output`/JSONL file, never Read a binary, prefer bounded Grep with `head_limit` over a whole-file Read.
- `budget-subagent-file-reading`: consumes the bounded-read guardrails from `budget-explorer-file-reading` by reference.
- `budget-explorer-file-discovery`: discovery paths respect the same bounded-read guardrails.
- `budget-executor-file-discovery`: same.
- `budget-subagent-file-discovery`: same.
- `asymmetry-documentation`: record the observed stall-watchdog state (unset in this project's configuration, inactive by default) and the opencode `run_in_background` gap, with the configured case as an open question.

## Impact

- Six skill files gain a `## Dispatch mode` subsection: `skills/claude/budget-{explorer,executor,subagent}/SKILL.md` and `skills/opencode/budget-{explorer,executor,subagent}/SKILL.md`.
- One new spec: `openspec/specs/dispatch-safety-invariant/spec.md`.
- Seven modified specs under `openspec/specs/`.
- `AGENTS.md` gains a documented-asymmetries entry for the unset `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` and the opencode `run_in_background` gap, and a no-stall-watchdog-by-default rule for this change's design constraints.
- Hang containment is delivered on Claude Code via the explicit `run_in_background: true` declaration. The opencode half of this change is a documentation-parity improvement; opencode's `task` tool has no equivalent parameter and no in-scope containment mechanism is specified.
- No production code, no installer change, no harness configuration change, no routed-worker binding change.

## Proposal Research Documentation

**Local files**:

- `openspec/specs/worker-lifecycle-protocol/spec.md:23` — confirmed the four-status contract (`completed` / `needs_input` / `failed` / `cancelled`); no `hung` or `never_returned` status exists.
- `openspec/specs/budget-subagent-platform-bindings/spec.md` — confirmed the existing spec is `budget-subagent`-specific and the binding requirements (subagent_type, model) declare no dispatch mode.
- `openspec/specs/budget-explorer-file-reading/spec.md`, `openspec/specs/budget-subagent-file-reading/spec.md`, `openspec/specs/budget-explorer-file-discovery/spec.md`, `openspec/specs/budget-executor-file-discovery/spec.md`, `openspec/specs/budget-subagent-file-discovery/spec.md` — confirmed all five are single-requirement specs with no read/discovery guardrails. `budget-subagent-file-discovery` is added to this change's modified set for parity with the explorer and executor discovery specs.
- `openspec/specs/asymmetry-documentation/spec.md` — confirmed the existing spec uses an "X is documented + rationale" pattern; the new finding will follow the same shape.
- `sai/orchestration/workers/bindings/claude/design-worker.md:5` — confirmed the routed-worker pattern (`Agent(subagent_type: "sai-2-design-worker", run_in_background: true, ...)`).
- `sai/orchestration/workers/bindings/{claude,opencode}/{spec,design,implementation,review,security,performance,accessibility}-worker.md` — confirmed all seven Claude Code routed workers declare `run_in_background: true`; the seven opencode routed workers do not (the opencode `task` tool has no equivalent parameter).
- `sai/orchestration/workers/bindings/opencode/design-worker.md` — confirmed the opencode routed-worker pattern uses `task(subagent_type, prompt)` with no background parameter; this is the documented asymmetry.
- `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-subagent/SKILL.md` — confirmed all three declare `subagent_type` and `model` but declare no `run_in_background`.
- `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md` — same; none declares the dispatch mode.
- `sai/instructions/review.md:151` — confirmed the only existing per-mutation time bound in the repository is a 60-second test timeout, unrelated to subagent hang containment.
- `agents/claude/sai-2-design-worker.md:10` — confirmed that routed SAI workers do load `budget-explorer` (and may dispatch it from inside a worker), which establishes the routed-worker dispatcher class that the dispatch-safety-invariant spec enumerates.

**External URLs**: None consulted.

## Additional Notes

### Non-goals (recorded to prevent scope drift)

- `maxTurns` / step budgets; the implementer will not introduce agent-level step caps.
- Reaping orphaned background shell processes; no mechanism is specified to terminate orphaned Bash work.
- Size-threshold and network-path read rules; deferred until the actual hang trigger is diagnosed as size-related, path-related, or random.
- A `budget-executor-file-reading` capability does not exist, so the budget-executor's direct (non-discovery) Reads are not governed by bounded-read guardrails in this change. Adding such a capability is a non-goal here to avoid expanding scope; if future work introduces `budget-executor-file-reading`, that change will add the same guardrails by reference to `budget-explorer-file-reading`.
- An opencode hang-containment mechanism; opencode's `task` tool has no `run_in_background` parameter, and no in-scope prompt-and-configuration mechanism is specified to deliver behavioural hang containment on opencode in this change.

### Open Questions

- **Stall watchdog under explicit configuration:** does setting `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` to a non-zero value activate the watchdog? This was not probed in this change; the empirical observation was with the variable unset, matching this project's current configuration. A future change may probe the configured case and either activate or permanently reject the watchdog as a containment layer.
- **Actual hang trigger:** what file or command caused the observed hang? The three banned classes (agent transcripts, JSONL/.output files, binary files) are plausible candidates but no probe has demonstrated which one is the actual trigger. The read guardrails in this change are risk-reduction hygiene, not a demonstrated causal remedy. A future change may diagnose the trigger and add more targeted guardrails.
- **Opencode hang-containment mechanism:** is there a prompt-and-configuration-only mechanism that would deliver behavioural hang containment on opencode? This change specifies none; future work may propose one (or formally accept the opencode hang risk as a documented platform gap).

### Change Scope Rationale

The change bundles two logical halves — dispatch containment (proven by direct probing in this session) and bounded-read guardrails (self-described as risk-reduction hygiene whose causal link to the observed hang is unproven) — for the following reasons:

- Both halves target the same risk class (hang resilience on `budget-*` subagents) and modify the same six skill files. Splitting would create two changes that touch the same set of files, complicating install/doctor flow and increasing review burden.
- The guardrails are low-risk hygiene: rejecting transcripts, JSONL/.output files, and binaries; preferring bounded Grep with `head_limit`. They do not depend on a proven causal link to ship. The worst case is that they prevent legitimate reads in narrow cases, which a caller can override per call.
- A future diagnosis of the actual hang trigger (recorded above as an open question) may refine or extend the guardrails, but the containment half remains a self-contained deliverable that does not depend on the guardrails being correct. A future change can re-open the guardrails without re-opening the containment half.
- Bundling does not delay the containment half: both halves go through the same `/sai-1-spec` approval gate, and the containment half is implementable independently of the guardrails being proven.
