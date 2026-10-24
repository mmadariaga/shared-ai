# Merge step: test correction

Fetch @sai/commands/merge/steps/common.md and read it once.

Goal: find why a new failure appeared after the integration and propose the smallest correction that preserves what the strategy decided. The brief names the failure record (the file holding the full test output), the failing tests that are new, the paths the integration changed, and whether the tree is still staged or already committed.

Read the failure record at its path, not a summary of it. A failure is yours to correct when the integrated code or a test that depends on it is wrong because of how the two sides combine; it is not yours when the test fails for a reason the integration did not touch.

Before authoring a proposed code correction,
Fetch @sai/policies/code-quality-priority-stack.md
Apply it within the approved strategy and behavior-preservation requirements; those restrictions prevail. This load grants no write: the coordinator must authorize and capture the correction ranges before application in `apply`.

Write the report as a YAML file:

```yaml
status: done | blocked
summary: string
changed_files: []
analysis: string
corrections: {path: string, category: specs|adr-ddr|code, before_hash: string, regions: {start: n, end: n, conflict_id: string}[]}[]
```

- `analysis`: the cause of each new failure and why each correction fixes it.
- `corrections`: the edit as byte ranges the coordinator can protect before you write. `before_hash` is the sha256 of the file's current bytes, `start` and `end` are ordered, disjoint byte offsets in that file, and each `conflict_id` starts with `<category>:<path>#`. The coordinator captures these ranges with `merge.js correction` and sends you the correction snapshot; you then apply the text through `merge.js write` as the `apply` step says, and write nothing before that.
- `blocked`: the failure is not caused by the integration or no correction within the changed files fixes it; say which, with the evidence.

When a correction would change what the strategy decided, report that instead of correcting: the coordinator returns to the strategy.
