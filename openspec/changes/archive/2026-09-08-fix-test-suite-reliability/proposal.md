> **⚠ POST-HOC RECORD** — This proposal was reconstructed after implementation from a crystallized `Ready to Propose` block. It describes a decision already made, not one being proposed.

**Complexity**: medium (S1 = 1 capability; S2 = 3 requirements; S5 = 3 affected paths; no breaking change, no new dependency)

## Why

`npm test` was not a reliable verdict: running `node --test` in parallel produced roughly thirty 30 000 ms timeout failures on a single global lock, while serial runs produced zero failures. Separately, the `dot` reporter surfaced only 2 of 8 genuine assertion failures, masking stale assertions from three archived changes that survived their archive gates. The root cause was that `validateOpencodeWorkerBindings` materialized transient binding files into the repository source tree and deleted them again; the lock existed only to stop concurrent processes from deleting each other's transient files.

## What Changes

- `bin/install-flow.js` — Removed lock infrastructure (`OPENCODE_BINDING_VALIDATION_LOCK` constants, `isProcessAlive()`, `reclaimStaleOpencodeBindingValidationLock()`, and `withOpencodeBindingValidationLock()` function and its call sites). Simplified `validateOpencodeWorkerBindings()` to use matrix-derived binding text via the `canonicalBindingText()` fallback without materializing transient files to disk.
- `package.json` — Changed test script from `"node --test"` to `"node --test --test-reporter=spec"` to report every individual failure instead of summarizing failures away.
- `test/install-opencode.test.js` — Repaired the wrapper_echo rejection test (line 194) to provide synthetic binding content on ENOENT through an fs.readFileSync monkeypatch, allowing the poisoned test to reach the text the validator actually uses.

## Capabilities

### New Capabilities

- `test-suite-reliability` — Binding validation is now lock-free and source-tree-safe, and the default test invocation reports all failures faithfully in both serial and parallel execution.

### Modified Capabilities

None.

## Impact

- Modified files: `bin/install-flow.js` (168 net line reduction: 23 insertions, 160 deletions), `package.json`, `test/install-opencode.test.js`.
- No behavior change to any command: the installer still validates bindings identically; only its serialization mechanism changed from lock-based to lock-free.
- Measurement: Before the change, parallel runs produced roughly thirty 30 000 ms lock-timeout failures against zero serial failures. After the change, serial runs report 1438 tests / 1438 pass / 0 fail, and parallel runs report 1438 tests / 1438 pass / 0 fail.

## Proposal Research Documentation

Implementation evidence — staged diff over base `3e0fc513a4369155ab087563c0b387bf7c4a7696`:

- `bin/install-flow.js` — Removed lock constants, `isProcessAlive()`, `reclaimStaleOpencodeBindingValidationLock()`, and `withOpencodeBindingValidationLock()` function entirely. Removed lock calls from `installClaude()` and `installOpencode()`. Simplified `validateOpencodeWorkerBindings()` return statement from conditional lock-wrapping to direct `validate()` call. The `canonicalBindingText()` helper uses fallback on ENOENT without mutation (line 361: `if (error.code === 'ENOENT') return binding.text`).
- `package.json:15` — Changed `"test"` script from `"node --test"` to `"node --test --test-reporter=spec"`.
- `test/install-opencode.test.js:194–217` — Added try-catch around `originalReadFileSync` to provide synthetic binding content when ENOENT occurs for generated bindings, enabling the wrapper_echo poison injection to reach the actual validator text.

Test results consulted:

- Parallel test run (default `npm test` with spec reporter): 1438 tests / 1438 pass / 0 fail.
- Serial test run verification: confirmed identical results (1438 tests / 1438 pass / 0 fail).
- Before-change baseline: parallel runs produced ~30 failures (all 30 000 ms lock timeouts), serial runs produced 0 failures.

No external URL was consulted; every source is in-repository.

## Additional Notes

- **Why treat materialization as the defect, not the lock?** The lock existed only because materialization mutated shared source. Removing the mutation dissolved contention by construction rather than tuning it.
- **Why was materialization proven unobservable?** The code wrote `binding.text`, read it back, and deleted it — exactly what the pre-existing `ENOENT` fallback already returned without mutating anything. No consumer ever relied on the transient file's existence.
- **Why keep both defects in one change?** Both are "the default test command misreports the truth", and fixing only the lock would leave source-mutation unserialized, which is equally wrong.
- **Why repair rather than delete the affected test?** The pre-mutation rejection property it covers (retired wrapper_echo_value) is still real; only its injection vector had to move from disk reads to matrix-derived text.
- **Verification requirements**: The suite now reports identical results in parallel and serial execution. Before this change, the verification note in `openspec/changes/retire-name-only-spec-obligations/proposal.md` correctly identified that "the suite reports false negatives when run in parallel, because the `install`/`doctor` family serializes on a single validation lock." This change resolves that issue.
