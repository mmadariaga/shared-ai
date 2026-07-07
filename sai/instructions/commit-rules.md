## Commit Type Classification

Pick exactly one Conventional Commits type, in this priority order:

| Type | When |
|------|------|
| `feat` | New user-facing capability or new public API surface |
| `fix` | Bug fix that changes behavior the user could observe |
| `perf` | Measurable performance improvement, no behavioral change |
| `refactor` | Code restructured without changing behavior or perf |
| `docs` | Only docs/README/comments |
| `test` | Only test files added or modified |
| `build` | Build system, dependencies, lockfiles, package manager config |
| `ci` | CI configuration only (`.github/`, `.gitlab-ci.yml`, etc.) |
| `chore` | Maintenance: tooling config, file moves, formatting-only diffs not covered above |
| `style` | Whitespace/formatting only — code semantics unchanged |
| `revert` | Reverts a prior commit (subject: `revert: <reverted subject>`) |

## Subject Format

**Subject (line 1):**
- Format: `type(scope): description` or `type: description` (no scope)
- **≤ 50 characters** (hard limit; breaks GitHub UI past 72)
- Imperative mood (`add`, not `added`/`adds`)
- No trailing period
- No emoji unless the user explicitly asks
- Lowercase after the colon (unless an identifier or proper noun)

## Body

**Body (optional):**
- Skip when the subject is self-evident or `--no-body` is passed
- Include when the **why** is non-obvious — context, motivation, trade-offs, hidden constraints
- **Wrap at 72 characters per line**
- Blank line between subject and body
- Focus on *why*, not *what* (the diff already shows what)
- Reference issue / ticket IDs if discoverable in branch name or recent commits
- Note breaking changes with `BREAKING CHANGE: <description>` footer

## Footer

**Footer (optional):**
- `BREAKING CHANGE: ...` for incompatible API changes (also bump subject to `feat!:`/`fix!:`)
- `Refs: #123` / `Closes: #123` if the user mentions an issue or it appears in branch name
- **No `Co-Authored-By` or AI-generated attribution trailers** unless the user explicitly requests them

## Repo Commit-Style Detection Rubric

Before classifying and composing, measure the repository's recent commit history
against the Conventional Commits shape to decide whether to adopt the established
vocabulary or fall back to the hard-coded rules in this file.

**Conventional Commits shape:** `^<type>(\(<scope>\))?: <subject>$`

**Scan window:** `N = 20` — the last 20 commits. *(Fixed value declared in this
rubric; adjust by editing this line, not via a runtime flag.)*

**Adoption threshold:** `70%`. *(Fixed value declared in this rubric; adjust by
editing this line, not via a runtime flag.)*

From the last `N` commits, compute four measures:

1. **Match rate** — fraction of subjects matching the Conventional Commits shape.
2. **Type & scope vocabulary** — the distinct types (e.g. `feat`, `fix`, `docs`)
   and scopes actually used.
3. **Body-presence rate** — fraction of commits with a non-empty body.
4. **Recurring body section headers** — repeated body lines such as
   `Spec changes:`, `Instruction changes:`, `Archived:`, `Includes backfilled`,
   `Refactored … to`. These are **body section headers, not git trailers**: they
   MAY be mirrored, and are distinct from the forbidden `Co-Authored-By` /
   AI-generated attribution git trailers, which remain banned unconditionally
   (see Hard Rules).

### Adoption branch (match rate ≥ 70%)

Adopt the detected style when composing:

- Prefer a detected **type** only to break a genuine tie when the staged diff does
  not clearly dictate one. A type the staged diff clearly dictates is **never**
  overridden by the dominant detected type.
- Prefer a detected **scope** that maps to the changed path prefix of the staged
  files over an invented scope.
- Mirror the detected **body/footer style** (bulleted bodies and recurring body
  section headers) when a body is emitted.

Adoption never relaxes faithfulness: every claim must still map to a staged hunk,
and detected vocabulary never introduces content absent from `git diff --cached`.

### Fallback branch (match rate < 70%)

Compose using only the hard-coded classification, subject, body, and footer rules
in this file — they are the sole source of truth. Apply no detected type, scope,
or body style.

### Precedence: flags and hard limits override detected style

- Explicit user flags always win: `--type` / `--scope` override any detected
  type/scope, `--no-body` suppresses a body even when the detected style uses
  bodies, and `--amend` keeps its current semantics.
- The hard limits hold under adoption exactly as under fallback: subject ≤ 50
  characters, body wrapped at 72, no emoji unless explicitly requested, and no
  `Co-Authored-By` / AI-generated attribution trailers unless explicitly
  requested. If a mirrored body/subject would exceed a hard limit or add a
  forbidden trailer, enforce the limit and omit the trailer, adjusting the
  mirrored style to comply.

## Hard Rules

- **Never stage or unstage files.** Operate only on what is already staged.
- **Never run `git commit` without explicit per-invocation authorization.**
- **Always ask for explicit per-invocation authorization before running `git commit`.** Once the user has granted permission for a commit, `git add` for the same step is implicitly authorized — do not ask again. If the user does not respond or declines, do not commit; describe the staged changes and instruct the user to commit themselves.
- **Never amend a commit that is already pushed** without explicit warning + secondary confirmation.
- **Never use `--no-verify`** to skip hooks. If a pre-commit hook fails, surface the failure, do not bypass it.
- **Never include unstaged content** in the message — describe only `git diff --cached`.
- **Subject ≤ 50 chars, body wrap 72.** Hard limits.
- **Imperative mood, no trailing period, lowercase after colon.**
- **No `Co-Authored-By` or AI-generated attribution trailers** unless the user explicitly asks.
- **No emoji** unless the user explicitly asks.
- **No speculation.** Every claim must map to a staged hunk.
- **Match the repo's commit style** per the Repo Commit-Style Detection Rubric above — apply the adoption branch (match rate ≥ 70%) or the fallback branch (match rate < 70%) rather than treating this as advisory only.

## Self-Critique Checklist

Verify:
1. **Type accuracy** — `feat` only for new capabilities; `fix` only when behavior changed.
2. **Subject length** — ≤ 50 chars, no period, imperative.
3. **Body wrap** — 72 chars per line if body present.
4. **Faithfulness** — every claim backed by `git diff --cached`.
5. **No anticipated work** in the message.
6. **Repo convention match** — applied the correct rubric branch: adoption (match rate ≥ 70%: detected type/scope/body vocabulary) or fallback (match rate < 70%: hard-coded rules) per the detection rubric — not a free-form "consistent with recent commits" judgement.
7. **Secrets check** — no obvious secret-looking files in staging without warning.
