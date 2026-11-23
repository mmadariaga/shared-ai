# ADR 0228: Compute the archive plan with a deterministic tool run by the coordinator

## Status

Accepted.

## Context

The archive pre-flight of `/sai-archive` and of the Direct Build archive step (CORE gate, delta-sync summary, capability-retirement detection, collision check, owned staging paths) ran as model turns in the archive worker, although it is a computation. In one measured Direct Build run the archive worker spent 19 requests, 83,530 input tokens, 5,206 output tokens, 7,799 reasoning tokens, and about 2m39s on the read-only prepare stretch, against 9 requests and 6,596 input tokens on execute. The contract text also held two defects: an implementer deletion that was already staged made `git add` fail, and on the no-specs route the pre-move draft destinations were listed as commit paths although they no longer exist after the move.

Running the pre-flight lazily, only after a CLI failure, would remove little: the Direct Build coverage check needs the archive destination and the synced spec paths before the CLI runs, and the `openspec archive --json` result reports `specsUpdated` as a boolean without paths.

A throwaway tool matched `openspec archive` 1.13.0 and git on 12 of 14 fixtures. The CORE-gate fixture differs by design, because that gate belongs to SAI and not to the CLI. The section-below-requirements fixture exposed a gap in the contract text, closed by treating any `##` section other than Purpose and Requirements, above or below the requirements, as unaccounted content. The tool ran in 25-73 ms per fixture.

## Decision

1. **The plan is a tool result.** `sai/tools/archive-plan.js` (`plan <change-name> --json --cwd <root>`, with optional `--implementer-paths-file` or repeatable `--implementer-path`, and `--drafts-dir`) computes the CORE verdict, the AUDIT line, the delta-sync summary, the retired capabilities and the declaration state, the date-prefixed destination and its collision verdict, the affected main specs, the owned staging paths, the already staged deletions, the omitted ignored paths, the covering paths, the closing line and retirement lines of the commit message, and a `plan_fingerprint`. It only reads: it spawns `git` and `check-delta-headers.js`, reads `.openspec.yaml` with a minimal flat-key parser (no new dependency) and refuses any shape it does not recognize, and prints a plan (exit 0), a refusal with its `reason` and a verbatim `summary` (exit 1), or a tooling error (exit 2).
2. **The coordinator runs it.** `/sai-archive` and the Direct Build coordinator run the tool themselves, so no worker turn computes a plan. A refusal is a planned stop with nothing written.
3. **The worker shrinks.** The archive worker has no prepare stretch. On `/sai-archive` it is created only to author the commit message from the staged diff; on Direct Build it is created for the one `--direct-build-execute` order, which carries the plan's fingerprint. The worker re-runs the plan from the order's inputs and executes only when the fingerprint matches. The coordinator computes the plan again right before the order, so a plan that changed (for example, the date passed midnight) rebuilds the order.
4. **The tool decides what the model must not.** The retirement body lines and the issue closing line come from the plan. The commit stages exactly the plan's owned paths: an already staged deletion is not added again and stays in the commit, and on the no-specs route the paths are the archived copies, with ignored files omitted.
5. **The CLI stays the only sync and move primitive.** `openspec archive <name> --yes --json` runs unchanged. A validation the tool does not predict (a requirement without a scenario, for example) fails in the CLI and is reported as the CLI reports it, with no commit. The commit question of `/sai-archive` keeps its options and wording. Claude Code and opencode use the same tool and cards.

## Alternatives Considered

- **Run the pre-flight lazily, only after a CLI failure** — rejected: the Direct Build coverage check needs the destination and the synced spec paths before the CLI runs, and the CLI result gives no spec paths, so the lazy pre-flight would remove little.

## Consequences

- The prepare stretch of the archive worker, which dominated the archive cost of a Direct Build run, no longer exists. The tool answers in milliseconds.
- The pre-flight rules live once, in the tool; the cards point to it. A rule the CLI adds later is not predicted until the tool learns it, and until then it fails in the CLI after a clean plan.
- The tool predicts the CLI and git and does not replace them, so its fixtures run the real `openspec archive` and are skipped when the binary is absent.
- A `.openspec.yaml` outside the minimal shape is refused instead of guessed, which makes a hand-edited file with block lists or anchors fail the plan until it is simplified.

## Provenance

Change `archive-plan-computed-deterministic-tool`, decision "Deterministic plan instead of a lazy pre-flight".
