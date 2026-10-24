# Merge step: strategy

Fetch @sai/commands/merge/steps/common.md and read it once.

Goal: decide how every conflict of this stop resolves, by commit intent, before anything is written.

Read the bundle of the snapshot in the brief. For every affected file and region, reconstruct what each side meant to achieve, classify the region as obvious or semantic, and choose the outcome that serves the intent of both sides:

- keep the current branch's version, adopt the selected branch's version, or combine them. A combined outcome keeps one owner for each responsibility, one authoritative source for each fact, and no duplicated gate or conflicting contract. It is scoped to the conflict region and never built by concatenating fragments.
- A file that admits only a whole-side choice takes the side its commit intent favors.
- When a declared rule governs a region, it decides. When it rejects both sides, the outcome is new text that satisfies it. A conflicted file that is itself a governing rule is resolved first, and the regions that depend on it follow it.

When commit intent cannot decide between two sides (they change the same behavior incompatibly and no rule or evidence prefers one), do not pick. Report the conflict as an escalation with what each side does, what each choice gives up, and what you would recommend.

Write the report as a YAML file:

```yaml
status: done | escalate | blocked
summary: string
changed_files: []
strategy: string
decisions: {conflict_id: string, decision: ours|theirs|synthesis}[]
escalations: {conflict_id: string, sides: string, recommendation: string}[]
```

- `strategy`: Markdown covering every affected file in order. Per file: its category, the outcome per region with the rule or pattern that settles an obvious one, and for a semantic one the objectives of both sides, the facts and inferences, what the outcome keeps and gives up, and the risks.
- `decisions`: one entry per semantic region, and one per whole-side file. `ours` and `theirs` are git stages (see Sides).
- `status`: `escalate` when any escalation exists, `blocked` when the bundle or snapshot cannot be read, `done` otherwise. You write nothing to the repository in this step, so `changed_files` is empty.

When a later message gives new evidence, a review finding, or a corrected snapshot, rebuild the strategy from what you already retained and the new input, and report again.
