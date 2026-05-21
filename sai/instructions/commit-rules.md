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
- **No `Co-Authored-By` or "Generated with Claude Code" trailers** unless the user explicitly requests them

## Hard Rules

- **Never stage or unstage files.** Operate only on what is already staged.
- **Never run `git commit` without explicit per-invocation authorization.**
- **Never amend a commit that is already pushed** without explicit warning + secondary confirmation.
- **Never use `--no-verify`** to skip hooks. If a pre-commit hook fails, surface the failure, do not bypass it.
- **Never include unstaged content** in the message — describe only `git diff --cached`.
- **Subject ≤ 50 chars, body wrap 72.** Hard limits.
- **Imperative mood, no trailing period, lowercase after colon.**
- **No `Co-Authored-By` / "Generated with Claude Code" trailers** unless the user explicitly asks.
- **No emoji** unless the user explicitly asks.
- **No speculation.** Every claim must map to a staged hunk.
- **Match the repo's commit style.** If recent commits use a particular convention (scope naming, ticket refs, language), match it.

## Self-Critique Checklist

Verify:
1. **Type accuracy** — `feat` only for new capabilities; `fix` only when behavior changed.
2. **Subject length** — ≤ 50 chars, no period, imperative.
3. **Body wrap** — 72 chars per line if body present.
4. **Faithfulness** — every claim backed by `git diff --cached`.
5. **No anticipated work** in the message.
6. **Repo convention match** — prefix style, scope naming, language consistent with recent commits.
7. **Secrets check** — no obvious secret-looking files in staging without warning.
