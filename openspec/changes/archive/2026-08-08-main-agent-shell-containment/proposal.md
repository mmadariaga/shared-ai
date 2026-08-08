**Complexity**: high (4 capabilities — 3 new + 1 modified — 12 requirements, 3 affected paths, no breaking change)

## Why

`sai-explore` is the only entrypoint in scope that runs the OpenSpec prerequisite check inline in the main agent, while its routed siblings already contain their evidence in subprocesses — and `commands/claude/sai-1-spec.md` carries no `allowed-tools` fence although its coordinator prohibition exists only as prose. The main agent should render state transitions; subprocesses hold evidence. This change closes both gaps: the explore check is delegated to a budget subagent that returns only a verdict, and sai-1's entrypoint gets the same harness-enforced fence its sibling coordinators declare.

## What Changes

- `sai/commands/sai-explore.md` `## Prerequisite checks` stops running the three OpenSpec checks inline; the check content (`@sai/policies/prereqs-check.md`) is delegated to one budget subagent per invocation that returns only a `pass` or `halt` verdict, while the main agent keeps the path table (`@sai/policies/prereqs-paths.md`) locally.
- A failing delegated check still halts `sai-explore` with the original literal remediation text from `sai/policies/prereqs-check.md`, verbatim — never a summarized worker failure.
- `commands/claude/sai-1-spec.md` declares the same restricted `allowed-tools` fence as the other routed coordinators per the `per-command-tool-scoping` capability (`Read, Glob, Skill, Agent, SendMessage, AskUserQuestion`), so the coordinator prohibition in `sai/commands/spec/coordinator.md` becomes harness-enforced rather than prose-only.
- No **BREAKING** change: the check's halt semantics, messages, and no-write-on-failure rule are unchanged; `sai-explore`'s wrapper tool lists are unchanged; the opencode sai-1 wrapper is unchanged (recorded exemption — opencode has no per-command tool-restriction frontmatter field, same as the existing sai-explore read-only enforcement precedent).

## Capabilities

### New Capabilities

- `explore-prereqs-delegation`: sai-explore's prerequisite check runs in a budget subagent; only the verdict surfaces in the main conversation, and the path reference stays in the main agent.
- `halt-message-fidelity`: a failing check still halts sai-explore with the original literal remediation text, not a summarized worker failure.
- `sai-1-tool-fence`: /sai-1-spec's entrypoint declares the same restricted tool set its sibling coordinators declare.

### Modified Capabilities

- `per-command-tool-scoping`: the coordinator enumeration admits the spec coordinator, growing the fenced set from six to seven routed coordinators; the shared `allowed-tools` list itself is unchanged, and the sai-explore/Copilot requirements of that capability are untouched.

## Impact

- `sai/commands/sai-explore.md` — the `## Prerequisite checks` section changes from inline fetch-and-run of `@sai/policies/prereqs.md` to: fetch `@sai/policies/prereqs-paths.md` locally, delegate the checks from `@sai/policies/prereqs-check.md` to one budget subagent, and relay the verdict.
- `commands/claude/sai-1-spec.md` — one frontmatter line added: `allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion`.
- `openspec/specs/per-command-tool-scoping/spec.md` — coordinator enumeration updated from six to seven (spec coordinator admitted).
- Explicitly not touched: `commands/opencode/sai-1-spec.md` (recorded exemption), `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`, `sai/commands/spec/coordinator.md`, `commands/claude/sai-explore.md`, `commands/opencode/sai-explore.md`, `sai/policies/prereqs*.md`, `sai/install-manifest.json`.
- No dependency or API changes.

## Proposal Research Documentation

**Local files**:
- `sai/commands/sai-explore.md` — the fetch site (`## Prerequisite checks`, line 10 `Fetch @sai/policies/prereqs.md`) that changes to a delegated check
- `commands/claude/sai-explore.md`, `commands/opencode/sai-explore.md` — wrapper frontmatter; Claude grants `Bash(openspec:*)`/`Bash(git:*)`, opencode has no tool-restriction field
- `commands/claude/sai-1-spec.md` — the unfenced entrypoint (no `allowed-tools` line)
- `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md` — the fence to mirror: `allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion`
- `commands/opencode/sai-1-spec.md`, `commands/opencode/sai-2-design.md`, `commands/opencode/sai-3-implement.md` — opencode parity surface (no `allowed-tools` contract)
- `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, `sai/commands/implement/coordinator.md` — prose prohibition on running prerequisites, currently unenforced for sai-1
- `sai/policies/prereqs-check.md` — the executable check artifact with the three exact STOP-and-print messages
- `sai/policies/prereqs-paths.md` — the path-table half that stays in the main agent
- `sai/policies/prereqs.md` — the composing entry point (2-line router), delivered both halves pre-change
- `skills/claude/budget-subagent/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md` — spawn binding, structured completion report, dispatch-mode declarations
- `sai/orchestration/workers/bindings/claude/spec-worker.md`, `sai/orchestration/workers/bindings/opencode/spec-worker.md` — dispatch-and-await precedent for a parent that outlives its child
- `openspec/specs/per-command-tool-scoping/spec.md` — six-coordinator fence + sai-explore read-only scoping + opencode/Copilot no-frontmatter clause
- `openspec/specs/dispatch-safety-invariant/spec.md` — the main agent is a permitted dispatcher class for background budget-* bindings
- `openspec/specs/explore-context-isolation/spec.md`, `openspec/specs/explore-pipeline-supervision/spec.md` — explore stays a read-only coordinator; review-loop artifact reads stay in the main agent (non-goal)
- `openspec/changes/archive/2026-08-08-split-prereqs-check-and-paths/` — the dependency change that split `prereqs.md` into check + paths halves
- `openspec/specs/prereqs-file-decomposition/spec.md`, `openspec/specs/prereqs-composition-compatibility/spec.md` — live dependency specs pinning the two halves and the composing entry
- `GLOSSARY.md` — two domain terms resolved and appended by this proposal: **Prerequisite Verdict** and **Tool Fence**
- `AGENTS.md` — "Explore-mode read-only enforcement" section documents the opencode no-frontmatter precedent

**External URLs**: none

## Additional Notes

- **Dependency**: `split-prereqs-check-and-paths` is archived (`2026-08-08-` prefix) and its delta specs are live in `openspec/specs/`. The seam it opened is exactly what this change uses: the check half goes down to the subagent, the path half stays up.
- **Delegation shape**: one budget subagent spawn per `sai-explore` invocation, including sessions that never touch `openspec/` (accepted trade-off — an early, predictable halt is worth one cheap spawn). The verdict payload rides in the completion report's `output` field — `verdict: pass` or `verdict: halt` plus the verbatim halt message on halt — while the report's envelope `status` stays within the budget-subagent binding's closed vocabulary (`success | partial | failed`); an envelope `failed`/`partial` is a dispatch failure, not a verdict (recorded in-place amendment, `approval.specs.amendment`). The subagent returns no path table and no raw shell evidence.
- **Residual main-agent shell calls**: the `openspec-explore` skill still runs `openspec list --json` in the main agent on every invocation (it is an explicit non-goal of this change), so `commands/claude/sai-explore.md` retains `Bash(openspec:*)`. Net containment after this change is therefore: the three prerequisite checks' shell evidence moves into the subprocess, at the cost of one spawn per invocation, while the skill's list call — a comparable CLI read — remains main-agent-side by design. The trade-off buys the prereq-check evidence out of the main surface, not all openspec CLI evidence.
- **Dispatch safety**: the main agent is a permitted dispatcher class for both budget-subagent bindings per `dispatch-safety-invariant` — Claude (`run_in_background: true`, awaited on the main agent's own turn) and opencode (synchronous default). The shared `sai/commands/sai-explore.md` body carries the delegation so both harness projections inherit it.
- **Non-goals**: the post-crystallization review-loop keeps reading artifacts in the main agent (explicitly deferred); `sai-4` through `sai-8`, `sai-pr`, `sai-commit`, `sai-status`, and the `openspec-explore` skill are untouched.
- **Modified capability**: `per-command-tool-scoping` (whose live spec enumerates the fenced coordinator set) is carried as a MODIFIED capability so its enumeration admits the spec coordinator — otherwise the live capability would silently describe six of seven fenced coordinators after this change. Its sai-explore and Copilot requirements are untouched; the opencode/Copilot "no frontmatter contract" clause remains the recorded-exemption precedent.
- **Recorded exemption**: opencode has no per-command tool-restriction frontmatter field (the AGENTS.md "Explore-mode read-only enforcement" note and `per-command-tool-scoping`'s opencode/Copilot clause are the precedents), so the sai-1 fence is Claude-frontmatter-only; the opencode prohibition remains the prose contract in `sai/commands/spec/coordinator.md`, and the exemption is recorded in the `sai-1-tool-fence` spec.
- **Fidelity mechanism**: because the halt now crosses a process boundary, the subagent's output contract carries the verbatim remediation text and the main agent relays it unchanged — locality is replaced by an explicit fidelity requirement (`halt-message-fidelity`).
