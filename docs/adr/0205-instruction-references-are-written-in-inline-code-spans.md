# ADR 0205: Instruction references are written inside inline code spans

<!-- adr-index: refs 0203, refs 0146b -->

## Status

Accepted. Refs ADR 0203 and ADR 0146b: it adds the inline code span form to the `@sai/…` reference convention that ADR 0003 originally set.

## Context

Instruction files point to each other with references: `@sai/…`, `@skills/…`, and `@commands/…` paths, most of them in `Fetch` directives and the rest in prose. Inside the shared-ai repository, Claude Code resolves every bare `@` path of a loaded skill or command body against the working directory and, when it names an existing file, attaches that file as a Read of the repository copy, once per mention. The attachment happens before the model acts, so the loaded-copy reuse rule of the fetch skill cannot prevent it. The result is duplicated context: loading the `budget-*` skills attaches three copies of `sai/policies/cache-warming.md`. Projects where `@sai/…` does not resolve to a file are unaffected.

A proof of concept on 2026-11-04, in a fresh Claude Code session inside a shared-ai worktree, tested the three ways to write a reference, in both a slash-command body and a skill loaded through the Skill tool:

- a bare reference is attached;
- a reference inside an inline code span is not attached;
- a reference inside a fenced code block is attached.

The `@sai/…` path convention comes from ADR 0003 and ADR 0146b, and ADR 0203 moved fetch resolution into a deterministic tool. None of them says how a reference is written in the text.

## Decision

1. **Every reference sits in an inline code span.** Every `@sai/`, `@skills/`, and `@commands/` reference in the installed instruction files (`sai/`, `skills/`, `commands/`, and `agents/`) is written inside an inline code span, whether it is a `Fetch` directive (``Fetch `@sai/policies/x.md` ``) or a prose mention. Only the path is wrapped; trailing anchors such as `§ Section` stay outside the span. A fenced block names no existing file: a reference there is a placeholder path (`@sai/<path>`, `{name}`) or moves into an inline code span outside the fence.
2. **Generators emit the same form.** The command wrapper templates, the worker binding templates (`` `@{{workerContract}}` ``), `canonicalFetch` in `bin/worker-matrix.js`, and the dispatch prompt in `bin/install-flow.js` write backticked references.
3. **A backticked directive is the same directive.** Both fetch skills (`skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md`) resolve ``Fetch `@sai/x.md` ``, ``Also fetch `@sai/x.md` ``, and ``Fetch `@skills/<name>/SKILL.md` `` exactly like the bare form, including the Skill-tool row, and `parseFetchRefs` in `bin/doctor.js` reads both forms. `fetch.js` and the `@sai/…` path convention do not change.
4. **A test enforces it.** `test/instruction-reference-guard.test.js` runs under `npm test`. It scans the Markdown files of the four installed roots, ignores text below the `<!-- User customizations below this line -->` marker of a wrapper, and reports `file:line` for each reference outside an inline code span and for each fenced reference that names an existing file.
5. **The opencode bootstrap line stays bare.** `Fetch @~/.config/opencode/skills/fetch/SKILL.md` is not a reference (it does not start with one of the three roots), so it is neither wrapped nor checked. Files outside the installed set (`docs/`, `openspec/`, `README`, tests) are not swept and are not checked.

## Alternatives Considered

- **Move the source `sai/` and `skills/` trees out of the repository root so `@sai/…` no longer resolves** — rejected: it is a large restructure of the installer, the tests, the documentation, and the decision-record paths.
- **Drop the `@` prefix from directives** — rejected: it changes the ADR 0003 convention and the fetch skill parsing for every project.
- **Wrap only the `Fetch` directives** — rejected: prose mentions are attached too, so the duplication would remain.

## Consequences

- The change is a large but mechanical diff across roughly 264 Markdown files, in exchange for no change to `fetch.js` or the path convention.
- A new instruction file, template, or generator that writes a bare reference fails `npm test` and names the file and line.
- Every instruction reader (a fetch skill, `bin/doctor.js`, a test) must accept the backticked directive; a reader that matches only ``Fetch @`` misses it.
- A reference already inside a code span, such as `` `Fetch @sai/x.md and use it.` ``, stays as written: the guard accepts it, and the fetch skills read the path in it.
- The behavior of opencode with backticked references is not verified. The backticks are expected to be harmless there, because resolution goes through the fetch skill.
- The attachment behavior is observed, not documented by the harness; a later Claude Code release can change it, and the proof of concept above is the evidence to repeat.

## Provenance

Change `wrap-instruction-references-in-code-spans`, decision "Instruction references are written inside inline code spans".
