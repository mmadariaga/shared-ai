# `/sai-explore`

## Command function

Helps think through an idea before committing to an implementation. It clarifies needs, compares alternatives, uncovers risks, and turns a large or unclear idea into manageable changes. Pass a change name to explore an existing change.

## Flags and behavior modifiers

- `--overview-lang <language>`: sets the overview language for Plan - Unattended without asking. It has no effect on Direct Build - Unattended.
- Closing selector: lets the user choose between `Manual`, `Plan - Unattended`, and `Direct Build - Unattended` when the exploration is ready to continue.

## In detail

The user starts with an idea, a question, a problem with several possible explanations, or a decision that is not yet mature. The command discusses the goal, boundaries, scenarios, and alternatives until it is clear what is worth building and why.

If the idea is too large for one reviewable change, it splits it into a small, useful first result called a Walking Skeleton, followed by an ordered list of later changes. Each part is described so it can enter the workflow separately.

When a change or slice has no spec-level behavior, such as a pure refactor, tooling, or documentation change, Explore asks at crystallization whether the block declares `**Specs**: none — <reason>`, once per such slice. It proposes the reason, and you can edit it. The question states the consequence: no spec files and no delta sync at archive. You can also ask for the line on a change Explore did not flag; it confirms the consequence first. A change with spec-level behavior gets no such question. The line's labels, the literal `none` with its dash, `**Depends on**` values, and `**Backlog origin**` URL stay in English whatever the crystallization language is; only the reason is translated.

If it detects that the place where the feature would be added mixes too many responsibilities or does not offer a clear extension point, it may first propose a reorganization that preserves current behavior. This gives the new feature a clearer place to connect.

When the technical approach is uncertain or there are several plausible explanations for a bug, it may propose a disposable proof of concept. This experiment answers the question that separates the alternatives; it is not automatically considered part of the final product. An explicit decision is requested before running it. The POC runs in a dedicated sibling worktree on its own branch, created from your committed `HEAD`, so your checkout and its uncommitted changes are never touched. Whenever the POC lane ends, it asks whether to destroy the POC: on confirmation it removes both the worktree and the branch, and otherwise it keeps them and tells you where they are. Its verdict names one agreed candidate or `none`.

When the conversation starts from an issue, you answer once whether to work on it. If you do, Explore reads each section of the issue (the problem and goal, the edge cases, the implementation notes) and treats a section as agreed only when the issue states it explicitly, including an explicit `None`. Sections the issue leaves absent, blank, or covered by an open question stay open, and the issue's content is their starting proposal. Explore then discusses only the open sections and any deviation it finds in an agreed one, and skips the stages whose data is already agreed. Open sections and their revisions are shown in your conversation language, while the block's language keeps its current rules. An issue given only as context seeds nothing.

The stage order is a default path, not a gate. You can ask to go back to an earlier stage at any time, and going back keeps what you already agreed; changing the problem or goal reopens the later sections with their content as a starting proposal. Moving forward needs the data of the stages it skips and stops at the route selector, which stays the only authorization of a route. When a move is not possible, Explore names what is missing and continues at the first stage that owns it. After crystallization, a slice that is stopped, running, or parked can be corrected and moved back to pending or to its first step in the same conversation, without resetting the exploration: completed slices and the publication answer stay. A correction that changes only the backlog or exploration origin keeps the route you chose; any other change returns the slice to pending and shows the route selector again. Every accepted move is listed with its reason in the closing report.

The edge-case and implementation-detail lists use the optional third-party
`writing-for-agents` skill for wording: Explore drafts each list, runs a silent
review pass over it (after the probes on edge-case lists, and again after every
adjustment), and only then displays it. If the skill is unavailable, Explore
warns once (`Warning: the writing-for-agents skill is unavailable, so the list
is shown without its review.`), skips the review pass, and continues with its
own rules; the skill adds no requirements or permissions.
Direct Build also consults existing `SAI_LEARNINGS.md` as repository context.
Direct Build also creates the ADR or DDR records of the block's qualifying decisions, written by the implementer on the coordinator's order, inside the archived-change commit.

In Claude Code and opencode, each E/I list question explains that a bare
`next-step` confirms the displayed list and advances. Confirmation applies only
to the latest complete list shown with that notice. If a side discussion changes
an item's meaning, or the notice was missing, Explore redisplays the complete
list and asks again before accepting confirmation. A revision paired with
`next-step` also waits for a new confirmation; discussion that changes no meaning
does not. An empty E list can still be recorded automatically, while an I list
containing `- None` requires your confirmation.

Explore records a Ready to Propose block set only when every block is dispatchable,
so any route you choose receives a block it can run. A dispatchable block follows the
block format, carries a confirmed `- None` or at least one in-scope implementation
detail (the implementation details stage proposes `- None` when no technical decision
qualifies and advances only on your confirmation; every slice of a sliced set, a
refactor-first slice 0 included, owns an item, and no item is repeated within a block
or left without a slice), and requests none of the following as work: creating planning
artifacts, running mutating git commands, dispatching subagents, or editing
published specs directly. Lines that merely mention these are judged as context.
A confirmed violation records nothing; Explore shows the clause, line, and evidence,
and corrects the block.

Plan - Unattended and Direct Build - Unattended retain the validated proposal
outside the conversation context, so compaction does not change the next slice's
input. If that proposal becomes unavailable or fails verification, execution
stops before changes and offers recovery options, including emitting it again.
Ask Explore to revise a pending or stopped slice; a running or completed slice
cannot be amended. Manual gives you the block to paste into a new chat.
For the technical storage and verification rules, see
[stored block transport](../../sai/policies/ready-to-propose-format.md#stored-block-transport).

After displaying the complete Ready to Propose block set, Explore normally asks
in three conditional rounds, each one native interaction (on opencode, one call
per question when its picker takes a single question). Round 1: whether to
create or update a backlog item through `to-backlog` and whether to continue to
implementation (three options, below), whether to create and
switch to a local branch through `new-change-branch`, and whether to assign the
linked issue when implementation starts. An existing issue's question names the
concrete user; when no issue exists yet but backlog creation is selected, it asks
the intent to assign the authenticated user once the issue exists. Without a
linked issue or planned creation, the assignment question is left out. The branch
and assignment questions are conditional: they take effect only when the backlog
answer continues to implementation.
Round 2: the exact publication approval and the branch base. Round 3: the route;
for several pending slices, whether later Direct Build slices start automatically
(ignored unless you choose Direct Build); and, when unresolved, whether to create
`change-overview.md` and in which language (applies only to Plan). An explicit
overview language, a previously resolved answer, or a project setting answers
the overview question in advance. Round 3 also asks once per crystallized set
whether the slices publish a request when their route ends, unless the
[`pr.publishAfterRun`](../project-settings.md#plan-publication-answer) setting
answers it. A Plan slice hands the answer to `/sai-plan`, which publishes a draft
request; a Direct Build slice pushes its branch without force and publishes a
request ready for review after its telemetry commit; a Manual slice ignores it.
The answer is kept for the whole set, so later slices ask nothing, and a failed
publication never stops a slice. Standalone `/sai-direct-build` publishes nothing. Each
answer authorizes only its own action; a missing or ambiguous answer leaves it
pending, and cancelling publication skips only the publication. Publication
runs first, then the branch is named with the created issue's identifier and
created; assignment runs only when implementation starts, which re-verifies it.
A publication `edit`, `More` for bases, an ambiguous branch name, or an
assignee conflict adds an interaction outside the rounds. Answer Yes, No, or
free text with instructions or a clarification request. No skips only that
action; ambiguous intent is clarified before anything runs. A free-text answer to
the backlog question maps by intent: a bare "yes" means `publish-continue`, a
request to only report or only publish means `publish-stop`, and a plain
decline means `skip-continue`. Each accepted skill
runs in the current conversation and keeps its details, validation, errors, and
cancellation handling. These questions are asked on Claude Code and opencode whenever they apply, and
branch preparation permits no code edits. The backlog
question and option descriptions retain the word `backlog` in every language
(for example, “¿Quieres crear o actualizar el backlog con esta propuesta?”).
Publication approval remains a separate answer bound to the exact proposal `to-backlog` prepared.

The backlog question offers three options, in this order, with the same labels and
stable values on both harnesses:

- `Publish and continue with implementation` (`publish-continue`): publishes as the
  former Yes did, then the flow continues unchanged with the branch, assignment,
  and route questions.
- `Publish and stop` (`publish-stop`): publishes and ends the invocation, with no
  route question. Its branch and assignment answers are not applicable: no branch
  is created, nothing is assigned, and round 2 asks only the publication approval.
  When `to-backlog` finishes, Explore prints the published issue link (the issue
  for a single change, or the parent and every child for a sliced set). If you cancel
  the approval, it says that nothing was published. If publication fails, it follows
  the `to-backlog` recovery and reports what that skill reported, which for a sliced
  set may be a partial publication. A later message in the same chat does not
  present the route picker; implementing the change needs a new `/sai-explore`
  invocation, for example one that imports the published issue.
- `Do not publish and continue with implementation` (`skip-continue`): skips the
  backlog action and continues as the former No did.

In Spanish the labels read `Publicar y continuar con la implementación`,
`Publicar y parar`, and `No publicar y continuar con la implementación`.
New branches are named `<type>/<id>_<name_with_underscores>` (or
`<type>/<name_with_underscores>` without an identifier); existing branches are
never renamed.

A single change keeps the Yes/No branch question. A slice set (more than one
recorded change) gets one three-choice question instead, in your language, which
is always asked (for example, “¿Quieres crear una nueva
rama?”):

- `Sí, crea una única para la issue principal` (`shared`): one branch, created
  before the route picker and reused by every slice.
- `Crear una rama por slice` (`per-slice`): each slice gets its own branch. The
  first starts from the base you select. Each later branch starts from the
  previous slice's branch, in dependency order, so independent slices inherit the
  preceding branch's changes too. A later branch is created immediately before
  its slice starts, including Direct Build automatic continuation, and only after
  the previous slice is completed: archive completed in Direct Build, or
  `next-slice` at `implement` in Plan or Manual. `next-slice` confirms that the
  slice is implemented and committed. Uncommitted changes stop the creation until
  you commit them. Choosing `per-slice` authorizes every local creation and switch
  in the chain; nothing is pushed.
- `No crear nada` (`none`): every branch, including the current one, stays as it is.

If a slice's expected branch already exists, the slice resumes on it when this
conversation prepared it; otherwise you choose between reusing it and giving a
corrected name. The strategy and slice-to-branch correspondence live in the
conversation only.
Branch-base suggestions use the same short names and local/remote qualifiers as
standalone [`new-change-branch`](new-change-branch.md), while preserving exact
Git references internally.

After rounds 1 and 2 finish or are skipped (and unless you chose `Publish and stop`), choose how to continue. `Manual` hands you the
Ready to Propose block for `/sai-1-spec`. `Plan - Unattended` follows [`/sai-plan`](sai-plan.md)
for the first pending slice: spec and design run with up to three review rounds per
segment, one local commit per segment (plus one for `telemetry.md` when
[change telemetry](../project-settings.md#change-telemetry) is on), then it stops for your review before `/sai-build`.
A worker question that nothing in the block, the artifacts, or the repository settles
still escalates. `Direct Build - Unattended` authorizes
implementation, review/fix, retroactive specs, archive, and two local commits
(the archived change and its change telemetry); it never pushes. For slices, the selector repeats per slice.

When a `Plan - Unattended` slice closes, or a sliced `Manual` hand-off is printed,
and at least one other slice is still pending, you go to another chat and come back
here with `next-slice`. By then this chat's prompt cache has usually expired, so the
next slice would resume cold. `/sai-explore` keeps its own cache warm until you
return with `next-slice` or a fixed deadline passes:

- With a [`warming` setting](../project-settings.md#cache-warming) for the `agent`
  role of the active harness, it applies that interval and uses `max` as the duration, and asks nothing.
  A setting that is off (`false` or `"enabled": false`) means no warming and no question.
- Otherwise it prints a cache-lifetime notice (Claude Code: 1 hour with a Claude
  subscription, 5 minutes with pay-per-token; opencode: it depends on the provider,
  and [`/sai-context-cache-ttl-benchmark`](sai-context-cache-ttl-benchmark.md)
  measures it) and asks one picker with two questions. The interval offers
  `30 min (Recommended)`, `4 min`, and `No`; the duration offers `4h (Recommended)`,
  `2h`, and `1h`; both accept free text as a positive number with an optional unit
  (`s`, `min`, or `h`; no unit means minutes), such as `20` or `20 min`, and
  `1h30` is not accepted. `No`, or a dismissed picker, means no
  warming; an unanswered duration is `4h`. An invalid free text is asked once more
  and then ignored with a one-line note. Each wake costs two short requests, and an
  interval longer than the cache lifetime saves nothing.
- Your first answer applies to every later hand-off in the same invocation. It lives
  in the conversation only: nothing is written to a settings file or the repository.
- The wait is armed once, at the end of the hand-off. The duration is counted from
  that moment and your other messages do not extend it. `next-slice`, or a new
  `/sai-explore` in the same chat, stops it; at the deadline it ends by itself.
- The last slice, a change without slices, and a stopped, blocked, or failed Plan
  neither ask nor warm. Direct Build runs in this chat and is not affected. If the
  wait cannot be armed, one line says so and the hand-off continues unchanged.

Before writing retroactive specs, Direct Build applies the same
[complete-draft OpenSpec validation as standalone backfill](sai-backfill.md#in-detail),
in a private temporary project against current specifications. Changed inputs
require validation again; a rejected or incomplete check authorizes no draft
writes. Independent archive checks still run.

An interrupted Direct Build can resume in the same conversation. It retains
its agents, accepted work, verification references, recovery counters, and the
original authorization for two local commits. Resumption continues the first
pending step; it does not start implementation again or offer Plan as a
replacement. Available agents are continued before any permitted replacement.
Invalid responses are corrected by their author and validated unchanged before
work is accepted. Recovery uses only the remaining attempts. When intervention
is needed, the choices address the actual blocker or leave execution stopped.
An uncertain commit is checked before continuing: a confirmed commit consumes
the original authorization once; an unknown result remains stopped. Nothing is
pushed. Claude Code and opencode use the same rules through their native agent
continuation mechanisms. Resumption in a new conversation is not supported.

Full Direct Build workers deliver reports through private files and return
only a path and hash. One validator operation checks the hash and validates
the same bytes, without coordinator copying. Failed delivery, invalid content,
and a call with no response remain distinct. Recovery uses the existing attempt
limits without asking for instructions on recoverable errors. Confirmed archive
moves and commits are not repeated to recover a report. Unresolved verification
retains the reports and evidence and closes with what completed and what remains
unchecked. The initial readiness exchange, POC, and standalone backfill and
archive behavior are unchanged in Claude Code and opencode.
