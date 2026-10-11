# `/sai-explore`

## Command function

Helps think through an idea before committing to an implementation. It clarifies needs, compares alternatives, uncovers risks, and turns a large or unclear idea into manageable changes.

## Flags and behavior modifiers

- `--fast-track`: skips the artifact-review and crystallization language gates. On Plan - Unattended, also skips the overview-language question and selects no overview unless a language was explicitly supplied. It never skips the backlog and branch questions, closing route selector, uncertainty decisions, or POC choices.
- `--overview-lang <language>`: sets the overview language for Plan - Unattended without asking. It has no effect on Direct Build - Unattended.
- Closing selector: lets the user choose between `Manual`, `Plan - Unattended`, and `Direct Build - Unattended` when the exploration is ready to continue.

## In detail

The user starts with an idea, a question, a problem with several possible explanations, or a decision that is not yet mature. The command discusses the goal, boundaries, scenarios, and alternatives until it is clear what is worth building and why.

If the idea is too large for one reviewable change, it splits it into a small, useful first result called a Walking Skeleton, followed by an ordered list of later changes. Each part is described so it can enter the workflow separately.

If it detects that the place where the feature would be added mixes too many responsibilities or does not offer a clear extension point, it may first propose a reorganization that preserves current behavior. This gives the new feature a clearer place to connect.

When the technical approach is uncertain or there are several plausible explanations for a bug, it may propose a disposable proof of concept. This experiment answers the question that separates the alternatives; it is not automatically considered part of the final product. An explicit decision is requested before running it.

The edge-case and implementation-detail lists use the optional third-party
`writing-for-agents` skill for wording. If unavailable, Explore warns once and
continues with its own rules; the skill adds no requirements or permissions.
Direct Build also consults existing `SAI_LEARNINGS.md` as repository context.

After displaying the complete Ready to Propose block set, Explore asks first
whether to create or update a backlog item through `to-backlog`, then whether
to create and switch to a local branch through `new-change-branch`. Answer Yes,
No, or free text with instructions or a clarification request. No skips only
that action; ambiguous intent is clarified before anything runs. Each accepted
skill runs in the current conversation and owns its details, confirmations,
errors, and cancellation handling. Explore waits for it to finish before the
next question. These questions remain explicit with `--fast-track` on Claude
Code and opencode, and branch preparation permits no code edits.

After both actions finish or are skipped, choose how to continue. `Manual` hands you the
Ready to Propose block for `/sai-1-spec`. `Plan - Unattended` runs spec and design
with adversarial feedback, then stops for your review before `/sai-build`.
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
