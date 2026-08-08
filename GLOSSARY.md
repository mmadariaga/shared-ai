# shared-ai

Prompt and instruction library that orchestrates a structured AI-assisted development pipeline (sai-* commands) on top of OpenSpec. This glossary covers the pipeline's own domain language — its lifecycle phases, command roles, and artifact contracts.

## Language

**ADR**: "Architecture Decision Record — a decision record that documents a qualifying design decision about how the pipeline is built (layout, mechanism, tooling, ordering, policy) that does not encode a **Domain Invariant**; lives in `docs/adr/` and carries `# ADR NNNN:` H1s."
*Avoid*: architecture note, design note, "ADR/DDR" as an undecided family

**Advisor Skill**: "A read-only consultation skill (`mid-advisor`, `senior-advisor`) that a cheaper pipeline phase escalates to — a subagent running the model tier of the phase above it — returning a structured advice report instead of editing anything."
*Avoid*: consultant skill, oracle, reviewer skill, helper agent

**Architecture Snapshot**: "The concise `interfaces.md` subsection under **Target State** that inventories planned public surfaces, project-root-relative paths, and portable ASCII relationships or execution flows for design review."
*Avoid*: architecture summary, architecture diagram, interface overview

**Artifact Review**: "A read-only review of a change's OpenSpec artifacts — `proposal.md` and `specs/**` for sai-1, `design.md`, `tasks.md`, and `interfaces.md` for sai-2 — that produces structured findings with `High` / `Medium` / `Low` severities, run either manually through `sai-explore`'s post-crystallization review loop or by an independent pipeline reviewer."
*Avoid*: artifact audit, artifact check, doc review, artifact review loop

**Attempts Per Phase**: "Field 9 of the `/sai-4-apply` Subagent Report Contract — a list of `{phase, attempts, first_failure, note}` entries, one per verification phase the dispatch actually ran, where `attempts` counts command runs regardless of outcome and `first_failure` draws on a closed vocabulary, and whose absence can never block the workflow."
*Avoid*: retries, retry count, field 9 notes, iteration log, attempt log

**Auto-Answer**: "A supervised-pipeline answer that `sai-explore` gives to a spec worker's `needs_input` question on the user's behalf, without escalating, permitted only when its confidence in the answer is clearly above the qualitative **Confidence Threshold**."
*Avoid*: auto-reply, autonomous reply, silent answer, proxy answer

**Autonomy Audit Log**: "The in-conversation-only report presented at the end of a supervised spec phase listing every **Auto-Answer** given, the answer value, and the reasoning, written to no file or artifact."
*Avoid*: audit trail, decision log, autonomy report, answer log

**Backfilled Change**: "An OpenSpec change reconstructed post-implementation by `/sai-backfill`, with `backfilled: true` written to `.openspec.yaml` and contractually forbidden from producing `design.md`, `tasks.md`, or `implementation.md`."
*Avoid*: post-hoc change, retroactive change, reconstructed change

**Blind Test-Writer**: "The first `/sai-4-apply` dispatch of a **Split-Routed Step**, given only that Step's `interfaces.md` section plus injected testing context — never the GREEN implementation body — that writes the tests (and RED stubs) and verifies a valid RED."
*Avoid*: test dispatch, test agent, RED writer, test-first subagent

**Confidence Threshold**: "The qualitative judgment — not a computed number — above which `sai-explore` may **Auto-Answer** a supervised worker question and below or unclear of which it escalates the question to the user."
*Avoid*: confidence score, threshold value, certainty level, confidence cutoff

**Coordinator Verification**: "The `/sai-4-apply` coordinator's independent rerun of a Step's Verification Checklist after a Subagent Report and before checkbox marking or commit gating."
*Avoid*: trust check, report retest, coordinator retry

**DDR**: "Domain Decision Record — a decision record that documents a qualifying design decision encoding a **Domain Invariant**; lives in `docs/ddr/` and carries `# DDR NNNN:` H1s."
*Avoid*: domain ADR, domain decision, invariant record, "ADR/DDR" as an undecided family

**Decision Record Family**: "One of the two record families (`adr` or `ddr`) that a qualifying design decision resolves to via the ordered routing test — a decision encoding a **Domain Invariant** is a `ddr`, otherwise it is an `adr`; a record's entry lives in exactly one index, its own family's."
*Avoid*: record type, record class, template family, bare "family"

**Deferred Decision**: "A decision a change could have made and deliberately postponed because its cost rises the longer it waits, recorded in `design.md`'s `## Deferred` section with a concrete postponement cost and a recommendation."
*Avoid*: postponed decision, open question, non-goal, backlog item, TODO

**Domain Invariant**: "A constraint the pipeline's domain imposes that must hold of the pipeline's artifacts, records, or behavior at all times, stated as a property of the domain rather than as the mechanism that upholds it — the first test of the ordered routing test, which resolves a qualifying decision to the **DDR** family."
*Avoid*: business rule, hard constraint, invariant check, domain rule

**Execution Telemetry Appendix**: "The coordinator-authored `## Appendix: Execution Telemetry` table at the end of `implementation.md`, one row per **Attempts Per Phase** entry, whose `Step` and `dispatch` columns are supplied by the coordinator rather than reported by the subagent."
*Avoid*: telemetry log, retry appendix, metrics table, execution log

**Existing Tests Broken**: "The pinned fifth `## Step N` sub-field of `tasks.md` naming the existing tests a step breaks and each one's `compile` or `runtime` failure mode, shared fixtures first, `None` when it breaks none."
*Avoid*: Tests Affected, Broken Tests, test impact, regressions

**File Change Type**: "One of the four tokens (`A`, `M`, `D`, `R`) that prefixes each `**Files Affected**` entry of a `tasks.md` step, declaring what happens to the file in the step's commit — created, modified, deleted, or moved/renamed (an `R` entry carries the source path and the destination path in the form `R <source> -> <destination>`)."
*Avoid*: change type, change-kind, file verb, action letter

**Finding Identifier**: "The severity-prefixed label that identifies a **Review Finding** within a single review — the severity's initial followed by the finding's sequence within that severity (`H1`, `H2`, `M1`, `L1`) — derived from the finding's `Severity` field, which remains the source of truth."
*Avoid*: finding ID, issue number, pass-local identifier, finding label

**GREEN Conflict**: "The state where an Implementation Dispatch cannot make the test-writer's tests pass within bounded, test-file-untouching iteration, so it halts and reports to the coordinator for a human to decide whether the fault is the implementation, the test, or the interface."
*Avoid*: test failure, GREEN failure, broken test, unpassable step

**Implementation Dispatch**: "The second `/sai-4-apply` dispatch of a **Split-Routed Step**, given the GREEN implementation body, that writes the implementation and verifies GREEN and is forbidden from creating or modifying any test file."
*Avoid*: GREEN dispatch, impl agent, code writer, build dispatch

**Known-False Report Recovery**: "A bounded `/sai-4-apply` correction path for a Subagent Report that coordinator evidence disproves and whose safe cause and correction are clear."
*Avoid*: automatic retry, indefinite retry, advisor escalation

**Managed Worker**: "A phase worker whose agent and harness-specific registration are installed and tracked by the shared-AI installer. The user owns the tunable frontmatter keys (`model` and `effort` for Claude; `model` and `variant` for opencode): the installer preserves their lines on every update while overwriting the managed body and non-tunable frontmatter."
*Avoid*: worker agent, installer worker, managed agent

**Manual Verification**: "The closing section of `design.md` listing the checks that are cheap by hand and expensive to automate — generated-artifact drift and end-to-end smoke — naming the middle tier between automated tests and `/sai-5-review`."
*Avoid*: QA checklist, manual QA, smoke test section, verification steps

**Orchestration Core**: "The canonical `sai/orchestration/` contracts for coordinator mechanics and worker lifecycle behavior shared by routed planning phases."
*Avoid*: shared worker prompt, universal phase prompt, coordinator implementation

**Phase Policy**: "The design-only or implementation-only rules layered by a separate phase worker contract over the shared **Orchestration Core** lifecycle."
*Avoid*: lifecycle core, shared phase logic, conditional worker branch

**Phase Transition**: "The supervised pipeline report that records the completed outcome of one phase before the next phase begins."
*Avoid*: phase handoff, phase switch, transition notice

**Proposal Complexity**: "The single `low` / `medium` / `high` token on the `**Complexity**` line at the top of `proposal.md`, describing the coarse size of a whole change as judged at spec time from five signals, before `design.md` and `tasks.md` exist."
*Avoid*: change complexity, proposal routing, proposal size, change tier

**Provenance Marker**: "The pinned `**Provenance**` sub-field on every `design.md` Decision carrying one of `user` / `codebase-forced` / `derived`, signalling how re-litigable the decision is downstream."
*Avoid*: Decision Source, Origin, decision tag, author marker

**Question Context Contract**: "The mandatory five-element anatomy of every user-facing decision prompt — what is being decided, why it matters, plain-language options, essential state context, and plain wording — single-sourced in `sai/policies/question-context.md` and required of worker `needs_input` questions, design notice messages, and the fixed instruction gates."
*Avoid*: decision prompt, question anatomy, prompt context, context contract, question template

**Recovery Dispatch**: "The single corrective subagent dispatch permitted by Known-False Report Recovery, constrained to the current Step and existing plan scope."
*Avoid*: retry dispatch, second opinion, advisor dispatch

**Report Template Parity**: "The pinned requirement that a report artifact's two template families — the OpenSpec schema scaffold under `openspec/schemas/sai-workflow/templates/` and the write-time contract under `sai/instructions/_templates/` — present the same section skeleton and header metadata, diverging only in placeholder syntax, guidance depth, and code-fence wrapping."
*Avoid*: template equality, template unification, template consistency

**Review Finding**: "A single structured issue identified by an **Artifact Review**, carrying a severity-prefixed identifier, a `High`, `Medium`, or `Low` severity, artifact location, issue statement, and recommended correction."
*Avoid*: review issue, review comment, audit finding

**Review-Loop Token**: "The literal, English-invariant string `review-loop` that a user types in a `sai-explore` turn to enter the post-crystallization review loop directly, skipping the plain-text global sí/no invitation."
*Avoid*: review keyword, review trigger, `/review-loop`, revisar, review command

**Supervised Pipeline**: "A single-invocation workflow that dispatches phase workers, reviews their artifacts, and converges each phase before continuing to the next."
*Avoid*: automatic pipeline, chained workflow, phase automation

**Routing Complexity**: "One of the three tokens (`low`, `medium`, `high`) on a step's `**Routing**` line that describes the coarse effort or risk of the step as judged at design time — refined freely by `sai-3-implement` without re-tagging `tasks.md`."
*Avoid*: routing tier, effort estimate, step complexity

**Routing Discipline**: "One of the five tokens (`ui-ux`, `app-code`, `service`, `data`, `config`) on a step's `**Routing**` line that describes the type of thinking or agent specialty the step requires, orthogonal to its layer and derived from `**Files Affected**` path patterns."
*Avoid*: routing kind, work type, step discipline, commit-verb (e.g. add/modify/refactor/fix)

**Routing Layer**: "One of the four tokens (`frontend`, `backend`, `infra`, `cross-cutting`) on a step's `**Routing**` line that describes the architectural location a step touches — `cross-cutting` is the escape hatch for steps that span layers in a non-trivial way."
*Avoid*: routing domain, step layer, agent domain, frontend-split (e.g. fe-ui/fe-code)

**Routing Line**: "The per-step `**Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>` keyword line on `tasks.md` (key=value tagged, not positional) that captures descriptive routing metadata at design time so a future orchestrator can dispatch each step without re-deriving routing cues from the step body or binding to a specific agent roster."
*Avoid*: routing metadata, dispatch hint, step routing, positional routing tuple

**Split-Routed Step**: "A `/sai-4-apply` Step that satisfies both parts of the two-dispatch routing condition — its body contains a `##### RED phase` block AND a **Step Contract** is available for it — and is therefore executed by a **Blind Test-Writer** followed by an **Implementation Dispatch**."
*Avoid*: testable step, two-dispatch step, split step, TDD step

**Step Contract**: "The `## Step N` section of a change's `interfaces.md` carrying that Step's signatures and exact assertions, whose availability is evaluated per Step because `design.md` omits the section for any step with no interface surface."
*Avoid*: interface contract, interfaces section, Step N block, contract file

**Target State**: "The single leading non-step section of `interfaces.md` presenting the change's finished shape as one concrete artifact, readable without any `## Step N` section."
*Avoid*: end state, final shape, goal state, summary section

**Test Command**: "The mandatory `## Implementation Context` field carrying the directly executable command that runs this project's tests plus its parameterised scoping idiom, derived by `/sai-2-design` from codebase research and injected into a **Blind Test-Writer**, which is otherwise given no way to obtain it."
*Avoid*: run command, test runner, test script, testing command, suite command

**Tracked Crystallized Set**: "The chat-scoped, in-conversation-only list of every `**Change name**` value that this `sai-explore` chat's crystallization turns emitted, held in first-emission order and never derived from repository state."
*Avoid*: crystallized changes, change list, session changes, active changes

**Verify-First Marker**: "The optional pinned `(**Verify-first**: Step N)` parenthetical on a `design.md` risk, naming the step whose design depends on that risk being resolved or disproven first."
*Avoid*: Blocker, Gate, Check First, precondition, dependency marker

**Worktree Name Triple**: "The three derived names of one git worktree under the `/sai-worktree` convention — the sibling directory suffix, the branch name, and the counter slot — each derivable from the others: the default `<main-dir>.worktree-<n>` directory maps to the `worktree-<n>` branch, a custom name maps to the branch obtained by stripping a leading `<main-dir>.` prefix (falling back to the whole name when no such prefix is present), and `n` is the first free slot."
*Avoid*: worktree naming, directory-branch pair, worktree pair, worktree slot naming

## Relationships

- An **Advisor Skill** is consulted by the phase directly below its model tier: `mid-advisor` by the `/sai-4-apply` coordinator, `senior-advisor` by `/sai-3-implement`.
- An **Advisor Skill** is the inverse of a budget-* skill (escalates upward to smarter models rather than delegating downward to cheaper ones).
- An **Architecture Snapshot** belongs to one **Target State** and is displayed before the sai-2 design feedback loop when its effective `interfaces.md` content is current or changed.
- **Coordinator Verification** may trigger one **Recovery Dispatch** when a **Known-False Report Recovery** is clear, safe, and in scope; a failed or ambiguous recovery returns to human intervention.
- A **Backfilled Change** is archived via `/sai-archive` (the same command that archives non-backfilled changes).
- A **Backfilled Change** is produced only by `/sai-backfill`; no other `sai-*` command writes `backfilled: true`.
- A **Blind Test-Writer** precedes an **Implementation Dispatch** for every **Split-Routed Step**; the two never communicate directly — only the `/sai-4-apply` coordinator relays learnings between them.
- A **GREEN Conflict** is raised by an **Implementation Dispatch** and is resolved only by a human via the coordinator, never by the subagent editing the test or interface.
- An **Attempts Per Phase** entry exists for `red` exactly where the report's RED result is non-`n/a`, and for `green` exactly where the GREEN result is non-`n/a`; a **Blind Test-Writer** therefore emits one entry, an **Implementation Dispatch** one, and a single dispatch two when its body contains a RED block and one otherwise.
- An **Attempts Per Phase** entry is retrospective and flows only into the **Execution Telemetry Appendix** — never back into a later dispatch prompt, which is the technical-learnings channel's job.
- An **Execution Telemetry Appendix** is written only by the `/sai-4-apply` coordinator, in the same per-Step loop slot as the deviations appendix, so it lands in the Step's own commit.
- A **Phase Policy** extends the **Orchestration Core** for exactly one planning phase without adding that phase's rules to the shared lifecycle contract.
- A **Known-False Report Recovery** permits at most one **Recovery Dispatch** for a single contradicted Subagent Report and never changes the fixed report field set.
- A **Test Command** belongs to one change's `## Implementation Context` and is consumed by exactly one dispatch — the **Blind Test-Writer**; a single dispatch receives the Step's own verification commands instead.
- A **Blind Test-Writer** and an **Implementation Dispatch** replace the single per-Step dispatch only for a **Split-Routed Step**; every other Step keeps one dispatch, including a Step with a RED block whose **Step Contract** is unavailable.
- A **Step Contract** that is missing for a Step routes that Step to a single dispatch (announced by a coordinator trace line); a **Step Contract** that is ambiguous — several `## Step N` matching the same `N` — is a desync and STOPs the run.
- A **Review-Loop Token** firing enters the per-change review loop over the **Tracked Crystallized Set**; when that set is empty the token yields a one-line acknowledgment instead of any iteration.
- A **Review-Loop Token** fires the post-crystallization loop, and each `Review sai-1's artifacts` / `Review sai-2's artifacts` transaction in it is an **Artifact Review**.
- An **Artifact Review** produces zero or more **Review Finding**s, each carrying a **Finding Identifier** derived from its severity within that review.
- A **Review Finding** carries exactly one **Finding Identifier**, derived from its `Severity` field; identifiers never imply identity across reviews.
- A **Report Template Parity** pin covers the four report artifacts — review, security, performance, accessibility — each pairing a schema template scaffold with an instruction output template contract of the same artifact.
- A **Tracked Crystallized Set** gains a name only when a crystallization turn emits one, ignores duplicate later emissions, and starts empty in every new chat.
- A **Routing Line** contains exactly one **Routing Layer**, one **Routing Discipline**, and one **Routing Complexity** token, in that order, each emitted as a `key=value` pair separated by middle dots.
- A **File Change Type** prefixes every `**Files Affected**` entry of a step; the paths of those entries also derive the step's **Routing Layer** and **Routing Discipline** (an `R` entry contributes its destination path), with the change-type token ignored by the derivation.
- A **Routing Layer** is derived from the step's `**Files Affected**` paths; **Routing Discipline** is derived from the same paths against a parallel pattern set, and is orthogonal to **Routing Layer** (e.g. `(frontend, ui-ux)` vs `(frontend, app-code)` discriminate agents within the same layer); **Routing Complexity** is a coarse design-time judgment.
- A **Routing Line** is descriptive, not prescriptive — a future orchestrator maps the three tokens to its own agent roster at dispatch time, and `sai-3-implement` may refine the **Routing Complexity** (or split the step) without re-tagging `tasks.md`.
- A **Target State** belongs to the same `interfaces.md` artifact as the **Step Contract**, appearing once as the leading section before every `## Step N` section.
- A **Verify-First Marker** on a risk constrains **Routing Line** step ordering in `tasks.md`, sequencing the work that resolves the risk before the step it names.
- A **Proposal Complexity** token draws on the same three-value vocabulary as a **Routing Complexity** token, so one orchestrator mapping table serves both; it is emitted once per change, whereas **Routing Complexity** is emitted once per step.
- A **Proposal Complexity** token is derived by `/sai-1-spec` after `specs/**/*.md` are written, because the requirements count is one of its five signals; `/sai-2-design` may size the work differently without re-tagging `proposal.md`.
- A **Proposal Complexity** token has no consumer: like the **Routing Line** it is descriptive metadata awaiting a future orchestrator.
- A **Question Context Contract** governs every user-facing decision prompt: worker `needs_input` questions, design notice messages, and the fixed instruction gates.
- A **Question Context Contract** is satisfied at the prompt's authoring surface — the worker or the instruction — and the coordinator forwards the question verbatim without rephrasing or adding context.
- A **Question Context Contract** prompt carries its own essential state context, which is one of the permitted grounding sources for an **Auto-Answer**.
- A **Supervised Pipeline** emits a **Phase Transition** after one phase converges and before dispatching the next phase.
- A **Phase Transition** belongs to one completed phase and precedes one downstream phase in a **Supervised Pipeline**.
- An **Auto-Answer** is given only when confidence is clearly above the **Confidence Threshold**; unclear or below-threshold confidence escalates the worker question to the user instead of auto-answering.
- Every **Auto-Answer** is recorded in the **Autonomy Audit Log**; an escalated question is not, because the user already saw and answered it.
- An **Autonomy Audit Log** is presented in conversation at supervised spec-phase end and is never written to any file, artifact, or configuration.
- A **DDR** encodes a **Domain Invariant**; an **ADR** documents a decision that does not.
- A qualifying design decision resolves to exactly one **Decision Record Family** via the ordered routing test — a **Domain Invariant** routes to **DDR**, anything else routes to **ADR** — and the resolved family is recorded in `design.md` as the `**Record family**` marker.
- A **Worktree Name Triple** belongs to one git worktree created by `/sai-worktree` and is derived from the main worktree's directory name plus the first free counter slot.

## Example dialogue

> **Dev:** I implemented this feature directly on main and forgot to run `/sai-1-spec` first. How do I document it now?
> **Domain expert:** Run `/sai-backfill my-feature` against the diff. It will write `proposal.md`, `specs/**/*.md`, and a `.openspec.yaml` with `backfilled: true`. The flag tells `/sai-archive` to skip the `design.md`/`tasks.md`/`implementation.md` check, since you never produced them.

## Flagged ambiguities

- **Change-level vs step-level complexity** — both **Proposal Complexity** and **Routing Complexity** are spelled `low|medium|high`, so a bare "complexity" is ambiguous about which artifact and which granularity is meant. **Resolution:** the shared vocabulary is deliberate (one mapping table serves both), so the tokens are not renamed; instead the qualified terms are always used — **Proposal Complexity** for the per-change token on `proposal.md`, **Routing Complexity** for the per-step token on `tasks.md`. A divergence between the two is expected and is never reported as an inconsistency.
- **"Testable Step" vs the dispatch it routes to** — `apply.md` used "testable" to mean both "has a RED block" and "gets two dispatches", which collapsed once a RED-carrying Step with no **Step Contract** was recognised. **Resolution:** "testable" describes only the RED block; **Split-Routed Step** is the term for the two-dispatch outcome, and the two are no longer synonyms.
- **"Change type" vs "OpenSpec change"** — "change" already names the OpenSpec change object, so a bare "change type" (e.g. "tipo de cambio") is ambiguous between the file-level token and the change-level object. **Resolution:** the four per-file tokens are always called **File Change Type**; "change" alone always means the OpenSpec change, and the file-level term is never shortened.
- **"Finding" across surfaces** — artifact reviews and the audit commands (`sai-5`/`sai-6`/`sai-7`/`sai-8`) both produce "findings", but with different severity vocabularies and identifier schemes: artifact reviews use `H1`/`M1`/`L1` identifiers on `High`/`Medium`/`Low`, while `review.md` uses `B`/`M`/`m`/`Q` sections (incl. `mMUT-N`) and the audit commands carry their own `Critical`-based severities. **Resolution:** **Review Finding** names the artifact-review item only; audit findings keep their own formats and are never called Review Findings.
- **"Finding" across surfaces** — artifact reviews and the audit commands (`sai-5`/`sai-6`/`sai-7`/`sai-8`) both produce "findings". Artifact reviews use `H1`/`M1`/`L1` identifiers on the closed `High`/`Medium`/`Low` set (no `Critical`), while all four audit commands share one `Critical`-based severity vocabulary — `Critical`/`High`/`Medium`/`Low`, plus the review-only `Question` category and the `sai-7`/`sai-8`-only `Informational` level — with severity-prefixed identifiers (`C`/`H`/`M`/`L`, plus `Q`/`I`) and a closing `Summary:` tally line per report; `review.md`'s mutation findings keep the separate `mMUT-N` namespace per ADR 0013. **Resolution:** **Review Finding** names the artifact-review item only; audit findings use the shared audit severity vocabulary and are never called Review Findings.
- **Schema template vs instruction output template** — both families are "the template" for the same report artifact: `openspec/schemas/sai-workflow/templates/{artifact}.md` is the CLI scaffold served by `openspec instructions`, while `sai/instructions/_templates/{artifact}-report.md` is the write-time contract fetched by the phase instruction. **Resolution:** the two are pinned to skeleton parity by **Report Template Parity** — they diverge only in placeholder syntax, guidance depth, and code-fence wrapping — and neither replaces the other.
- **"ADR/DDR" as an undecided pair vs a resolved family** — the criteria surfaces (`design.md`'s `## Decisions`, `spec.propose.md`'s ADR/DDR Proposal Check, the schema's design instruction) use "ADR/DDR" as one phrase without resolving a family, and a bare "family" is ambiguous between the record families and the report template families. **Resolution:** "ADR/DDR" names the two-family evaluation surface only; the ordered routing test resolves the family, recorded in `design.md` as `**Record family**: adr|ddr`; **Decision Record Family** names the `adr`/`ddr` families and the qualified term is always used.
- **Worktree vs worktree name triple** — bare "worktree" names the git object (a linked checkout), while the convention's naming scheme is the triple of directory suffix, branch, and counter slot. **Resolution:** "worktree" alone always means the git worktree; **Worktree Name Triple** is used when referring to the naming convention.
