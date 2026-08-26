# Review Step — Resolve Mutation Analysis

Active step: resolve-mutation-analysis. Resolve the Pass 11 activation gate; when it admits the pass, execute the deterministic mutation protocol below. Report the `resolve-mutation-analysis` progress event per the worker contract — completed whether the mutation path runs or is legitimately skipped.

### Mutation Analysis (Pass 11)

Pass 11 runs after passes 1–10. Unlike them it **writes to the working tree** and **runs the test suite**, so it is specified here as a standalone protocol rather than as a read-only Step 2 bullet. It measures test *sensitivity*: whether the suite would actually fail if the diffed production code regressed.

#### Activation Gate

Run pass 11 only when BOTH conditions hold:

1. The diff against the parent branch contains **testable production code** (not docs or config only).
2. The repository contains **at least one test file**.

If either condition is false, emit exactly `Mutation Analysis (Pass 11): skipped — {no testable production code in diff | repository has no test files}. No mutation findings.` using the applicable reason, emit no mutation findings, and do not mutate any production file.

If the activation gate admits the pass but the diff-scoped production-code set contains no eligible mutation targets, emit exactly `Mutation Analysis (Pass 11): skipped — no eligible mutation targets. No mutation findings.` and continue without treating the empty target set as a positive result.

#### Mutation Scope

The set of files eligible for mutation is **exactly the production-code files changed in the diff against the parent branch**. Never mutate a file outside that diff.

#### Deterministic Mutation Tool

Inspect the project's manifest files to detect whether a supported deterministic mutation tool is declared as a project dependency:

| Manifest | Tool |
|----------|------|
| `package.json` | Stryker (`@stryker-mutator/core` or a runner package) |
| `pom.xml` / `build.gradle` | PIT (`org.pitest` / the PIT plugin) |
| `pyproject.toml` / `requirements.txt` | mutmut |
| `go.mod` | go-mutesting |
| `Cargo.toml` | cargo-mutants |
| `CMakeLists.txt` | mull |

A tool counts as available **only when its package is declared as a project dependency**. If a tool is detected, run that tool with its checked-in project configuration, pass the exact eligible diff files through the engine's mutation-scope option (`--mutate` for Stryker), and parse its report. This is the only mutation path; mutation results must come from the tool's real execution and never from inference. If no supported tool is declared in any manifest, report `Mutation Analysis (Pass 11): unavailable — no deterministic mutation tool declared. No mutation findings.` and continue the review without mutating files or simulating results. If the declared tool cannot execute or its result cannot be parsed, report the concrete failure and emit no mutation findings.

#### Deterministic Execution and Outcomes

Run the declared tool's configured test command and let the engine own baseline execution, mutation application, timeout, revert, and result collection. Restrict the engine to the eligible diff files; never apply a hand-authored or inferred mutation. Parse the engine's report and hand its surviving or impediment outcomes to Step 4. If execution fails, the baseline is failing, or the report is unavailable, record that deterministic limitation and emit no mutation findings. Never replace a missing tool result with model-generated evidence.

Preserve the engine-native status for every mutation. For Stryker, `Killed` is internal with no finding; `Survived`, `Timeout`, and `NoCoverage` become High mutation findings; `CompileError`, `RuntimeError`, and `Ignored` are engine impediments with no inferred finding or severity. An unknown status makes the report unparseable and therefore unavailable. The aggregate native-status counts must reconcile to the total mutations reported by the engine.
