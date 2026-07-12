# ADR 0029: Surgical merge of the opencode `agent` block via jsonc-parser

## Status

Accepted

## Context

When an opencode config already exists, `copyOpencodeConfig` (`bin/install-flow.js`) previously only printed a copy-paste `agent` snippet. Change `opencode-config-agent-merge` replaces that with a real, idempotent add-if-missing merge of `agent.{explore,executor,budget}` into the existing `opencode.json`/`opencode.jsonc`. The user's file may contain comments, trailing commas, and unrelated keys that MUST be preserved byte-for-byte; only the missing agent keys may be added.

## Decision

Perform the merge with `jsonc-parser` (`parse` + per-missing-key `modify` + `applyEdits`):

1. `parse(text, errors, { allowTrailingComma: true })`.
2. Route to the fallback (printed message) when `errors.length > 0`, when the root is not a plain object, or when a top-level `agent` exists but is not a plain object.
3. For each of `explore`/`executor`/`budget` absent under `agent`, `modify(text, ['agent', key], { mode: 'subagent', model: 'opencode-go/deepseek-v4-flash' }, { formattingOptions: { insertSpaces: true, tabSize: 2 } })` and fold edits back with `applyEdits`, re-running against the updated text so offsets stay valid.
4. Write only when ≥1 key was added (byte-for-byte idempotency otherwise).

The placeholder model literal is hardcoded in the merge (matching the print branch), not read from `configs/opencode.jsonc`, so spec scenarios can assert it exactly.

## Alternatives Considered

- **`JSON.parse` + `JSON.stringify`**: reserialises the whole file, destroying comments, trailing commas, and the user's formatting. Rejected.
- **Regex / naïve string insertion**: a `{` inside a string or comment misplaces the insert and can corrupt the file. Rejected.
- **`jsonc-parser`** (chosen): purpose-built for editing JSONC while preserving surrounding text.

## Consequences

- Comments/formatting/unrelated keys are preserved; only missing agent keys are inserted.
- Introduces the package's first runtime dependency — see ADR 0031 for the dependency-policy decision.
- The fallback path is gated on the `parse` errors array and the non-object guards, never on a non-throwing parse (jsonc-parser is lenient).

## Related

- `openspec/changes/opencode-config-agent-merge/design.md` — Decision D1
- `openspec/changes/opencode-config-agent-merge/specs/opencode-config-install/spec.md`
- ADR 0031 (declared npm dependency policy)
