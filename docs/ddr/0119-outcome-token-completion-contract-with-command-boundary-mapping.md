# DDR 0119: Outcome-token completion contract with command-boundary mapping

## Status

Accepted

## Context

`bin/setup.js` terminates the process at seven sites (lines 37, 43, 74, 84, 127, 133, and the module guard's rejection path at 146), mixing setup orchestration, prompt handling, and process-status decisions in one module. `bin/install.js`'s `setup` branch (line 23) relies on natural process exit for success, unlike its `uninstall` and `doctor` branches, which map a returned status via `.then(code => process.exit(code))`. The post-setup extension seam (`prepare-setup-menu-seam`) requires exported setup functions that never call `process.exit`, so completion must be communicated as a value instead.

## Decision

`main` completes with exactly one of the outcome tokens `success | aborted | required-failure | post-setup-failure`, classified to preserve the existing exit behavior: interactive declines (first path confirmation, openspec-init decline, schema-line decline — today's exit-0 sites) resolve `aborted`; required-step failures (openspec install offer declined, `openspec init` failure, missing `openspec/config.yaml` — today's exit-1 sites) resolve `required-failure`; an injected workflow rejection after schema copy resolves `post-setup-failure`. `bin/install.js` maps the tokens at the command boundary — `success`/`aborted` → exit 0, `required-failure`/`post-setup-failure` → exit 1 — mirroring the `.then(code => process.exit(code))` shape its `uninstall` and `doctor` branches already use. The module guard maps them the same way for direct `node bin/setup.js` invocation, and its rejection path is preserved. No exported setup function calls `process.exit`.

## Alternatives Considered

- **Keep `process.exit` in the module and add test-only hooks** — rejected: the spec pins exit-free exported functions, and testability would rely on fragile stubbing rather than injected dependencies.
- **Return numeric exit codes from `main`** (the `uninstall-flow`/`doctor` style) — rejected: the spec pins the four named outcome tokens so the CLI boundary can semantically distinguish `aborted` (exit 0) from the two failure classes (exit 1), which numeric codes cannot express.

## Consequences

The command boundary owns process-status handling; the setup module stays exit-free and unit-testable through its injected dependencies. The downstream `add-fake-agent-customization-menu` change consumes the same outcome vocabulary without touching `process.exit`. Tests pin all four outcomes and both boundary mappings. This contract is a domain property — the setup module never terminates the process, and completion is always communicated through exactly one of the four tokens — which is why this record is a DDR.

## Provenance

User — the proposal ("Move process-status handling to the command boundary") and the spec ("`main` SHALL return exactly one of the outcomes… the CLI entry boundary SHALL map…") state the token vocabulary and boundary mapping explicitly.
