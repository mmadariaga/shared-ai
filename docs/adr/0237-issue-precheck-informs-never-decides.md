# ADR 0237: The issue precheck informs and never decides

## Status

Accepted.

## Context

A mature issue cites paths, `path:line` references, and symbols. Some of those symbols name what the change creates and cannot exist in the working tree yet. A blocking check would reject valid issues, so the intake needs stale references in view without turning them into a gate.

## Decision

The deterministic precheck `sai/tools/issue-precheck.js` lists the paths, `path:line` references, and symbols the working tree does not hold, each with its section, and never gates the intake; callers read `missing`, never the exit code. It is a separate tool because `change-document.js` reads no repository and takes no `--cwd`.

## Alternatives Considered

- **Blocking the intake on precheck findings in sections that describe current state.** Rejected because the section classification can fail and would open sections on valid issues.
- **Blocking on missing paths while informing only on symbols.** Rejected in favor of an informative precheck, because the user's explicit drift answer already gates the intake.

## Consequences

- The user decides drift with the precheck's evidence in view.
- Stale references are visible but not enforced.
- `validate` remains the semantic check.

## Provenance

Change `explore-issue-fast-path`, decision "The issue precheck informs and never decides".
