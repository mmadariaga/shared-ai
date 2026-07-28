<sai_learnings_format>

# SAI_LEARNINGS.md Format

Canonical structure for `SAI_LEARNINGS.md` — the durable record of execution-observed facts about how a repository actually builds, tests, and behaves. Modeled structurally on `sai/policies/glossary-format.md`.

This file is consumed by the promotion and consumption instructions. Any agent that reads, writes, or audits `SAI_LEARNINGS.md` must conform to this format.

## Scope

`SAI_LEARNINGS.md` records durable, repository-level facts that execution surfaced — a build flag the toolchain rejects, a linter rule that forbids an assumed construct, a dependency version lacking an assumed API, the command that actually runs the tests. It excludes anything scoped to a single change: a fact about a class, function, module, or file that a change introduced or renamed does not belong here.

It is not a changelog, not a retrospective, and not a narrative of any one run.

## Canonical location

`SAI_LEARNINGS.md` lives at exactly one place: the **project root** (`./SAI_LEARNINGS.md`). This is the single canonical location — every SAI phase that reads or writes it does so there. No SAI instruction or spec places the canonical learnings file inside `openspec/changes/{name}/` or any other directory.

The filename is namespaced with the `SAI_` prefix deliberately. A generic `LEARNINGS.md` is NOT used: shared-ai installs into third-party repositories where such a file could already exist as human-written retrospective or onboarding notes, and silently feeding unrelated prose into the pipeline is worse than recording nothing.

When the file does not exist, every reader skips its consumption step silently — no warning, no error, no prompt, no halt. This mirrors the handling of an absent root `GLOSSARY.md`.

## File structure

The file contains exactly four content sections, in this order. No fifth section is introduced and no section is renamed. A section with no entries keeps its heading and is left empty, so the file's shape is stable for a reader matching on headings.

```markdown
# SAI Learnings — {Project Name}

{One or two sentences naming the repository this file describes.}

## Stack

- **{repo-level artifact key}**: {the durable fact, one or two sentences}
  *Observed:* {change-name} — {what was attempted and what actually happened}

## Conventions

- **{key}**: {fact}
  *Observed:* {change-name} — {attempt → outcome}

## Avoid

- **{key}**: {fact}
  *Observed:* {change-name} — {attempt → outcome}

## Test Command

{the directly-executable command, including the parameterised scoping idiom}
*Observed:* {change-name}
```

These four section names are deliberately identical to the four fields of `tasks.md`'s `## Implementation Context`. For **Stack**, **Conventions**, and **Avoid** that identity is load-bearing rather than cosmetic: it lets `/sai-2-design` merge section-into-field with no mapping layer.

**Test Command is an explicit exception to that identity** and does NOT merge field-to-field. Any statement that all four sections merge without translation is incorrect and must not be written into this file or any instruction body.

## Rules

- **Key on a repo-level artifact.** For **Stack**, **Conventions**, and **Avoid**, every entry carries a `{key}` naming a package, a build target, a command, a configuration file, a compiler or linter rule, or a framework version constraint. The key never names a symbol, function, class, module, or file that the change being applied introduced or renamed.
- **State a fact about the repository, not a story about a run.** An entry whose content is only meaningful in the context of one change is not written.
- **Cite the run.** The `*Observed:*` line names the change that surfaced the fact, so a reader can trace the entry back to the `## Appendix: Plan vs Final Implementation` it was promoted from.
- **Carry what works instead.** An entry states the durable fact and the working alternative, not merely that something failed.
- **Test Command is single-valued and keyless.** The `## Test Command` section holds at most one entry: a single directly-executable command string carrying the project's parameterised scoping idiom where its runner supports one. It is never written as a keyed bullet, never carries a `**{key}**:` prefix, and never places provenance on the same line as the command. Provenance sits on its own line beneath the command, so the command line can be lifted verbatim without stripping syntax. When the project has no test runner, the section carries the explicit sentinel `None — no test runner in this project` rather than being left empty.
- **A fact that fits no section is not recorded.** When a candidate matches none of Stack, Conventions, Avoid, or Test Command, it is not promoted and no new section is created to hold it.

## Append and supersede rules

- **Append into the matching section** when the key is new to that section.
- **Supersede by key** when the key already exists in the same section: the newer entry replaces the older one in place. The older entry is not retained alongside it and is not preserved as history within the file. Supersede matches on the key only, and only within a single section — two entries with the same key in different sections are distinct and do not supersede each other.
- **Supersede for Test Command replaces the whole section.** Because that section holds at most one entry, a newer observation of the project's test invocation replaces the existing command outright rather than matching a key.
- **Invalidation is supersede-only.** No SAI phase has authority to delete an entry because it believes the entry to be contradicted, out of date, or no longer relevant. This converts an active-detection problem into a passive-write property: an entry is corrected when a later run observes the same key again, and a stale entry otherwise survives until then. A phase that detects a contradiction surfaces it as printed output and leaves the file unchanged.

## Bootstrap (when no `SAI_LEARNINGS.md` exists yet)

On the first promotion that produces at least one qualifying entry:

1. Create `SAI_LEARNINGS.md` at the project root with all four section headings in order, placing the qualifying entries in their sections and leaving the remaining headings present and empty.
2. Notify the user that the file was created and that future runs will append to it and supersede entries within it.

When a promotion produces no qualifying entry and the file does not exist, it is not created. An empty `SAI_LEARNINGS.md` is never written.

</sai_learnings_format>
