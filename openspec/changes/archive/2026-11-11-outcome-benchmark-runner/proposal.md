> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

SAI measures what a run costs (`sai/tools/retrospective.js`, `docs/measurements/planning-baseline-2026-10-30.md`) but not whether the result is correct, so harness and model changes are judged by desk reasoning instead of data. This change adds an outcome benchmark: it runs fixed implementation briefs through the real SAI routes, each run in its own container, judges every run with a hidden black-box acceptance suite, and reports accepted-run counts and wall time per configuration.

## What Changes

- New repository-only CLI `bin/benchmark.js` with three commands: `validate <corpus>`, `run <corpus> --out <folder> [--rounds <n>]`, and `report --out <folder>`. `sai/install-manifest.json` projects it to no harness.
- New library folder `benchmark/`:
  - `corpus.js` loads and validates a corpus (`benchmark.json`, `project/`, `briefs/<id>/` with `block.md`, `plan/`, and `acceptance/suite.json`) and collects every problem before any run starts. The mandatory per-run time limit, the configurations (id, harness, route, credential variable names, models per worker role with the harness's own tunable keys), the rounds (default 10, overridable with `--rounds`), and the price table shape (date plus per-model input and output prices) are checked. A configured model without a price is valid.
  - `docker-backend.js` is the replaceable execution backend: it builds the `sai-benchmark` image once, starts one fresh container per run, copies the base project and either the fixed plan (plan route) or the brief block (Direct Build route), installs SAI, launches the harness CLI under the run's time limit, copies the hidden suite in only after the agents end, runs it, and always removes the container.
  - `container-setup.js` runs inside the container: it installs the mounted checkout's SAI for one harness, writes the configuration's models as agent-file tunables in the project, and records the project as a git baseline.
  - `classify.js` classifies a run as `accepted`, `rejected`, `escalated`, `timeout`, or `error` from the harness event output, the closing literal of the route's command, and the hidden suite result, and counts cancelled opencode `question` calls.
  - `runner.js` plans paired rounds, saves each run result as soon as it ends, keeps saved runs on a rerun into the same output folder, and refuses an output folder inside the checkout or the corpus.
  - `report.js` writes one Markdown report per configuration from the saved output folder, with provenance, counts, wall time, infrastructure errors listed apart, and a per-run table.
  - `Dockerfile` defines the run image with Node, git, the `openspec` CLI, `claude`, and `opencode`, running as an unprivileged user.
- New documentation `docs/benchmark.md`, and two `AGENTS.md` repository-structure rows for `bin/benchmark.js` and `benchmark/`.
- New tests `test/benchmark.test.js` with a minimal fixture corpus (`test/fixtures/benchmark-corpus/`) and a simulated backend (`test/helpers/benchmark-simulated-backend.js`) that reproduces the observed harness outputs, so the tests need no Docker and no model.
- Scope drift (implemented, not named in the intent statement): the documentation pages above; a rerun into the same output folder continues an interrupted benchmark; the commit recorded in the report carries a `+dirty` mark when the checkout has uncommitted changes; briefs rotate between rounds; a harness error event in the output classifies the run as `error`.

## Capabilities

### New Capabilities

- `outcome-benchmark`: run configurations over a private corpus in isolated containers, classify each run, and report outcomes per configuration.

### Modified Capabilities

None.

## Impact

New files:

- `bin/benchmark.js`
- `benchmark/Dockerfile`
- `benchmark/classify.js`
- `benchmark/container-setup.js`
- `benchmark/corpus.js`
- `benchmark/docker-backend.js`
- `benchmark/report.js`
- `benchmark/runner.js`
- `docs/benchmark.md`
- `test/benchmark.test.js`
- `test/fixtures/benchmark-corpus/benchmark.json`
- `test/fixtures/benchmark-corpus/briefs/greeting/acceptance/suite.json`
- `test/fixtures/benchmark-corpus/briefs/greeting/block.md`
- `test/fixtures/benchmark-corpus/briefs/greeting/plan/proposal.md`
- `test/fixtures/benchmark-corpus/project/package.json`
- `test/helpers/benchmark-simulated-backend.js`

Modified files:

- `AGENTS.md`

Known limitations and technical debt:

- The route comparison does not separate the value of the plan from the value of the RED/GREEN harness.
- Building and authenticating the container image on a Windows host requires Docker or an equivalent.
- The Direct Build route launches `/sai-direct-build`, which this change does not deliver; until that command exists, configurations use only the plan route.
- The price table is validated for shape only and is not yet used: tokens and tool calls per run are not collected by this change.
- The runner commit and the SAI installation commit are the same checkout commit.
- The `package.json` `files` list includes `bin` but not `benchmark/`, so the npm package ships `bin/benchmark.js` without the library it requires; the runner works only from a checkout.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Part of https://github.com/mmadariaga/shared-ai/issues/412 (outcome benchmark); the issue is closed by the last slice, `sai-direct-build-command`. Until slice 3 lands, configurations use only the `/sai-3-implement` route; the Direct Build route of I3 and I5 arrives with `sai-direct-build-command`.
