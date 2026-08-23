# Review Step — Resolve Mutation Analysis

Active step: resolve-mutation-analysis. Resolve the Pass 11 activation gate; when it admits the pass, execute the mutation protocol below. Report the `resolve-mutation-analysis` progress event per the worker contract — completed whether the mutation path runs or is legitimately skipped.

### Mutation Analysis (Pass 11)

Pass 11 runs after passes 1–10. Unlike them it **writes to the working tree** and **runs the test suite**, so it is specified here as a standalone protocol rather than as a read-only Step 2 bullet. It measures test *sensitivity*: whether the suite would actually fail if the diffed production code regressed.

#### Activation Gate

Run pass 11 only when BOTH conditions hold:

1. The diff against the parent branch contains **testable production code** (not docs or config only).
2. The repository contains **at least one test file**.

If either condition is false, emit exactly `Mutation Analysis (Pass 11): skipped — {no testable production code in diff | repository has no test files}. No mutation findings.` using the applicable reason, emit no mutation findings, and do not mutate any production file. An undetermined test command is a separate Tier-2 outcome, not an activation-gate reason.

#### Mutation Scope

The set of files eligible for mutation is **exactly the production-code files changed in the diff against the parent branch**. Never mutate a file outside that diff.

#### Tier 1 — Mutation Tool Auto-Detection

Inspect the project's manifest files to detect whether a supported mutation tool is declared as a project dependency:

| Manifest | Tool |
|----------|------|
| `package.json` | Stryker (`@stryker-mutator/core` or a runner package) |
| `pom.xml` / `build.gradle` | PIT (`org.pitest` / the PIT plugin) |
| `pyproject.toml` / `requirements.txt` | mutmut |
| `go.mod` | go-mutesting |
| `Cargo.toml` | cargo-mutants |
| `CMakeLists.txt` | mull |

A tool counts as available **only when its package is declared as a project dependency**. If a tool is detected, **run it, parse its surviving mutants, and SKIP the Tier-2 LLM-as-mutator path entirely**. If no supported tool is declared in any manifest, fall back to Tier 2.

#### Tier 2 — Test Command Auto-Detection

Under Tier 2, detect the project's test command from the same manifests:

| Source | Test command |
|--------|--------------|
| `scripts.test` in `package.json` | the declared script (Node) |
| `pom.xml` / `build.gradle` | `mvn test` / `gradle test` (JVM) |
| `pyproject.toml` / `requirements.txt` | `pytest` (Python) |
| `go.mod` | `go test ./...` (Go) |
| `Cargo.toml` | `cargo test` (Rust) |

The detected command is used for the baseline pass and every per-mutation run (subject to the 60-second timeout). If **no** test command can be detected, report in `review.md` that mutation analysis could not run due to an undetermined test command, emit **no** mutation findings, and stop pass 11.

#### Tier 2 — Baseline and Per-Mutation Safety Protocol

Before any mutation, run the detected test command once as a **baseline**. If the baseline does **not** pass, apply no mutations and report the baseline failure instead of mutation findings.

The main agent (frontier tier) decides **which** mutations to apply and **what** each mutation is — this synthesis is never delegated. The mechanical apply/test/revert/verify I/O is delegated per the Subagent Dispatch Contract below. For **each** mutation, the executing subagent MUST follow this protocol in order:

1. **Pre-check** — confirm `git status --porcelain {file}` is empty. If it is non-empty (dirty), do **not** mutate that file; record the mutation as **pre-check-failed** and ask the user to commit or undo the changes to that file.
2. **Apply** the mutation to `{file}`.
3. **Test** — run the detected test command with a **60-second timeout**. A run that exceeds the timeout counts as a non-passing test, so the mutation is treated as **killed** (the regression is caught — the suite did not pass within the bound).
4. **Revert** — restore the file with the **file-scoped** command `git checkout -- {file}`. Never use a project-wide revert (`git reset`, bare `git checkout`).
5. **Verify revert** — confirm `git diff {file}` is empty. If it is non-empty, record the mutation as **revert-failed**.

Each mutation ends in exactly one outcome: **killed** (a test failed → no finding, internal only), **survived** (all tests passed → High), **pre-check-failed** (High), or **revert-failed** (Critical, plus a working-tree-pollution warning printed to the user).

#### Revert-Failure Cascade

If a mutation is revert-failed, **continue** dispatching subsequent batches. The per-file pre-check on later batches naturally records any file left dirty by the failed revert as **pre-check-failed**, so the downstream effect stays visible rather than hidden.

#### Subagent Dispatch Contract

Delegate the apply/test/revert/verify I/O to the write-capable cheap tier — the **`budget-subagent`** skill (per-harness binding; `model` and `subagent_type` resolved by the installed skill). This is the **only** place in the review flow that uses a write-capable subagent; every other pass uses read-only `budget-explorer`. **Do not "normalize" it back to `budget-explorer`.**

- One subagent per **batch** of mutations.
- Each batch contains **at most 5–6 mutations**, so the subagent stays within its ~30 tool-call soft cap.
- Dispatch batches **sequentially**, never in parallel — concurrent working-tree edits collide.
- The subagent output contract MUST return **one result per assigned mutation** (outcome ∈ {killed, survived, pre-check-failed, revert-failed}); no assigned mutation may be silently dropped.

The aggregate over all batches MUST satisfy `survived + killed + preCheckFailed + revertFailed == totalMutations` (the total the main agent decided on). Hand the surviving / pre-check-failed / revert-failed outcomes to Step 4 for rendering per the Mutation Analysis output section.
