# ADR 0045: Pin staged file set to previewed add-list with deferred timing preserved

## Status

Accepted

## Context

The STOP & COMMIT Checklist step that runs on `yes` / `Allow on this session` currently jumps straight to `git commit` (`sai/instructions/apply.md:206`) with the staged *set* left unscoped/implicit (`commit-rules.md` line 111 treats `git add` for the same step as implicitly authorized). This means the previewed add-list and the actual staged set could diverge: a blanket `git add -A` would stage leftovers the report just labeled "Will NOT be committed", contradicting the preview.

## Decision

Pin the staged set: the coordinator stages **exactly** the field-8 add-list the report previewed via `git add -- <add-list paths>`, not a blanket `git add -A` / `git add .`. This binds the preview and the resulting commit to one definition so they cannot diverge, and unrelated working-tree changes (the leftovers block) are left unstaged. Staging *timing* and *authorization* are unchanged — the `git add` still runs only on `yes` / `Allow on this session`, after the authorization ask, so `commit-rules.md` needs no edit.

## Alternatives Considered

- **Blanket `git add -A` / `git add .`** at commit time. Rejected: it stages the leftovers the report just labeled "Will NOT be committed", so the commit would contradict its own preview and violate the "Coordinator does not improvise the add set" scenario.
- **Chosen**: explicit `git add -- <field-8 add-list>`; the previewed set *is* the staged set, with timing/authorization untouched.

## Consequences

- Preview and commit share one definition; they cannot diverge.
- Unrelated working-tree changes remain unstaged, matching the report's `Will NOT be committed` block.
- No edit to `commit-rules.md` is required because staging *behavior* (timing/authorization) is unchanged; only the staged file *set* becomes defined.

## Related

- `openspec/changes/apply-precommit-report-commit-set/design.md` — Decision D3
- `openspec/changes/apply-precommit-report-commit-set/specs/apply-pre-commit-file-report/spec.md` — ADDED staging-set requirement
- `sai/instructions/apply.md` — sole edit target
- `sai/instructions/commit-rules.md` — deliberately left unchanged
