# `/sai-explore`

## Command function

Helps think through an idea before committing to an implementation. It clarifies needs, compares alternatives, uncovers risks, and turns a large or unclear idea into manageable changes. Pass a change name to explore an existing change.

## Flags and behavior modifiers

- `--fast-track`: skips the artifact-review and crystallization language gates. Also skips the overview-language question of round 3 of the route round and selects no overview unless a language was explicitly supplied. A [project setting](../project-settings.md) for the crystallization or overview language question answers it before fast-track applies. It never skips the backlog and branch questions, closing route selector, uncertainty decisions, or POC choices.
- `--overview-lang <language>`: sets the overview language for Plan - Unattended without asking. It has no effect on Direct Build - Unattended.
- Closing selector: lets the user choose between `Manual`, `Plan - Unattended`, and `Direct Build - Unattended` when the exploration is ready to continue.

## In detail

The user starts with an idea, a question, a problem with several possible explanations, or a decision that is not yet mature. The command discusses the goal, boundaries, scenarios, and alternatives until it is clear what is worth building and why.

If the idea is too large for one reviewable change, it splits it into a small, useful first result called a Walking Skeleton, followed by an ordered list of later changes. Each part is described so it can enter the workflow separately.

If it detects that the place where the feature would be added mixes too many responsibilities or does not offer a clear extension point, it may first propose a reorganization that preserves current behavior. This gives the new feature a clearer place to connect.

When the technical approach is uncertain or there are several plausible explanations for a bug, it may propose a disposable proof of concept. This experiment answers the question that separates the alternatives; it is not automatically considered part of the final product. An explicit decision is requested before running it. The POC runs on its own branch or worktree, which is abandoned afterward, so your repository returns to its prior state. Its verdict names one agreed candidate or `none`.

The edge-case and implementation-detail lists use the optional third-party
`writing-for-agents` skill for wording: Explore drafts each list, runs a silent
review pass over it (after the probes on edge-case lists, and again after every
adjustment), and only then displays it. If the skill is unavailable, Explore
warns once (`Warning: the writing-for-agents skill is unavailable, so the list
is shown without its review.`), skips the review pass, and continues with its
own rules; the skill adds no requirements or permissions.
Direct Build also consults existing `SAI_LEARNINGS.md` as repository context.

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

Plan - Unattended and Direct Build - Unattended export the exact validated block
directly from the per-chat `sai-state` store into a private temporary file. Workers
receive its path and hash, not a model-copied message body. This works the same in
Claude Code and opencode. The receiving worker verifies the file before doing any
dependent work and stops with no changes if it is missing, unreadable, or altered.
A compaction of the conversation therefore cannot
lose or change the next slice's block. If the stored block is missing, Explore
dispatches nothing and offers stop options that include emitting the block again.
To correct one slice that is pending or stopped, Explore validates the corrected
block and replaces only that slice's stored block; completed and running slices cannot
be amended. Manual has no store and no hash check. Block text is kept in the chat's
session file under the system temp directory, never in the project.
An amendment gets a fresh file/hash reference; prior files remain available while
continuation or recovery may need them. Registration and amendment attach hygiene
verdicts mechanically, including when the stored separator has no final newline.

After displaying the complete Ready to Propose block set, Explore normally asks
in three conditional rounds, each one native interaction (on opencode, one call
per question when its picker takes a single question). Round 1: whether to
create or update a backlog item through `to-backlog`, whether to create and
switch to a local branch through `new-change-branch`, and whether to assign the
concrete user named in the question to the linked issue when
implementation starts (left out when no issue is linked yet; implementation start
then asks it). Round 2: the exact publication approval and the branch
base. Round 3: the route and, for several pending slices, whether later Direct
Build slices start automatically (ignored unless you choose Direct Build). Each
answer authorizes only its own action; a missing or ambiguous answer leaves it
pending, and cancelling publication skips only the publication. Publication
runs first, then the branch is named with the created issue's identifier and
created; assignment runs only when implementation starts, which re-verifies it.
A publication `edit`, `More` for bases, an ambiguous branch name, or an
assignee conflict adds an interaction outside the rounds. Answer Yes, No, or
free text with instructions or a clarification request. No skips only that
action; ambiguous intent is clarified before anything runs. Each accepted skill
runs in the current conversation and keeps its details, validation, errors, and
cancellation handling. These questions remain explicit with `--fast-track` on
Claude Code and opencode, and branch preparation permits no code edits. The backlog
question and option descriptions retain the word `backlog` in every language
(for example, “¿Quieres crear o actualizar el backlog con esta propuesta?”).
Publication approval remains a separate answer bound to the exact proposal `to-backlog` prepared.
New branches are named `<type>/<id>_<name_with_underscores>` (or
`<type>/<name_with_underscores>` without an identifier); existing branches are
never renamed.

A single change keeps the Yes/No branch question. A slice set (more than one
recorded change) gets one three-choice question instead, in your language, which
also stays explicit with `--fast-track` (for example, “¿Quieres crear una nueva
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

After rounds 1 and 2 finish or are skipped, choose how to continue. `Manual` hands you the
Ready to Propose block for `/sai-1-spec`. `Plan - Unattended` runs spec and design
with up to three in-session review rounds per phase, then stops for your review before `/sai-build`.
Ambiguous questions still escalate. `Direct Build - Unattended` authorizes
implementation, review/fix, retroactive specs, archive, and one local commit;
it never pushes. For slices, the selector repeats per slice. Fast-track does
not skip these authorizations or the reconfirmation of unresolved decisions.

An interrupted Direct Build can resume in the same conversation. It retains
its agents, accepted work, verification references, recovery counters, and the
original authorization for one local commit. Resumption continues the first
pending step; it does not start implementation again or offer Plan as a
replacement. Available agents are continued before any permitted replacement.
Invalid responses are corrected by their author and validated unchanged before
work is accepted. Recovery uses only the remaining attempts. When intervention
is needed, the choices address the actual blocker or leave execution stopped.
An uncertain commit is checked before continuing: a confirmed commit consumes
the original authorization once; an unknown result remains stopped. Nothing is
pushed. Claude Code and opencode use the same rules through their native agent
continuation mechanisms. Resumption in a new conversation is not supported.
