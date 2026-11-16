# Merge step: final-tree correction

Fetch `@sai/commands/merge/steps/common.md` and read it once.

Goal: propose the smallest correction for each defect the coordinator found in the integrated tree, so the tree states what both sides meant once. The brief names the findings: for each, the path, the lines, what is wrong, and, for an introduced duplicate block, the occurrences with their `line`, byte `start` and `end`, and the `before_hash` that `merge.js duplicates` returned. The integration is already staged or committed; the defect sits outside every conflict region, often in a commit that replayed without conflicts.

Read each finding's file at its path and the commits of both sides that touched it (`git log`, `git show`, read-only). Decide by commit intent which text stays: the version that carries the newer intent, or the one the finding names. Keep what only one occurrence says. Never remove a block that the finding does not name, and never rewrite what both sides agree on.

Save the report as a YAML file:

```yaml
status: completed | failed
summary: string
changed_files: []
analysis: string
corrections: {path: string, category: specs|adr-ddr|code, before_hash: string, regions: {start: n, end: n, conflict_id: string}[]}[]
```

- `analysis`: for each finding, which text stays, which goes, and the commit intent that decides it.
- `corrections`: the edit as byte ranges the coordinator can protect before you write, one entry per file. `before_hash` is the sha256 of the file's current bytes, `start` and `end` are ordered, disjoint byte offsets, and each `conflict_id` starts with `<category>:<path>#`. Use the ranges the brief gives for a duplicate block, widened to take one neighboring blank line when removing the block would leave two. You write nothing here: the coordinator captures the ranges with `merge.js correction` and sends the `apply` step with the snapshot, and you then write the corrected text of each range through `merge.js write` (empty text removes the range).
- `failed`: no correction within the touched files fixes a finding, or a finding is not a defect; say which, with the evidence.

When a correction would change what a conflict strategy decided, report that instead of correcting: the coordinator decides.
