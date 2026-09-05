> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: medium (S1 = 3 capabilities in 2–3; S2 = 7 requirements in 4–10; S5 = 6 impact paths in 3–8; no breaking change, no new dependency)

## Why

`sai/policies/prereqs-check.md` described three mechanical preconditions in English: a binary on PATH, a directory on disk, and one regex over `openspec/config.yaml`. Every invocation of every openspec-dependent `sai-*` command paid a subagent to read that prose and re-derive the same three decisions. The mechanics are three lines of code; the model was re-interpreting them on a path that runs silently, on every invocation, with no user request behind it — which is exactly where drift is least visible and least affordable.

Delegating a deterministic check to a cheaper model is not the same as making it deterministic. This change makes it deterministic: the checks are decided by code, and the prose keeps only what it is actually good at — owning the exact words a user sees when a check fails.

## What Changes

- Added `sai/tools/prereqs.js`, the deterministic preflight engine, following the pattern `check-delta-headers.js` and `worktree.js` established. One sub-command, `check`, evaluates the three preconditions in the fixed order `cli` → `dir` → `schema` and stops at the first failure. It accepts `--json` and a `--cwd` project-root anchor, and returns closed exit codes: 0 = `verdict: pass`, 1 = `verdict: halt` (with `failed_check`, `reason`, and a factual `message`), 2 = usage error or IO failure.
- The `cli` check probes the binary by running `openspec --version` and reading its exit status, rather than by locating a file on PATH. On win32 the probe runs through a shell, because an npm-installed `openspec` is a `.cmd` shim that a direct `spawnSync` cannot execute — a direct spawn would report a perfectly installed CLI as missing and halt every command. The arguments are fixed literals, so the shell hop introduces no quoting hazard.
- The tool carries no remediation text. Its payload names which check failed and what it observed; the caller owns the phrasing. A test asserts that none of the three STOP literals appears anywhere in the tool's serialized output.
- Rewrote `sai/policies/prereqs-check.md` to delegate rather than describe. It carries a per-harness ordered list of verbatim tool-path candidates (project-local root before user-global; on opencode, an `opencode debug paths` probe as the only fallback for a non-default XDG root), the single byte-identical invocation `node <tool-path> check --json --cwd <project-root>` so one whitelist entry per root covers it, the exit-code-to-verdict mapping, and a numbered map from `failed_check` (`cli`, `dir`, `schema`) to the three remediation literals — which remain byte-identical to their pre-change form. It instructs the reader not to run the checks themselves, not to second-guess a verdict, and not to repair one.
- Rewrote the prerequisite delegation paragraph in `sai/commands/explore/body.md`. The budget subagent now runs the tool once and reports what it returned; the prompt carries the candidate list, the invocation, the exit-code mapping, and the three literals with the `failed_check` each belongs to. The subagent is forbidden from re-deriving, second-guessing, or repairing a check in prose and from self-correcting a non-zero tool failure: exit 2, an unlocatable tool, or an unparseable payload is reported as envelope `status: failed`, never as `verdict: pass` and never as a halt with an invented literal.
- Added `test/prereqs-tool.test.js`: the schema regex against its near misses, the halt payload and its exit 1, the caller-owns-the-phrasing property, the exit-2 usage surface, the `--help` exit-code documentation, the three literals' byte-identity in the policy, and the explore body's use of the tool.

Implemented behavior not named in the statement of intent, recorded here as implemented behavior only: the ordered short-circuit at the first failing check; a one-line human-readable verdict when `--json` is absent; the `--help`/usage surface with its exit codes (0 for `--help`, 2 for a bare invocation, an unknown sub-command, an unknown flag, a stray positional, or a missing `--cwd` directory); a per-check `checks` array in the pass payload carrying the reported CLI version; and the AGENTS.md registry and prerequisite-paragraph updates.

Structural repair carried in the same staged set, not a behavioral contribution of this change: `openspec/specs/prereq-verification/spec.md` was a raw delta a past sync had written verbatim as a main spec, so it failed `openspec validate` with "Spec must have a Purpose section" and would have blocked archive. Its title, `## Purpose`, and `## Requirements` headings were added and the empty `## MODIFIED`/`## REMOVED` scaffolding removed, under explicit user authorization, with the requirement text deliberately untouched. The content change to that requirement is recorded by this change's MODIFIED delta, not by the repair.

## Capabilities

### New Capabilities

- **prerequisite-preflight** — the deterministic OpenSpec prerequisite preflight: the `check` sub-command surface, the ordered first-failure verdict, the JSON and exit-code output contract, the caller-owned remediation boundary, the win32 shell hop for the CLI probe, the tool-path candidate resolution rule, and the subagent's no-self-correction obligation.

### Modified Capabilities

- **prereq-verification** — `sai/policies/prereqs-check.md` no longer instructs the reading agent to run a verification command. `openspec --version` survives as the by-hand command named in the `cli` remediation mapping, and as the probe the tool itself runs; the platform-agnostic constraint is unchanged.
- **prereqs-file-decomposition** — the executable-check artifact keeps the three checks and their byte-identical stop messages under a numbered `failed_check` mapping, but its check prose is a delegation to the tool rather than the pre-change wording it previously pinned.

## Impact

- New files: `sai/tools/prereqs.js`, `test/prereqs-tool.test.js`
- Modified files: `sai/policies/prereqs-check.md`, `sai/commands/explore/body.md`, `AGENTS.md`
- Structurally repaired file: `openspec/specs/prereq-verification/spec.md`
- New capability specs: `openspec/specs/prerequisite-preflight/spec.md`
- Modified capability specs: `openspec/specs/prereq-verification/spec.md`, `openspec/specs/prereqs-file-decomposition/spec.md`
- Distribution: none. The `sai-tools` projection rule already installs every `sai/tools/*.js` into both harness roots as managed, content-tracked files; `prereqs.js` is covered by it on arrival and no manifest change was needed.
- Operational: no wrapper's `allowed-tools` was changed and no `permission.bash` entry was added to the installer merge, so each `node <tool-path> check …` invocation prompts until the user whitelists the stable prefix themselves.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

Implementation evidence — the staged diff against base `6bebf0e592cf8e1d7d63ed6594e17783e9f7e1da` on branch `worktree-4`:

- `sai/tools/prereqs.js` — the new engine; `commandCheck`, `checkCli`, `checkDir`, `checkSchema`, `run`, `parseArgs`, and the exported surface were read directly rather than taken from the change description.
- `sai/policies/prereqs-check.md` — the rewritten consumer: the candidate ladder, the invocation form, the verdict handling, and the three literals verified byte-for-byte against their pre-change form in the diff.
- `sai/commands/explore/body.md` — the delegation prompt and the extended verdict output contract.
- `AGENTS.md` — the `sai/tools/` registry row and the "Prerequisite check" paragraph.
- `test/prereqs-tool.test.js` — the behavior the change asserts about itself.

Existing contracts consulted to decide what this change invalidates:

- `openspec/specs/prereq-verification/spec.md` — invalidated; MODIFIED delta emitted.
- `openspec/specs/prereqs-file-decomposition/spec.md` — invalidated; MODIFIED delta emitted.
- `openspec/specs/explore-prereqs-delegation/spec.md` — read in full; extended, not contradicted. No delta.
- `openspec/specs/halt-message-fidelity/spec.md` — read in full; the three literals and the dispatch-failure rule survive unchanged. No delta.
- `openspec/specs/prereqs-composition-compatibility/spec.md` — read in full; the router entry is untouched. No delta.
- `openspec/specs/sai-tools-distribution/spec.md` — the projection rule pre-exists this change. No delta.

Contracts consulted while composing and validating this proposal:

- `openspec/schemas/sai-workflow/schema.yaml` — the proposal artifact's required `**Complexity**` line and its `## Proposal Research Documentation` and `## Additional Notes` sections.
- `sai/commands/spec/steps/validation.md` — the `## Complexity Derivation Rubric` used for the `**Complexity**` token above.
- `openspec/changes/archive/2026-09-05-project-sai-tools-and-extract-worktree/proposal.md` — the conforming post-hoc precedent for this shape, and the preceding slice this one follows.

No external URL was consulted; every source is in-repository.

## Additional Notes

- **Delegating a deterministic check to a cheaper model is not the same as making it deterministic.** The preceding arrangement already moved the three checks off the main agent; it did not stop them from being re-derived. What this change removes is the interpretation, not the dispatch. The subagent hop remains, and its cost is dominated by the agent's own preamble rather than by the work.
- **The executor stays the invocation point on purpose.** This runs on every invocation of every openspec-dependent command, silently, with no user request behind it — the one path where a permission prompt would be intolerable. Direct invocation from each coordinator was considered and rejected for exactly that reason.
- **The remediation literals never enter the tool.** They are the one part of the check that is genuinely prose, and they stay owned by the caller and emitted verbatim. The tool reports which check failed; it does not know how to phrase the fix, and a test enforces that it never learns.
- **Folding prereqs into the worktree tool was considered and rejected.** `/sai-worktree` deliberately has no OpenSpec preconditions, and a shared tool would invite the new preflight to leak into the commands that deliberately lack one. It remains a separate tool for a separate obligation.
- **The win32 shell hop is a correctness fix, not a convenience.** An npm-installed `openspec` on Windows is a `.cmd` shim; a direct `spawnSync` cannot execute it and would report a correctly installed CLI as missing, halting every command on the machine.
- **Two claimed boundaries are recorded here rather than specified.** That `/sai-worktree` still runs no OpenSpec checks (E7) and that no `allowed-tools` or `permission.bash` entry was touched (I3) are both evidenced only as absences in the diff. Under the fast-track path no reconciliation question was asked, so neither was confirmed as a deliberate preservation and neither entered a normative requirement.
