# ADR 0025: Blind test-writer receives injected context; implementation dispatch is barred from test files

## Status

Accepted

## Context

The core independence property of the split-dispatch model is that the test-writer must not see the GREEN implementation body while authoring the test. If it did, it could reproduce the implementation's logic — bugs included — as its implicit oracle. The complementary property is that the implementation dispatch must not edit the test, or the mirroring channel reopens at GREEN time.

## Decision

The test-writer dispatch receives only that Step's `interfaces.md` section (signatures + exact assertions) plus the testing-relevant slice of `tasks.md`'s `## Implementation Context` injected by the coordinator — and NOTHING from the GREEN body. The test-writer MAY read existing test files and test infrastructure as a fallback when the injected context is insufficient. The implementation dispatch receives the GREEN body and is **absolutely forbidden** from creating or modifying any test file, even when it believes the test is wrong.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Injected context + existing-test-file fallback (chosen) | Preserves independence (test files don't leak implementation body); avoids unrecoverable invalid-RED when injected context has gaps | Relaxes the "zero research" efficiency goal for the test-writer |
| Hard ban on ALL reads by the test-writer | Maximally blind; strongest independence guarantee | Any gap in injected context becomes an unrecoverable invalid-RED with no self-recovery path |

## Consequences

- The coordinator's prompt-assembly logic must filter out the GREEN body for the test-writer and inject only `interfaces.md` + testing context.
- The implementation dispatch's prohibition is absolute; violating it reopens the mirroring channel.
- Existing test files are the only allowed fallback research for the test-writer.

## Related

- `openspec/changes/consume-interfaces-artifact/design.md` — Decision D3
- `openspec/changes/consume-interfaces-artifact/specs/apply-test-impl-split/spec.md` — "Test-writer is blind to the implementation body", "Implementation subagent cannot modify test files"
- `sai/instructions/apply.md` — `## Step-Execution Subagent Dispatch` sections for test-writer and implementation
