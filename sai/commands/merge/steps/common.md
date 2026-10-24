# Merge worker — common reading

Every merge step reads these definitions once. The brief names the files they apply to.

## Sides

Git's stage numbers name different branches depending on the method. Use this mapping wherever a side is read, compared, labelled, or materialized:

| method | stage `:2:` / `--ours` / `git-ours` | stage `:3:` / `--theirs` / `git-theirs` |
| --- | --- | --- |
| `merge` | current branch (`target_sha`) | selected branch (`source_sha`) |
| `rebase`, `rebase-squash` | selected branch (`source_sha`), the new base | current branch's replayed commit (`target_sha`) |

Stage `:1:` is the common ancestor (`merge_base`). The decision values `ours` and `theirs` and the sources `git-ours` and `git-theirs` always mean the git stage, so the checkout the coordinator runs gives exactly what you chose. Describe a choice by branch and behavior, never by stage token.

## Provenance

The brief names the provenance file the coordinator captured before the launch. Read it; never recompute its values from the current `HEAD`. It holds `target_sha`, `source_ref`, `source_sha`, `merge_base`, `method`, `squash`, the source-introduced ADR/DDR records, the governing rules of each side (`target_rules`, `source_rules`), and the upstream facts.

## Commit intent

Commit intent is what each side meant to achieve, judged from its commits: messages, changed files, tests, and the specs, ADRs, and DDRs it touched. It is the only criterion for resolving a conflict. Keep three kinds of evidence apart in every analysis:

- **Declared rules**: requirements of governing specs, ADRs, or DDRs. They are normative and outrank inferred objectives.
- **Facts**: visible changes, interfaces, ownership, tests, comments.
- **Inferences**: the likely objective behind the facts, used only where no declared rule exists, and labelled as inferences.

A region is **obvious** when a declared rule or a simple textual pattern settles it (non-overlapping edits, a pure addition beside an unchanged region, complementary spec additions). It is **semantic** when the sides pursue different objectives, or different strategies for one objective, or when a contract-level consequence is left to judgment.

## Conflict bundle

One call returns every affected file prepared:

```text
node <merge-tool> bundle --record <snapshot> --record-hash <sha256> --json --cwd <project-root>
```

Each file carries its `conflict_category`, its `commits.ours` and `commits.theirs`, and, for a `text` file, its `regions`: the `conflict_id`, the decoded `ours`, `base`, and `theirs` versions, and a few lines of context (`--context <0-20>` widens it). Every other category (`binary`, `deleted-on-one-side`, `renamed`, `no-markers`, `encoding-undetermined`) admits only a whole-side choice, `git-ours` or `git-theirs`. `whole_side_preserves_combined_content` says whether a whole-side checkout keeps what Git already combined outside the conflict: when it is false for a side, write that side's choice as `authored` region text instead.

Read more of a file, a governing rule, or a related change when a region's intent needs it. Resolve `merge.js` per `tool-resolution.md`.

## Reports

Write the report to the path in the brief and return only that path as your final message. Never put file contents, raw output, or logs in the final message.
