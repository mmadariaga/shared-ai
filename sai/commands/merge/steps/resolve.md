# Merge step: resolve

Fetch `@sai/commands/merge/steps/common.md` and read it once.
Fetch `@sai/commands/merge/steps/strategy.md` and read it once.

Goal: decide how every conflict of the files you are given resolves, write the resolution, and report exactly what you wrote, in this one step. The brief names the snapshot record and its hash, the files you resolve, the method, the run directory, and, when they exist, the paths of findings to fix, the decisions the user chose for escalated conflicts, and the correction snapshot of a test or final-tree correction.

Decide as `steps/strategy.md` says. When that leaves an escalation, you are in its strategy-only step: write nothing, and save the report it defines. Otherwise write what you decided without a pause for approval: the coordinator reviews the written text together with your decisions. A decision the brief carries from the user stands, and is written as given.

Before authoring a code resolution or a coordinator-authorized code correction,
Fetch `@sai/policies/code-quality-priority-stack.md`
Apply it within your decisions by commit intent, behavior-preservation requirements, and authorized ranges; those restrictions prevail. Choosing a complete existing version (`git-ours` or `git-theirs`) alone requires no policy load.

## Writing

The tool places the bytes; you supply the plan. Send every region of every `authored` file through one call. Write the payload as a UTF-8 JSON file in the run directory with your own file-write tool, and pass it with `--input`; never pipe the payload through a shell, whose transport can change non-ASCII characters:

```text
node <merge-tool> write --record <snapshot> --record-hash <sha256> --input <payload-file> --json --cwd <project-root>
```

The payload is one entry, or an array of entries, each naming a `conflict_id` and carrying exactly one of two forms:

- `{"conflict_id": "<id>", "segments": [...]}` composes the region from pieces. A piece is `{"side": "ours"}`, `{"side": "theirs"}`, or `{"side": "base"}`, which the tool copies from the snapshot (the same versions `bundle` shows), or `{"text": "<literal text>"}`. The pieces are joined in order with nothing between them, so a separator, such as a line between two sides, is a `text` piece. Use `segments` for every region that equals one side or a concatenation of sides: you never retype what the tool already holds. A `base` piece is rejected when the region has no base version (`base_from: unavailable` in the bundle).
- `{"conflict_id": "<id>", "text": "<resolved text>"}` is the region's complete replacement, final line ending included. Use it only for line-level synthesis that no composition of sides expresses.

The tool keeps the file's encoding, BOM, and line endings, so write the text plainly. Standard input remains accepted in place of `--input`, never together with it.

A call is whole: `outcome: failure` means nothing was written. It rejects text with a conflict marker line, a `conflict_id` outside the snapshot, a malformed or both-form entry, a side the region lacks, a file whose encoding is undetermined, and a file changed by anything but the tool. Correct the named input and call again. `pending` lists the regions of a written file that are still unresolved. Edit an affected file only through this call, and send nothing for `git-ours` and `git-theirs` files. To fix a region you already wrote, send its `conflict_id` again with the corrected entry. When no complete marker-free outcome exists for a file, report `failed` and leave the conflict untouched.

When the brief names a correction snapshot (a test correction or a final-tree correction), pass its record and hash to the same call: its `conflict_id`s name the authorized byte ranges, and nothing outside them changes. A correction has no payload and no `decisions`: the result below keeps its keys, its `summary` names what changed in each range, and the coordinator reviews the diff itself.

## Result

Save the result as a JSON report with these keys, which `merge.js resolution` reads from the saved file:

```json
{
  "status": "completed",
  "summary": "<outcome in plain sentences: paths written, per semantic region the objectives of both sides and what the outcome gives up, new problems>\n\n## Complete resolution payload\n```json\n{ ...payload... }\n```",
  "changed_files": ["<every path the tool wrote>"],
  "decisions": [{"conflict_id": "code:src/output.js#1", "decision": "synthesis"}],
  "recipe": [{"path": "<recipe file>", "signature": "<signature id>"}]
}
```

The payload holds one record per affected conflicted file, obvious ones included:

```json
{
  "selected_contextual_decisions": [{"conflict_id": "code:src/output.js#1", "decision": "synthesis"}],
  "files": [
    {"path": "src/input.js", "category": "code", "source": "git-ours", "regions": [], "decisions": []},
    {"path": "src/output.js", "category": "code", "source": "authored",
     "regions": [{"conflict_id": "code:src/output.js#1", "text": "<the replacement text, as written>"},
                 {"conflict_id": "code:src/output.js#2", "segments": [{"side": "ours"}, {"side": "theirs"}]}],
     "decisions": [{"conflict_id": "code:src/output.js#1", "decision": "synthesis"}]}
  ]
}
```

- `category` is `specs`, `adr-ddr`, or `code`. `source` is `git-ours`, `git-theirs`, or `authored`; a git-sourced record has no regions, and an authored one has one region per conflict region, ordered by `conflict_id`.
- A region carries either `text`, that region only (no diff, hunk, whole file, annotation, or marker line), or the same `segments` you sent to `write`; `merge.js resolution` composes them again from the snapshot.
- `selected_contextual_decisions` and the report's `decisions` hold the same list: one entry per semantic region and one per whole-side file, `ours`, `theirs`, or `synthesis`. A file whose regions were all obvious has empty `decisions`.
- `recipe` is optional and described below.
- When you cannot write what you decided (a new conflict, an inconsistent contract, or a fix that would change an objective), write nothing more and set `status` to `failed` with the finding in `summary` and no payload, so the coordinator can decide again.

## Saving a recipe

A repeated conflict is a repeated procedure. When the method in the brief is a rebase, so that later stops can follow, and you resolved a file by a procedure that would work unchanged at a later stop with the same conflict signature (a regenerated or generated file, a version or changelog line, a mechanical rule of the repository), save that procedure as a recipe, in the format of `sai/commands/merge/mechanics.md` § Recipes, as a new Markdown file in `<run directory>/recipes/` under a unique name, and list it in the report's `recipe` as `{path, signature}`, where `signature` is the `signature.id` of that file in the snapshot, copied as it is. Save none when the brief carries a decision of the user (the stop went through an escalation, so a later stop with the same signature gets its own decision), for text that only this stop explains, or in a message that carries a correction snapshot. One recipe covers one file.
