> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

SAI tools received structured input (event JSON, payloads, commit messages, issue text, reports) on standard input, and instructions prescribed stdin pipes or heredocs. A proof of concept under a `node <tool> *`-only permission rule showed that no stdin form works on both harnesses with JSON: Claude Code denies a heredoc whose body has a brace beside a quote, and opencode denies the `echo` pipe and corrupts heredoc JSON (10 bytes received for 8 sent). Structured input is data, so it now travels as a file, the same way Ready to Propose block files already do (ADR 0207).

## What Changes

- New shared reader `sai/tools/input-reader.js`: resolves `--input-file <path>` (or `--input-file=<path>`) first and falls back to stdin; reads the file's bytes unchanged as UTF-8; rejects a missing path or a repeated flag; a missing, unreadable, or empty file is an `InputFileError` that names the path.
- Tools that read structured input now accept `--input-file <path>` through the reader and keep accepting stdin: `bin/sai-state.js` `emit` (event, `--progress`, and `--ready-to-propose` forms; a bad input file exits 2 with "no transition occurred"), `worker-report-validator.js`, `validate-backfill-drafts.js`, `tool-access.js`, `ready-to-propose.js` (`check`, `hash`, `dependencies`, `attach-origin`, `convert`), `commit.js apply`, `from-backlog.js`, `from-next-backlog-item.js select`, `to-backlog.js`, `to-pr.js`, `new-change-branch.js`, `transfer.js put`, `merge.js` (`valid`, `collision`, `correction`; `--input-file` and `--input` are mutually exclusive), and `skills/universal/sai-cache-warmer/wait.js` (`prepare`, `wait`, and the JSON form of `warm`). Usage and help texts name the input-file form.
- `wait.js warm` gains an argv form: `warm --interval <n> --max <n> [--chain <id>]` arms a wait and `warm --state <token> [--interval <n>]` re-arms it. Each result carries `state_token`, the state as one base64url token with no brace or quote, so an agent with no write access can arm and re-arm without typing JSON.
- Instructions prescribe the input-file form: `sai/policies/tool-resolution.md` § Invocation states the rule once (a `transfer.js open` directory, a unique file per call written with the native file-write tool, outside the repository, closed with `transfer.js close`). `sai/policies/stage-machine.md` (canonical example, CLI entries, § Event delivery), `sai/policies/command-execution.md` (`commit.js apply`; only a direct `git commit -F -` keeps the stdin procedure), `sai/policies/direct-build-report-transport.md`, `sai/policies/backlog-*`, `sai/commands/backfill/worker.md`, `sai/commands/merge/mechanics.md`, the explore, plan, implement, commit, review, audit, and merge cards, and the from-backlog, from-next-backlog-item, to-backlog, to-pr, new-change-branch, and sai-cache-warmer skills follow it. `sai/policies/cache-warming.md` prescribes the argv `warm` form and the `--state <state_token>` re-arm.
- Capability registry: `write` accepts the scoped value `"temp"`. `bin/capabilities.js` compiles it to native writes limited to the SAI temp root: on Claude Code the `Write` tool without `Edit` and one `Write(//<temp root>/**)` allowed entry; on opencode one `edit` allow rule for `<temp root>/*` plus the external-directory rules. `coordinator`, `worker-read`, `commit-command` (previously `write: false`), `to-backlog-command`, `from-backlog-command`, `to-pr-command`, `new-change-branch-command`, and `cache-warmer-command` declare it; `coordinator`, `from-backlog-command`, `from-next-backlog-item-command`, and `cache-warmer-command` gain a `transfer.js open` shell rule. The `research` profile (budget-explorer) keeps no write grant and no `transfer.js` rule.
- Tests: new `test/input-file-delivery.test.js` (flag parsing, exact bytes, missing and empty files, validator parity with stdin, per-tool acceptance, commit and emit failures without state change, `transfer.js put` and `merge.js`); `test/read-only-shell-grants.test.js` gains scoped-write, explorer-without-write, and fail-closed cases; existing tests updated for the new forms and grants.

Scope drift (not an implementation error): `transfer.js put` and `merge.js` accept `--input-file`. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): `wait.js warm` has an argv arm and re-arm form with an opaque `state_token`, and `cache-warming.md` prescribes it instead of an input file. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): `to-backlog.js`, `to-pr.js`, and `new-change-branch.js` read their JSON through the shared reader. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): the `coordinator`, `worker-read`, and `commit-command` profiles receive the scoped temp write, and the coordinator profile gains a `transfer.js open` rule. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `tool-input-file-delivery`: the shared input reader, `--input-file` acceptance with stdin kept, exact bytes, failure without state change for an unusable input file, and instructions that prescribe the input-file form.

### Modified Capabilities

- `contract-tool-capabilities`: the scoped `write: "temp"` grant and its compilation on both harnesses; temp-scoped writes and `transfer.js open` grants in the affected profiles; the explorer keeps no write grant.
- `stage-machine-emit-delivery`: the canonical event and progress emit forms use `--input-file`.
- `stage-machine-cli-interface`: `emit` reads its event from `--input-file` when given, keeps stdin, and exits 2 naming the path for an unusable input file.
- `block-file-delivery`: non-block events and the conversion input travel as input files.
- `explore-issue-intake`: `ready-to-propose.js convert` receives the issue text as an input file.
- `commit-apply`: `apply` takes the message as an input file and still accepts stdin.
- `routed-commit-command`: the coordinator runs `commit.js apply` with the worker-authored message in an input file.
- `commit-command-prose`: the coordinator forwards the authorized message as an input file.
- `transfer-file-transport`: `put` accepts `--input-file`.
- `agent-self-warming`: arming uses the argv `warm --interval --max` form and re-arming uses `--state <state_token>`, including the hand-off wait.

## Impact

New files:
- `sai/tools/input-reader.js`
- `test/input-file-delivery.test.js`

Modified files:
- `AGENTS.md`
- `bin/capabilities.js`
- `bin/sai-state.js`
- `sai/commands/audit/coordinator.md`
- `sai/commands/backfill/worker.md`
- `sai/commands/commit/coordinator.md`
- `sai/commands/explore/steps/crystallization-protocol.md`
- `sai/commands/explore/steps/issue-intake.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/merge/coordinator.md`
- `sai/commands/merge/mechanics.md`
- `sai/commands/plan/cycle.md`
- `sai/commands/review/coordinator.md`
- `sai/install-manifest.json`
- `sai/policies/backlog-implementation-start.md`
- `sai/policies/backlog-origin-transport.md`
- `sai/policies/cache-warming.md`
- `sai/policies/command-execution.md`
- `sai/policies/direct-build-report-transport.md`
- `sai/policies/explore-agent.md`
- `sai/policies/stage-machine.md`
- `sai/policies/tool-resolution.md`
- `sai/tools/commit.js`
- `sai/tools/from-backlog.js`
- `sai/tools/from-next-backlog-item.js`
- `sai/tools/merge.js`
- `sai/tools/new-change-branch.js`
- `sai/tools/ready-to-propose.js`
- `sai/tools/to-backlog.js`
- `sai/tools/to-pr.js`
- `sai/tools/tool-access.js`
- `sai/tools/transfer.js`
- `sai/tools/validate-backfill-drafts.js`
- `sai/tools/worker-report-validator.js`
- `skills/universal/from-backlog/SKILL.md`
- `skills/universal/from-backlog/providers/azuredevops.md`
- `skills/universal/from-backlog/providers/github.md`
- `skills/universal/from-backlog/providers/gitlab.md`
- `skills/universal/from-next-backlog-item/SKILL.md`
- `skills/universal/new-change-branch/SKILL.md`
- `skills/universal/sai-cache-warmer/SKILL.md`
- `skills/universal/sai-cache-warmer/wait.js`
- `skills/universal/to-backlog/create.md`
- `skills/universal/to-backlog/providers/github-update.md`
- `skills/universal/to-backlog/providers/github.md`
- `skills/universal/to-backlog/providers/gitlab-update.md`
- `skills/universal/to-backlog/providers/gitlab.md`
- `skills/universal/to-pr/SKILL.md`
- `test/backlog-slice-provider-parity.test.js`
- `test/cache-warmer.test.js`
- `test/capability-profiles.test.js`
- `test/claude-default-preset-alignment.test.js`
- `test/from-backlog-azuredevops.test.js`
- `test/from-backlog.test.js`
- `test/from-next-backlog-item.test.js`
- `test/merge-incremental-collision.test.js`
- `test/portable-command-execution.test.js`
- `test/read-only-shell-grants.test.js`
- `test/sai-state-progress-emit.test.js`

Every structured-input call now costs one native write plus the tool call. Stdin stays accepted, so two input paths exist until older instructions are gone. Profiles with `write: "temp"` can create files in the SAI temp root without a prompt; on Claude Code the agent `Write` tool stays in the pool, and only writes inside the temp root are pre-approved.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Undecided: the exact path-scoped rule syntax for the SAI temp root on each harness (Claude `Edit`/`Write` path rules, opencode `edit` resource and external_directory), which affects I3; it was not verified during exploration.
