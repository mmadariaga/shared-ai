# Merge step: reuse

Fetch `@sai/commands/merge/steps/common.md` and read it once.
Fetch `@sai/commands/merge/steps/resolve.md` and read it once.

Goal: resolve the files of this stop that a saved procedure covers by applying that procedure, and report exactly what you wrote. The brief names the snapshot record and its hash, the run directory, and for each file its recipe path. The coordinator chose these files because the tool computed the same conflict signature for them as for the file the recipe was saved from; it did not judge whether the procedure fits.

For each file, read its recipe and the file's regions from the bundle, and check that the regions fit the procedure: the region count, and what each region position holds. Then write the text the procedure gives through `merge.js write`, and report, exactly as `steps/resolve.md` says (§ Writing and § Result), with no `recipe` field. A recipe saves you the decision, not the care: the sides of this stop may differ from the stop the recipe came from, so read both versions of each region before you write.

- A file that does not fit its recipe is left untouched. Name it in `summary` with the reason (the first region that differs), and leave it out of the payload.
- When no file fits, write nothing and report `failed` with that reason.
- Save no recipe, and change no recipe file.
- Resolve nothing else: a file with no recipe in the brief takes the `resolve` step.
