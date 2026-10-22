# List writing

Shared by the `Review edge cases` and `Implementation details` list stages. This file is the single source of the list-writing sequence: load or reuse the skill, draft, review pass, display.

**Load.** Before drafting the stage's `E` or `I` list, load the `writing-for-agents` skill through the harness-native skill mechanism: the `Skill` tool on Claude Code, the `skill` tool on opencode. When that skill is already loaded in this chat, reuse the loaded copy and do not load it again.

**Sequence.** Draft the list with the skill, finish the stage's own pre-display work, run the review pass, then display. The stage owns its pre-display work: on edge-case lists, the lightweight probes and their private corrections finish first, so the review pass covers exactly the displayed version.

**Review pass.** The review pass is a second pass of the skill over the complete list. It runs inline in this Explore session with the skill already loaded, applies the skill's criteria to every item, and corrects the wording of any item that falls short. It is silent: the user sees only the reviewed list, as clean final text, with no change marks and no review notes.

**Revised lists.** After every user adjustment, run the review pass again over the complete updated list before it is displayed, reusing the loaded skill.

**Empty list.** An empty list is displayed directly as `- None` and skips the review pass.

**Display and question.** Display the complete current list with its current `E`/`I` identifiers, then ask one plain conversational question under `@sai/policies/question-context.md`, in the ambient conversation language and never as a native yes/no picker. Name the list and current change, ask whether it captures the relevant edge cases or technical decisions, and explain that agreement preserves the intended scope boundaries in the handoff. Offer confirmation as written or additions, removals, or changes. State explicitly that a bare `next-step` confirms this displayed list as written and advances to the next stage in the same turn; no fixed agreement phrase is required. Keep the edge-case stage's one-message list → probes → question order. The automatically recorded empty E list keeps its stage-owned exception; an I list containing `- None` receives the complete question.

For a revised list, use this same review, display, and question sequence and wait for another confirmation. Answer evaluation and presentation currency are owned by **List stages** in `steps/common.md`.

**Warn and continue.** When the skill is absent, cannot be loaded, or its load is denied, print this line once per `/sai-explore` invocation, skip the review pass, and display the list under the stage's existing rules. A later list stage or revision in the same invocation prints nothing more.

```
Warning: the writing-for-agents skill is unavailable, so the list is shown without its review.
```

**Wording only.** The skill shapes how each item reads, because the list is agent input for `/sai-1-spec` and later commands. The draft and the review pass change phrasing alone: the item set, each item's meaning, and the `E`/`I` numbering stay as drafted, and neither pass adds a technical decision or behavior. Scope, numbering, probes, agreement, and the `- None` rule stay as the stage contract defines them. The list carries only the items the change earns; the skill adds none.
