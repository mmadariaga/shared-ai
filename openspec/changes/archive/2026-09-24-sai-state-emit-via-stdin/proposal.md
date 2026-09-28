> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The documented PowerShell emit form (`Legacy` argument passing plus a variable with escaped doubles, `sai/policies/stage-machine.md` §Quoting) splits any event payload containing spaces into several native arguments under Windows PowerShell 5.1, and small models also drop the escapes. Because the stage-machine policy stopped the run on the first emit error, every such delivery slip halted exploration and waited for the user. Sending the event on stdin removes quoting from the invocation. A distinct parse-failure reason lets callers correct a delivery slip and retry it without involving the user.

## What Changes

- **BREAKING** `bin/sai-state.js` `emit` now takes `emit <id> <machineId> -` and reads the event JSON from stdin as UTF-8. The following are usage errors (exit 2, stdin not read): event JSON passed as an argument, a missing `-` marker, extra arguments after `-`, or an interactive-terminal stdin. The usage-error stderr message shows the canonical form `echo '<json>' | node <tool-path> emit <id> <machineId> -`.
- Before parsing, the event text is normalized (`normalizeEventText`, exported): a leading BOM (`U+FEFF`) is stripped and surrounding whitespace and line breaks are trimmed.
- Every event parse failure returns `{"error":"INVALID_EVENT","reason":"EVENT_UNPARSEABLE","next":...}` with exit 1 and no transition, plus one stderr line showing the canonical stdin form. This covers empty stdin, truncated JSON, trailing text, and broken or escaped quotes. `INVALID_EVENT` logic failures (rejected transitions, a malformed machine id) and `UNKNOWN_MACHINE` carry no `reason`.
- The quote-signature detectors `looksLikeQuoteStrippedJson` and `looksLikeEscapedQuoteJson` and their stderr hint pointing to §Quoting are removed, along with their module exports.
- The CLI usage text reads `sai-state emit <id> <machineId> -   (event JSON on stdin)`.
- `sai/policies/stage-machine.md` changes:
  - §Quoting is replaced by §Event delivery. Every shell uses one form: single-quoted JSON with plain double quotes, echoed and piped to `emit <id> <machineId> -`, with nothing escaped. The same form is documented for bash, Windows PowerShell 5.1, and PowerShell 7 on both Claude Code and opencode.
  - The canonical example uses that form.
  - §Responses separates delivery failures (`reason: "EVENT_UNPARSEABLE"`) from logic failures.
  - A `recordedList` carries only list identifiers.
  - The emit-error stop rule gains a bounded corrective retry for delivery failures.
  - The step-machine store-failure rule states that a delivery failure is not a store failure.
- The `sai-state` entries in `sai/policies/tool-execution-permissions.md` document that `emit` takes the event JSON on stdin.
- `test/sai-state.test.js` changes:
  - The shell-based helper is replaced by a shell-free `spawnSync` runner that sends emit events on stdin.
  - The detector matrix and hint tests are replaced by stdin cases:
    - BOM plus CRLF accepted
    - spaces and `?` accepted
    - empty, truncated, trailing-text, and escaped-quote input rejected with `EVENT_UNPARSEABLE`
    - argv JSON, a missing `-`, and extra arguments rejected with exit 2
    - no `reason` on non-delivery failures
- `test/recovery-ledger-machine.test.js` sends its emit events on stdin with a trailing `-`.
- `spawn`, `reset`, and `close` are unchanged.

## Capabilities

### New Capabilities

- `stage-machine-emit-delivery`: the stage-machine policy documents one emit invocation form for every shell, a bounded corrective retry for delivery failures, and identifier-only recorded lists.

### Modified Capabilities

- `stage-machine-cli-interface`: `emit` reads its event from stdin behind a `-` marker, rejects argv events as usage errors, normalizes BOM and whitespace, and tags parse failures with `reason: "EVENT_UNPARSEABLE"`. The emit failure wire shape gains the optional `reason`.
- `explore-stage-machine`: the single-level emit outcome scenario spells the stdin invocation.
- `reactive-instruction-loading`: the stop-on-emit-failure rules gain the corrective-retry exception for delivery failures.
- `powershell-quoting`: both requirements are removed; PowerShell uses the shared stdin form.
- `emit-diagnostic-hint`: all three requirements are removed; the quote-signature detectors and stderr hints are retired.

## Impact

- Modified files: `bin/sai-state.js`, `sai/policies/stage-machine.md`, `sai/policies/tool-execution-permissions.md`, `test/sai-state.test.js`, `test/recovery-ledger-machine.test.js`.
- New files: none.
- Existing argv `emit` invocations fail immediately with a usage error. Installed cards and the tool update together through the installer.
- Under Windows PowerShell 5.1, non-ASCII characters piped on stdin arrive as `?` and are accepted as received. Recorded lists carry identifiers only, so routing is unaffected.
- Left behind: `docs/adr/0182-cli-state-machine-single-writer-invariant.md` still describes the argv `emit <id> <machineId> <eventJson>` contract.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
