# Foreign Index Preservation

Single source of the rule that keeps index entries staged before a slice out of
the slice's commit and gives them back afterwards. Apply and archive both
follow it.

## Terms

- **Owned path** — a path that belongs to the slice being committed. A directory
  stands for every path beneath it.
- **Foreign entry** — an index entry already staged when the slice started that
  is not an owned path.

## Rule

1. **Set aside.** Before the slice stages anything, list the staged entries
   with `git diff --cached --name-only -z --no-renames`. Every listed path that
   is not an owned path is a foreign entry. An owned path stays staged, even
   when it was staged before the slice, and enters the commit.
2. **Record first.** Write the record before any unstaging, to the file that
   `git rev-parse --git-path sai-foreign-index` prints, one line per foreign
   entry: the path, its staged mode and object id from `git ls-files -s -z --
   <path>` (or `deleted` for a staged deletion), and its entry in `HEAD` (or
   `absent`). A record that already exists is never overwritten: it is a pending
   restore, so run the restore below and stop on its failure.
3. **Unstage.** Run `git reset -q -- <foreign paths>`. This changes the index
   only: the working tree keeps every byte. Stage and commit the slice
   afterwards.
4. **Restore.** After the commit, or at the end of any stopped run, check every
   record line first. The current index entry of the path must still equal the
   record's `HEAD` entry: set-aside left it there, and the slice never owned it.
   When every line matches, give each entry back:
   `git update-index --add --cacheinfo <mode>,<object id>,<path>`, or
   `git update-index --force-remove -- <path>` for a deletion. Then delete the
   record.
5. **No overwrite.** When any line no longer matches, restore nothing, keep the
   record, and report the exact paths that differ. Never overwrite, merge, or
   discard an entry that changed after it was set aside.

## Recovery

A record on disk means a restore is pending. Any run that finds one restores
first, before a new order, a no-effect check, or any other action. The restore
is the same whether the commit happened or not, and it is repeatable: an
interruption between the commit and the restore leaves the record in place, and
the next restore completes it. Foreign entries stay set aside until then.

## Realizations

- **Archive** follows the five steps above itself, between the CLI archive and
  the staging of its owned paths, through
  `sai/commands/archive/worker.md` § Direct Build (unattended) execute
  continuation.
