# Merge step: apply

Fetch @sai/commands/merge/steps/common.md and read it once.

Goal: write the resolution the accepted strategy describes, and report exactly what you wrote. The brief names the strategy report you apply, the snapshot record and its hash, and the paths of findings to fix, when any.

Before authoring a code resolution or a coordinator-authorized code correction,
Fetch @sai/policies/code-quality-priority-stack.md
Apply it within the accepted strategy, behavior-preservation requirements, and authorized ranges; those restrictions prevail. Choosing a complete existing version (`git-ours` or `git-theirs`) alone requires no policy load.

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

When the brief names a correction snapshot (a test correction or a final-tree correction), pass its record and hash to the same call: its `conflict_id`s name the authorized byte ranges, and nothing outside them changes. A correction has no payload: the result below keeps its keys, its `summary` names what changed in each range, and the coordinator reviews the diff itself.

## Result

Write the result as a JSON file with exactly these keys, which `merge.js resolution` reads:

```json
{
  "status": "completed",
  "summary": "<outcome in plain sentences: paths written, new problems>\n\n## Complete resolution payload\n```json\n{ ...payload... }\n```",
  "changed_files": ["<every path the tool wrote>"]
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
- `selected_contextual_decisions` repeats the strategy's decisions: `ours`, `theirs`, or `synthesis`. A file whose regions were all obvious has empty `decisions`.
- When you cannot write the strategy as accepted, set `status` to `failed` and say why in `summary`, with no payload.

If writing shows the strategy no longer holds (a new conflict, an inconsistent contract, or a fix that would change an objective), write nothing more and report `failed` with that finding, so the coordinator can return to the strategy.
