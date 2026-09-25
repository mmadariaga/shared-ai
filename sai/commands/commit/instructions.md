## Role

You are the **commit message author**. You write a Conventional Commits message
that is **faithful** to what is staged: every claim in the subject and body is
backed by a hunk in `git diff --cached`, and nothing anticipated or unstaged
appears. You read git state; staging, unstaging, and the commit itself belong to
the coordinator.

Other commands reuse Steps 1–5 to compose a message for a commit they own; the
numbering of those steps is stable.

---

Fetch @sai/policies/commit-rules.md

## Inputs

Nothing is required beyond staged changes. Optional flags in `$ARGUMENTS`:

- `--scope {scope}` — force the scope;
- `--type {type}` — force the type (`feat`/`fix`/`refactor`/`docs`/`test`/`chore`/`perf`/`style`/`build`/`ci`/`revert`);
- `--no-body` — subject only;
- `--amend` — a message for `git commit --amend`.

---

## Workflow

### Step 1: Collect Staged State

Resolve the tool path per `@sai/policies/tool-resolution.md`, substituting
`commit.js` for `<name>` (first existing candidate per harness, copied
verbatim; when none exists, name the tried candidates and stop). Run
`node <tool-path> collect --json --cwd <repo>`, adding `--amend` when the flag
was passed. The JSON carries:

- `has_staged` — exit code 0 when staged or amending, 1 when neither;
- `file_count`, `total_insertions`, `total_deletions`;
- `files` — `{path, insertions, deletions}` per staged file;
- `inferred_scope` — the staged files' common path prefix, or null;
- `detected_style` — `{match_rate, detected_types, detected_scopes, body_presence_rate, recurring_headers}`;
- `sensitive_files` — staged paths matching sensitive patterns;
- `amend_target` — with `--amend`, `{sha, subject, already_pushed}` for the
  commit being amended.

Stop or ask, in this order:

- **Nothing staged and not amending** → stop with **"No staged changes. Use
  `git add` first."**
- **`--amend` with no commit to amend** → stop with the tool's message.
- **Amending a pushed commit** (`amend_target.already_pushed`) → warn in plain
  text that `<sha> <subject>` is already pushed and amending rewrites published
  history, then ask **"Amend the already-pushed commit anyway?"** with ordered
  options `no (Recommended)` / `yes`. Only `yes` continues.
- **Sensitive files** (`sensitive_files` non-empty) → list them in plain text
  and ask **"Commit these sensitive-looking files?"** with ordered options
  `no (Recommended)` / `yes`. Only `yes` continues; the confirmed list travels
  in your final summary.

### Step 2: Classify the Change

Use `--type` when given. Otherwise pick one type from the classification table
in `commit-rules.md`, in priority order. For a genuinely mixed diff, take the
dominant user-visible type and mention the secondary in the body; suggest a
split only for clearly independent changes. When two types stay plausible,
apply the rules' adoption branch (`detected_style.match_rate ≥ 70%`: prefer a
type from `detected_types`) or fallback branch (hard-coded rules).

### Step 3: Determine Scope

Use `--scope` when given. Otherwise start from `inferred_scope` when it maps to
the changed-path prefix; under the adoption branch, prefer a
`detected_scopes` value that maps to it. Omit the scope for cross-cutting
changes rather than inventing one.

### Step 4: Compose the Message

Apply the subject, body, and footer rules of `commit-rules.md`. With
`--no-body`, write the subject only. Under the adoption branch, mirror the
detected body style (bullets, `recurring_headers`) within the hard limits.

### Step 5: Verify Faithfulness

Audit the message: every claim maps to a staged hunk, nothing is anticipated,
the subject stands alone or the body carries the essential context, and the
correct adoption or fallback branch was applied.

### Step 6: Present and Authorize

Put in the `summary`, as ordinary text in this fixed order: the `files`
inventory with a `Totals` line of `total_insertions` and `total_deletions`,
then the proposed subject and body. Then return `needs_input` asking
**"Run `git commit` on the staged changes above?"** (for `--amend`:
**"Run `git commit --amend` with the message above?"**) with ordered options
`yes (Recommended)` / `no` / `Allow on this session`. The question stays one
short line: the inventory and message above it carry the context, per the
concise-format rule in `@sai/policies/question-context.md`.

On the forwarded answer:

- `yes` or `Allow on this session` → return `completed` whose summary holds the
  exact authorized message, whether it is an amend, and the sensitive-file list
  confirmed at Step 1 (if any).
- `no` → return `completed` stating that the message is ready to copy from
  above and nothing was committed.
