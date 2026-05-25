# ADR 0011: Regex line-level patch for config.yaml schema field instead of YAML library

## Status

Accepted

## Context

`bin/setup.js` must ensure that `openspec/config.yaml` contains the line `schema: sai-workflow`. The file is managed by the `openspec` CLI and may contain arbitrary YAML content that the setup command must not disturb.

The standard structured approach would use a YAML parsing library (`js-yaml` or `yaml`) to read the file, set the field, and write it back.

However, `bin/setup.js` runs via `npx github:mmadariaga/shared-ai setup` without any prior `npm install`. The `npx github:` invocation fetches the repo tarball but does NOT run `npm install` — any external npm dependency silently fails to load at runtime. This is the same constraint that drove ADR 0010 (readline over npm for interactive checklist).

Additionally, the spec requires a "minimal-patch": only the `schema:` line may change; all other content must be preserved verbatim. YAML libraries (e.g., `yaml.dump`) reformat the entire file — normalizing whitespace, reordering keys, or changing quote styles — which would violate this requirement.

## Decision

Use regex-based string replacement on the raw UTF-8 file content:

1. Read the file as a UTF-8 string.
2. Test against `/^schema:\s*sai-workflow\s*$/m` — if matched, return (already correct).
3. If a `schema:` line exists (matched by `/^schema:.*$/m`), replace it with `schema: sai-workflow`.
4. If no `schema:` line exists, prepend `schema: sai-workflow\n` to the file content.
5. Write back as UTF-8.

Only the `schema:` line changes. All other bytes in the file are preserved exactly.

## Alternatives Considered

- **`js-yaml` / `yaml` npm package**: structured access, but adds a runtime dependency and `yaml.dump` reformats the entire file, violating the minimal-patch requirement. Rejected.
- **Manual YAML serialisation (write the whole file from scratch)**: would need to parse all existing keys to reconstruct the file — equivalent complexity to a library, plus fragile. Rejected.
- **`sed`-style child process**: cross-platform issues (GNU sed vs BSD sed vs Windows). Rejected in favor of in-process string ops.

## Consequences

- Zero new runtime dependencies. Works on any Node.js ≥ 18 machine with no registry access.
- Patch is strictly minimal: a diff of the file before and after shows exactly one line changed.
- The approach is fragile to unusual `schema:` values that span multiple lines (YAML block scalars). This edge case is considered out of scope — `openspec init` generates a single-line `schema:` value by convention.
