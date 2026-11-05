> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Azure DevOps publication hung silently because every `spawnSync` call on the backlog path ran without a timeout, so the caller never learned which step stalled. One receipt read also crashed with `Cannot read properties of undefined (reading 'find')` when a SAI marker carried no usable `slices` array. The backlog tools needed a bound on every external process they start, a failure that names the stalled step, and a readable failure for a malformed SAI marker.

## What Changes

- New shared helper `sai/tools/backlog-process.js`: `runProcess` runs one external process through `spawnSync` with a per-process limit of 120 s (`PROCESS_TIMEOUT_MS`), killed with `SIGKILL` when exceeded. A process that outlives the limit raises a failure with reason `process-timeout` whose message names the stalled step and the limit and states that nothing is reported as loaded or written by that step. A process that already exited with a status while a descendant still holds its output pipe is treated as finished. Every other outcome is returned to the caller unchanged. `stepLabel` builds the step name from the program and its first two non-option arguments, never from the interpreter path or data arguments. The limit is a parameter that defaults to 120 s.
- `sai/tools/from-backlog.js`: the Windows Azure CLI lookup (`locate Azure CLI`), `run`, and `runAzureSdk` (`Azure SDK <client> <method>`) go through `runProcess`. Azure CLI and Azure SDK child processes receive `AZURE_CORE_COLLECT_TELEMETRY: 'no'` beside `AZURE_EXTENSION_USE_DYNAMIC_INSTALL: 'no'` in their own environment only. The Azure CLI runtime and the `az extension show` result are kept in module memory after a successful lookup, so one invocation runs each lookup once; a failed lookup is not kept. A timeout during the extension lookup is reported as `process-timeout`, not as `extension-unavailable`. `resetAzureMemory` is exported for tests.
- `sai/tools/to-backlog.js`: `run` sends `gh`, `glab`, and `git` through `runProcess` with a step label, and a `failure_before_publication` output now carries the failure `reason` when the error has one.
- `sai/tools/backlog-slice-identity.js`: new `slicesOf(value, subject)` returns the `slices` array of a decoded SAI marker or throws a readable failure naming the issue or work item when the array is missing, not an array, or holds a non-object entry. `decode(body, subject)` reports a marker that cannot be read with the issue or work item it was read from.
- Every reader of a SAI marker's `slices` calls `slicesOf` and passes the issue or work item to `decode`: `backlog-assignment-github.js`, `backlog-provider-import.js`, `backlog-provider-set.js`, `backlog-set-origin.js`, `backlog-set-update.js`, `from-backlog-github.js`, `from-backlog-gitlab.js`, and `to-backlog-github.js`. An import that meets an unreadable marker records the source as incomplete.
- Tests: `test/backlog-process.test.js` covers the limit, the timeout failure and its step label, a detached descendant that holds stdout open, the telemetry environment, the single runtime and extension lookup, the extension-lookup timeout, and the malformed-marker failures; `test/azure-publication-corrections.test.js` resets the Azure memory between cases.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `backlog-publication`: every external process the backlog tools start is bounded by the same 120 s per-process limit and fails readably with reason `process-timeout` naming the stalled step.
- `azuredevops-backlog-publication`: Azure CLI and Azure SDK publication processes are bounded, run with telemetry disabled in their own environment, and resolve the CLI runtime and extension once per invocation.
- `from-backlog-azure-devops`: Azure DevOps reads are bounded by the per-process limit and fail readably naming the stalled step.
- `backlog-slice-lifecycle`: a SAI marker without a usable `slices` array fails readably and names its issue or work item instead of crashing.

## Impact

- New files: `sai/tools/backlog-process.js`, `test/backlog-process.test.js`.
- Modified files: `sai/tools/backlog-assignment-github.js`, `sai/tools/backlog-provider-import.js`, `sai/tools/backlog-provider-set.js`, `sai/tools/backlog-set-origin.js`, `sai/tools/backlog-set-update.js`, `sai/tools/backlog-slice-identity.js`, `sai/tools/from-backlog-github.js`, `sai/tools/from-backlog-gitlab.js`, `sai/tools/from-backlog.js`, `sai/tools/to-backlog-github.js`, `sai/tools/to-backlog.js`, `test/azure-publication-corrections.test.js`.
- The limit is a fixed constant in code; it is not configurable through project settings.
- The root cause of the original stall stays unconfirmed: the change bounds it rather than proves it. A legitimate external process that needs more than 120 s fails and must be retried, or the constant changed in code.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Unverified hypotheses from the issue, kept as diagnostic context: Azure CLI on Windows may start a separate telemetry upload process that keeps the inherited output pipe open, and PowerShell stdin (BOM or here-string) may explain the first `query-set` stalls but not the `publish-set` stall. The `process-timeout` failure's step label is the evidence that can confirm or rule out these hypotheses after the change.
