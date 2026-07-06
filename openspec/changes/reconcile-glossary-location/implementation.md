# Reconcile GLOSSARY.md canonical location

## Goal

Make the **project root** the single, explicit, unambiguous canonical location for `GLOSSARY.md` across every SAI instruction file, demoting the multi-context `GLOSSARY-MAP.md` mechanism to a deferred/optional note that no longer contradicts the single-root rule.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD`. If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Present exactly three options in the user's input language (English fallback), in this fixed order:
  1. `Suggest branch "reconcile-glossary-location"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- If the selected branch does not exist, create it from `main` before implementing.

**Nature of this change:** docs-only. There is no runtime code, so there is **no RED → GREEN** for any step (per `tasks.md` `## Implementation Context`). Every step is verified by read-back of the edited Markdown. No step has browser-observable behavior, so no step has a Human check.

### Step-by-Step Instructions

#### Step 1: State single canonical root and demote multi-context in glossary-format

*(Docs step — no RED/GREEN. Edits `sai/instructions/glossary-format.md`.)*

- [x] **Edit 1a — add an explicit canonical-location statement.** In `sai/instructions/glossary-format.md`, immediately after the `## Scope` section (after the line `` `GLOSSARY.md` documents domain language and concepts only. It excludes general programming concepts. ``), insert a new section:

```markdown

## Canonical location

`GLOSSARY.md` lives at exactly one place: the **project root** (`./GLOSSARY.md`). This is the single canonical location — every SAI phase (spec bootstrap/append, implement reader, review auditor) reads and writes it there. No SAI instruction or spec places the canonical glossary inside `openspec/changes/{name}/` or any other directory.
```

- [x] **Edit 1b — demote the multi-context section.** Replace the entire `## Multi-context repos` block, which currently reads:

```markdown
## Multi-context repos

For projects with multiple bounded contexts, create a root `GLOSSARY-MAP.md` listing:
- Each context's location (path to its own `GLOSSARY.md`) and purpose
- Cross-context relationships and event flows
- Shared types or conventions

Resolution order: check for `GLOSSARY-MAP.md` first, then fall back to a single root `GLOSSARY.md`.
```

with:

```markdown
## Multi-context repos (deferred / optional)

> **Deferred / optional — does not override the single canonical root.** The single project-root `GLOSSARY.md` (see [Canonical location](#canonical-location)) is always authoritative. The `GLOSSARY-MAP.md` mechanism below is a future idea, not an active resolution rule, and MUST NOT be treated as taking precedence over the root `GLOSSARY.md`.

For projects that later need to split multiple bounded contexts, a root `GLOSSARY-MAP.md` could list:
- Each context's location (path to its own `GLOSSARY.md`) and purpose
- Cross-context relationships and event flows
- Shared types or conventions

Until that mechanism is designed, resolution is unconditional: use the single project-root `GLOSSARY.md`.
```

- [x] Leave the `## Bootstrap` section untouched — its step 1 already says "Create `GLOSSARY.md` at the project root".

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `rg -n "Canonical location" sai/instructions/glossary-format.md` — matches the new section heading.
- [x] `rg -n "single canonical location|single place: the \*\*project root\*\*|project root" sai/instructions/glossary-format.md` — the file names the project root as the single canonical location.
- [x] `rg -n "Multi-context repos \(deferred / optional\)" sai/instructions/glossary-format.md` — the multi-context heading is marked deferred/optional.
- [x] `rg -n "check for .GLOSSARY-MAP.md. first" sai/instructions/glossary-format.md` — returns **no matches** (the precedence wording is gone).
- [x] Manual read-back: no statement in the file places the canonical `GLOSSARY.md` inside `openspec/changes/{name}/`.

*(No Human checks — service-side docs edit with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Fix spec command write path and frame glossary as a named root exception

*(Docs step — no RED/GREEN. Edits `sai/instructions/spec.propose.md`.)*

- [x] **Edit 2a — rewrite the MAY-modify list.** In `sai/instructions/spec.propose.md`, replace the block that currently reads:

```markdown
The ONLY files you are allowed to create or modify are:
- `openspec/changes/{name}/proposal.md`
- `openspec/changes/{name}/specs/**/*.md`
- `openspec/changes/{name}/GLOSSARY.md` (if bootstrapping)
- `openspec/changes/{name}/.openspec.yaml`
```

with:

```markdown
The ONLY files you are allowed to create or modify are the `openspec/changes/{name}/` subset:
- `openspec/changes/{name}/proposal.md`
- `openspec/changes/{name}/specs/**/*.md`
- `openspec/changes/{name}/.openspec.yaml`

Plus exactly one named exception outside that folder:
- `./GLOSSARY.md` — the project-root glossary (if bootstrapping or appending a domain term). This is the single file the spec command may touch outside `openspec/changes/{name}/`. It does NOT widen the allowed scope to any other project-root file.
```

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `rg -n '\./GLOSSARY\.md' sai/instructions/spec.propose.md` — the MAY-modify list references `./GLOSSARY.md`.
- [x] `rg -n 'openspec/changes/\{name\}/GLOSSARY\.md' sai/instructions/spec.propose.md` — returns **no matches** (old change-folder path removed).
- [x] `rg -n "named exception|single file the spec command may touch outside" sai/instructions/spec.propose.md` — the glossary is framed as a named project-root exception, distinct from the change-folder subset.

*(No Human checks — service-side docs edit with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: Qualify implement.md glossary reader to project root

*(Docs step — no RED/GREEN. Edits `sai/instructions/implement.md`.)*

- [ ] **Edit 3a — qualify the reader step.** In `sai/instructions/implement.md`, under `5. Domain Language`, replace the first bullet, which currently reads:

```markdown
   - Read `GLOSSARY.md` if it exists. Format reference: use the `<glossary_format>` block pre-loaded in context to interpret the file structure (Language, Relationships, Example dialogue, Flagged ambiguities).
```

with:

```markdown
   - Read the project-root `GLOSSARY.md` (`./GLOSSARY.md`) if it exists — this is its single canonical location; do not fall back to `openspec/changes/{name}/`. Format reference: use the `<glossary_format>` block pre-loaded in context to interpret the file structure (Language, Relationships, Example dialogue, Flagged ambiguities).
```

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `rg -n 'project-root .GLOSSARY\.md. \(.\./GLOSSARY\.md.\)' sai/instructions/implement.md` — the reader step names the project-root location explicitly.
- [ ] `rg -n 'single canonical location; do not fall back' sai/instructions/implement.md` — the "if it exists" wording now resolves to the project-root path, not the change folder.

*(No Human checks — service-side docs edit with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 4: Verify reader/doc consistency (no edits expected)

*(Verification-only step — no RED/GREEN. Reads `sai/instructions/review.md`, `README.md`, `AGENTS.md`. Make an edit ONLY if a residual contradiction is found; per design D5 none is expected.)*

- [ ] Read-back `sai/instructions/review.md` around the Domain Language Consistency pass and confirm it still says the glossary resolves **at repo root**.
- [ ] Read-back `README.md` (Ubiquitous Language section) and confirm it still says `GLOSSARY.md` lives **at the project root**.
- [ ] Read-back `AGENTS.md` (`### GLOSSARY.md` section) and confirm it asserts **no conflicting location** (it references the format file only).
- [ ] Only if one of the three above contradicts the single project-root canonical location: make the minimal edit to align it, and note the edit here. Otherwise leave all three files untouched.

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `rg -n "at repo root" sai/instructions/review.md` — review still resolves the glossary at repo root.
- [ ] `rg -n "at the project root" README.md` — README still states the project-root location.
- [ ] `rg -n "openspec/changes/\{name\}/GLOSSARY\.md" sai/instructions/review.md README.md AGENTS.md` — returns **no matches** (no file reintroduces the change-folder path).

*(No Human checks — verification-only docs step with no observable browser behavior.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping. If no edit was needed, there is nothing to commit for this step — record that the verification passed with no changes.

**STOP & COMMIT:** If an edit was made, stage and commit after Automated checks pass. No browser verification required at this step.
