# Review Step — Resolve Mutation Analysis

Active step: resolve-mutation-analysis. Pass 12 measures test *sensitivity*: whether the suite would fail if the diffed production code regressed. The step is done when exactly one Pass 12 outcome is recorded — a note below or a parsed engine report — whether the mutation path ran or was legitimately skipped; then report the `resolve-mutation-analysis` progress event per the worker contract.

"Record" below means keep the outcome for the report; the close step renders it into `review.md`. Every note below is exact text, and each one means no mutation findings.

## Activation gate

Run Pass 12 only when BOTH hold:

1. The diff against the parent branch contains **testable production code** (not docs or config only).
2. The repository contains **at least one test file**.

When either fails, record `Mutation Analysis (Pass 12): skipped — {no testable production code in diff | repository has no test files}. No mutation findings.` with the applicable reason, and mutate nothing.

## Mutation scope

The eligible targets are exactly the production-code files changed in the diff against the parent branch; nothing outside the diff is ever mutated. When the gate admits the pass but no file is eligible, record `Mutation Analysis (Pass 12): skipped — no eligible mutation targets. No mutation findings.`

## Deterministic engine

A supported engine counts as available only when its package is declared as a project dependency:

| Manifest | Engine |
|----------|--------|
| `package.json` | Stryker (`@stryker-mutator/core` or a runner package) |
| `pom.xml` / `build.gradle` | PIT (`org.pitest` / the PIT plugin) |
| `pyproject.toml` / `requirements.txt` | mutmut |
| `go.mod` | go-mutesting |
| `Cargo.toml` | cargo-mutants |
| `CMakeLists.txt` | mull |

When none is declared, record `Mutation Analysis (Pass 12): unavailable — no deterministic mutation tool declared. No mutation findings.`

Otherwise run the declared engine with its checked-in project configuration and its configured test command, passing exactly the eligible files through the engine's mutation-scope option (`--mutate` for Stryker). The engine owns the baseline, mutation application, timeouts, reverts, and result collection; every mutation result comes from its real execution. When the run cannot produce results, record the matching note:

- baseline fails — `Mutation Analysis (Pass 12): unavailable — deterministic baseline failed. No mutation findings.`
- the engine cannot execute — `Mutation Analysis (Pass 12): unavailable — deterministic tool execution failed. No mutation findings.`
- the report is absent or cannot be parsed — `Mutation Analysis (Pass 12): unavailable — deterministic report could not be parsed. No mutation findings.`

## Outcome mapping

Map each engine-native status onto the canonical statuses by meaning, and keep the native status beside it in the report:

| Canonical | Meaning | Examples | Report as |
|-----------|---------|----------|-----------|
| `Killed` | a test failed on the mutant | Stryker `Killed`, PIT `KILLED`, cargo-mutants `caught` | internal, no finding |
| `Survived` | every test passed on the mutant | PIT `SURVIVED`, cargo-mutants `missed` | High mutation finding |
| `Timeout` | the test run exceeded its bound | PIT `TIMED_OUT`, cargo-mutants `timeout` | High mutation finding |
| `NoCoverage` | no test reached the mutant | PIT `NO_COVERAGE` | High mutation finding |
| `CompileError` | the mutant did not build | PIT `NON_VIABLE`, cargo-mutants `unviable` | engine impediment, no finding |
| `RuntimeError` | the engine failed on that mutant | PIT `MEMORY_ERROR`, `RUN_ERROR` | engine impediment, no finding |
| `Ignored` | the engine skipped the mutant | Stryker `Ignored` | engine impediment, no finding |

A status whose meaning matches no row makes the report unparseable: record the parse note above. The canonical counts must reconcile to the engine's reported mutation total.
