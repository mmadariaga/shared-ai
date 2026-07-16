# Does a wrapper make sense?

> Working notes for the "why wrap OpenSpec instead of just adopting it?" discussion.
> The same reasoning answers the follow-up: "why not put all this in a project `AGENTS.md`?"

## The question

> OpenSpec already lets you fully define and customize workflows — steps, output
> templates, and more. Wouldn't it be better to adopt the framework, learn it well,
> and make the most of it? And whatever's left, couldn't it live in a project `AGENTS.md`?

## The short answer

It's not "wrapper **instead of** OpenSpec". It's "adopt OpenSpec **and** wrap it".
Shared-AI already adopts the framework fully — it uses OpenSpec's custom schema
(`sai-workflow`), its templates, its lifecycle, and the `opsx:*` skills as internal
building blocks. The `SKILL.md` files are never modified; the CLI regenerates them on update.

The wrapper only covers what OpenSpec — **by design** — does not own.

## The core distinction: shape vs. behavior

A **template** describes the **shape of an output artifact**: what sections `proposal.md`
has, what fields `design.md` carries, the order of `tasks.md`. It is a mold for a document.

Most of what makes Shared-AI valuable is not the shape of a document — it is **how the
agent behaves and what runs where**: which model runs each phase, how work is delegated to
subagents, what guardrails gate an action, how two agents coordinate. That is **execution**,
not **structure** — and a template system structurally cannot represent it.

OpenSpec is **agnostic to harness and model, by design**. A template doesn't know what a
subagent is, which model runs, what a tool-call is, or how each harness asks a question.
Those are exactly the three dimensions the wrapper exists for: **cost, agent behavior, and
process guardrails**.

## Classification — how well each piece fits OpenSpec

### 🔴 Doesn't fit at all (execution / orchestration / routing)

Nothing here has a home in a template, because none of it describes a *document* — it
describes *how the agent behaves*.

| Piece | Why it can't be a template |
|---|---|
| Model selection by task complexity | Model routing — OpenSpec is model-agnostic by design. |
| Portability across 3 harnesses (Claude / opencode / Copilot) | A template can't know `AskUserQuestion` vs `question` tool vs plain text. |
| Cheap exploration subagents | Subagent orchestration + output contracts. No field for "delegate to a cheap isolated model". |
| Executor subagent (tests/builds on a cheap model) | Execution choreography. |
| Budget subagent (general delegation) | Same. |
| Isolation Mode (zero inherited context per phase) | Property of *how the prompt starts*, invisible in the artifact. |
| RED → GREEN with two subagents (one writes the test, another writes the code without permission to touch the test) | Choreography between two actors. A template can't say "two different agents do this". |
| No-self-review bias (review on a model ≠ plan) | Model routing again. |
| Mutation analysis | Runs a tool (Stryker/PIT/…) or uses the LLM as mutator — action, not shape. |
| Safe-operations guardrails (confirm before `rm -rf`, `push --force`…) | Cross-cutting execution rule spanning phases. |
| Fast-track mode (`--fast-track`) | Approval-gate control — behavior, not document. |
| Communication compression / think-in-English | Agent behavior. |
| Review triage → recommend audits | Routing logic based on the touched surface. |
| Prereqs + change picker | Resolution logic, not an artifact. |

### 🟡 Fits halfway (the *artifact* is templatable, the surrounding *behavior* isn't)

| Piece | Part that fits | Part that doesn't |
|---|---|---|
| explore: slices, walking skeleton, slice-0 refactor | The output ("slice backlog") could be a template. | The *heuristic* for when to split, when to prepend a behavior-preserving refactor because the target code is too tangled — that's reasoning, not a field. |
| Review criteria (YAGNI, clean code, SOLID, architecture) | The criteria could be a checklist in a template. | OpenSpec has **no review phase** to hang it on; the 11 passes are process. |
| GLOSSARY.md (ubiquitous language) | The file is an artifact. | The cross-phase behavior (spec appends inline, plan uses canonical terms, review validates) is orchestration. |
| interfaces.md (per-step test assertions) | The document is a template. | A blind subagent consuming it to write the RED test is choreography. |
| implementation.md (granular playbook) | Templatable artifact. | Designed so a *cheap model copies it mechanically* — that intent is routing. |
| Deferred verification (human checks at the earliest observable point) | The artifact carries checkboxes. | "Each check appears once, labeled with its origin step, at the earliest point" is logic. |
| ADR/DDR proposal (3 criteria) | The ADR is a doc. | The decision criterion (hard-to-reverse + surprising + real trade-off) is a heuristic. |

### 🟢 Fits — and we already use it this way

| Piece | How |
|---|---|
| Change lifecycle (proposal → specs → design → tasks → archive) | OpenSpec's, as-is. |
| Artifact structure | `sai-workflow` schema + its templates. |
| propose / apply / archive phases | `opsx:*` skills as building blocks. |

**The pattern:** nearly everything valuable lands in 🔴 or the right column of 🟡, and they
share one root — **cost, agent behavior, and process guardrails**, the three things a
template cannot express because they describe *execution*, not *structure*. What *does* fit
(🟢) is exactly what we adopted from OpenSpec without reinventing.

## "Then put it in a project `AGENTS.md`"

Same boundary, seen from another angle. An `AGENTS.md` is **passive prose**, **always-on**,
read by **a single already-chosen model**, and **per-project**. That ceiling rules most of
this out.

| Piece | Fits AGENTS.md? | Why |
|---|---|---|
| Model by complexity | ❌ | The file is read by a model *already chosen* before reading it. Prose can't switch the running model. |
| Think in English | ✅ | Pure prose convention. |
| Delegate to cheap subagent | 🟡 | The *policy* fits; the *mechanism* (tier, contract) is harness plumbing → a skill. |
| explore slicing heuristics | 🟡 | Fits as prose, but it's phase-specific and AGENTS.md is global → pollutes every other phase. |
| Portability across harnesses | ❌ | AGENTS.md *is itself* harness-specific. Portability is a layer *above* any context file. |
| Two-agent RED/GREEN | ❌ | Choreography. Passive context for one agent can't make "a different agent implements". |
| No-self-review (model part) | ❌ | Routing — can't make review run on a different model from prose both read under one model. |
| Review triage criteria | 🟡 | The surface→audit mapping is prose; the *action* is done by the phase. |
| Ubiquitous language | 🟡 | "Use canonical GLOSSARY terms" fits; the cross-phase enforcement is per-phase action. |

**What fits AGENTS.md is prose conventions and criteria** (think-in-English, glossary,
quality criteria, triage mapping). **What doesn't is anything about model routing, subagent
orchestration, or portability** — mechanism, not passive context.

Two deeper, project-specific reasons it's the wrong home:

1. **AGENTS.md is the opposite of Isolation Mode.** The whole pipeline starts each phase
   with zero inherited context — it reads only its `<TASK>` and its artifacts. An AGENTS.md
   is context *inherited by everything*. Putting behavior there fights the central principle
   of the pipeline: it would leak into every phase, relevant or not, unscopable — exactly the
   context pollution Isolation Mode exists to kill.
2. **AGENTS.md is per-project; the wrappers are user-global.** This machinery runs in *any*
   repo from a single global copy. Moving behavior into a project AGENTS.md means re-copying
   it into every project and losing global reuse.

So `AGENTS.md` hits the **same** limits as OpenSpec templates — it's *passive shape /
convention*, not *execution* — **plus** it contradicts Isolation Mode and breaks the global
model. It's the same "shape vs. behavior" boundary from another direction.

## Bottom line

- OpenSpec is the **framework skeleton** (schema, lifecycle, artifact shapes). We adopt it fully.
- The wrapper is the **application layer**: model routing, multi-harness portability, subagent
  orchestration, and process guardrails — the three things a template *and* an `AGENTS.md`
  structurally cannot express.
- Nobody says "why write controllers if the framework already defines routes?" The framework
  gives you the right skeleton *so that* you can put your case-specific execution on top. Same here.
