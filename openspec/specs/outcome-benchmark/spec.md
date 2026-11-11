# outcome-benchmark Specification

## Purpose
TBD - created by archiving change outcome-benchmark-runner. Update Purpose after archive.

## Requirements

### Requirement: Repository-only benchmark runner

The outcome benchmark SHALL run from a `shared-ai` checkout through `bin/benchmark.js`, which offers the commands `validate <corpus>`, `run <corpus> --out <folder> [--rounds <n>]`, and `report --out <folder>`. `sai/install-manifest.json` SHALL project the runner to no harness. An unknown option, an option without its value, or a wrong number of positional arguments SHALL stop the command with its usage text.

#### Scenario: Unknown option stops the command

- **WHEN** `bin/benchmark.js` receives an option other than `--out` or `--rounds`
- **THEN** it stops with a message naming the option and the usage text, and runs nothing

### Requirement: Corpus validation before the first run

The runner SHALL validate the whole corpus before it builds any backend or launches any run: `benchmark.json` with a non-empty corpus identifier, a mandatory positive per-run time limit, at least one configuration, unique configuration ids, and a price table with a `YYYY-MM-DD` date and a per-model input and output price; a `project/` folder; and a `briefs/` folder whose every brief holds a `block.md` with a `Change name` line, a non-empty `plan/` folder, and an `acceptance/suite.json` with a non-empty command. Each configuration SHALL name a supported harness (`claude` or `opencode`), a route (`plan` or `direct-build`), the names of its credential environment variables, and a model for at least one worker role of that harness, using only that harness's tunable keys (`model` and `effort` on Claude Code, `model` and `variant` on opencode). Every problem found SHALL be reported together in one stop. The price table SHALL be checked for shape only, so a configured model without a price is valid.

#### Scenario: Missing time limit stops the benchmark before anything launches

- **WHEN** `benchmark.json` has no positive integer `timeLimitSeconds`
- **THEN** the runner stops before building any backend, naming that problem together with every other problem it found

#### Scenario: Configured model without a price is valid

- **WHEN** a configuration names a model that the price table does not list
- **THEN** the corpus validates

### Requirement: Paired rounds

The runner SHALL run every configuration on the same brief in each round, rotating the briefs between rounds. The number of rounds SHALL default to 10, SHALL be overridable by `rounds` in `benchmark.json`, and SHALL be overridable by the `--rounds` argument, which wins.

#### Scenario: One round gives every configuration the same brief

- **WHEN** a corpus with two configurations runs one round
- **THEN** both configurations run on the same brief in that round

### Requirement: One fresh container per run

The default execution backend SHALL build the run image once per benchmark from the `Dockerfile` in `benchmark/` and start one fresh container per run, with the checkout mounted read-only. For each run it SHALL copy the base project, then the brief's fixed plan into `openspec/changes/<change>/` for the plan route or the brief's `block.md` for the Direct Build route, install the checkout's SAI for the configuration's harness, write the configuration's models as agent-file tunables, and record the project as a git baseline. Harness credentials SHALL enter only as the environment variables the configuration names, never as values written to the corpus, the output, or the report. The container SHALL be removed when the run ends, whatever its outcome. The backend SHALL be replaceable, so the tests run with a simulated backend and need neither Docker nor a model.

#### Scenario: Missing credential is an infrastructure error

- **WHEN** a credential environment variable that the configuration names is not set
- **THEN** no container starts and the run is classified `error`

#### Scenario: Timed-out run still removes its container

- **WHEN** a launch exceeds the run's time limit
- **THEN** the container is removed

### Requirement: Route launch commands

A plan-route run SHALL launch `/sai-3-implement <change>`, and a Direct Build-route run SHALL launch `/sai-direct-build --block-file <path> --block-hash <sha256>` with the hash of the brief's block. On Claude Code the launch SHALL use `claude -p` with `--output-format stream-json --verbose`; on opencode it SHALL use `opencode run --format json`.

#### Scenario: Plan route on opencode

- **WHEN** an opencode configuration of the plan route runs a brief whose change name is `greeting`
- **THEN** the launch is `opencode run --format json` with the prompt `/sai-3-implement greeting`

### Requirement: Hidden suite after the run

The hidden suite SHALL enter the container only after the agents end and SHALL run against the final working tree. While the agents work, no file of the suite SHALL exist in the container. The suite result SHALL be the last valid `SUITE_RESULT {"passed": <n>, "total": <n>}` line its command prints.

#### Scenario: Suite absent while the agents work

- **WHEN** the agents of a run are working
- **THEN** no file of the hidden suite exists in the container, and the suite is copied in only after the launch ends

### Requirement: Run classification

Each run SHALL be classified as exactly one of `accepted`, `rejected`, `escalated`, `timeout`, or `error`, in this order of precedence: a run that cannot start or is interrupted by infrastructure causes (the container does not start, the harness CLI is missing, a credential is missing, the harness reports an error, the hidden suite cannot run) is `error`; a run that exceeds its time limit is stopped and is `timeout`, and its hidden suite does not run; a run whose final assistant text lacks its route's closing literal (`Implement done.` for the plan route, `Direct build done.` for the Direct Build route) is `escalated`, even with exit code 0 and even when the hidden suite passes, and the suite result still appears in its detail; a run where every test of the hidden suite passes is `accepted`; any other run is `rejected`, with the number of tests that passed. On opencode, the runner SHALL count `question` tool calls that ended with `status: "error"` as cancelled questions, and a run with cancelled questions that ends with its closing literal SHALL be judged by the hidden suite like any other run.

#### Scenario: Closing literal missing with a passing suite

- **WHEN** a run exits with code 0, its hidden suite passes, and its final text lacks `Implement done.`
- **THEN** the run is `escalated` and its detail shows the suite result

#### Scenario: Partial pass

- **WHEN** a run ends with its closing literal and passes 2 of 3 hidden tests
- **THEN** the run is `rejected` and its detail shows `2/3`

#### Scenario: Cancelled opencode question with closing literal

- **WHEN** an opencode run has a cancelled `question` call, ends with its closing literal, and passes every hidden test
- **THEN** the run is `accepted` and counts one cancelled question

### Requirement: Results saved as each run ends

The runner SHALL write to an output folder given as an argument, and SHALL refuse an output folder inside the `shared-ai` checkout or the corpus. It SHALL save each run's result as one JSON file as soon as the run ends. A rerun into the same output folder SHALL keep the saved runs and run only the missing ones, and the report SHALL be generable from an interrupted benchmark.

#### Scenario: Output folder inside the corpus

- **WHEN** `--out` names a folder inside the corpus
- **THEN** the runner stops before any run and names the folder and the corpus

#### Scenario: Interrupted benchmark keeps its runs

- **WHEN** a benchmark stops after some runs have ended
- **THEN** their result files remain, and a rerun into the same folder runs only the missing runs

### Requirement: Per-configuration report

The runner SHALL write one Markdown report per configuration, built only from the saved output folder, carrying its report format version and the command that regenerates it. Each report SHALL record its provenance (the runner commit and the SAI installation commit, marked `+dirty` when the checkout has uncommitted changes, the corpus identifier, the price table date, the number of rounds, and the time limit), the configuration's harness, route, and models, the completed and missing run counts, the accepted count over judged runs, the rejected, escalated, and timeout counts, the total and per-run wall time, the number of runs with cancelled questions, and a per-run table. Runs classified `error` SHALL be listed separately and excluded from the accepted count, its total, and the wall time.

#### Scenario: Errors excluded from the accepted total

- **WHEN** a configuration has three runs, one `accepted`, one `rejected`, and one `error`
- **THEN** its report shows 1 accepted of 2 judged runs and lists the `error` run under infrastructure errors

#### Scenario: Missing runs reported

- **WHEN** the report is generated from an interrupted benchmark
- **THEN** each configuration's report states how many of its runs are missing
