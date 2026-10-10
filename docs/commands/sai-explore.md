# `/sai-explore`

## Command function

Helps think through an idea before committing to an implementation. It clarifies needs, compares alternatives, uncovers risks, and turns a large or unclear idea into manageable changes.

## Flags and behavior modifiers

- `--fast-track`: skips the artifact-review and crystallization language gates. On Plan - Unattended, also skips the overview-language question and selects no overview unless a language was explicitly supplied. It never skips the closing route selector, uncertainty decisions, or POC choices.
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

When the conversation closes, choose how to continue. `Manual` hands you the
Ready to Propose block for `/sai-1-spec`. `Plan - Unattended` runs spec and design
with adversarial feedback, then stops for your review before `/sai-build`.
Ambiguous questions still escalate. `Direct Build - Unattended` authorizes
implementation, review/fix, retroactive specs, archive, and one local commit;
it never pushes. For slices, the selector repeats per slice. Fast-track does
not skip these authorizations or the reconfirmation of unresolved decisions.
