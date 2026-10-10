# List writing

Shared by the `Review edge cases` and `Implementation details` list stages. This file is the single source of the load-and-warn rule for list wording.

**Load.** Before drafting the stage's `E` or `I` list, load the `writing-for-agents` skill through the harness-native skill mechanism: the `Skill` tool on Claude Code, the `skill` tool on opencode. When that skill is already loaded in this chat, reuse the loaded copy and do not load it again.

**Warn and continue.** When the skill is absent, cannot be loaded, or its load is denied, print this line once per `/sai-explore` invocation, then draft the list with the stage's existing rules. A later list stage in the same invocation prints nothing more.

```
Warning: the writing-for-agents skill is unavailable, so the list is drafted without it.
```

**Wording only.** The skill shapes how each item reads, because the list is agent input for `/sai-1-spec` and later commands. Scope, numbering, probes, agreement, and the `- None` rule stay as the stage contract defines them. The list carries only the items the change earns; the skill adds none.
