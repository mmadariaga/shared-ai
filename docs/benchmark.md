# Outcome benchmark

The outcome benchmark answers one question: does a run of `/sai-3-implement` produce correct code, and at what wall time, token count, and cost? It runs a fixed set of implementation briefs in one fresh Docker container per run, judges each run with a hidden black-box acceptance suite, and reports accepted-run counts, wall time, tokens, tool calls, and cost per configuration.

The runner is `bin/benchmark.js`. It runs from a `shared-ai` checkout only: `sai/install-manifest.json` projects it to no harness, and the package `files` list does not ship it. It needs Docker and the credentials of each configuration's harness. It supports Claude Code and opencode.

## Terms

- **brief**: the implementation request a run receives, stored in the corpus as a `Ready to Propose` block.
- **corpus**: the private repository holding the base project, the briefs, the reviewed plans, the hidden suites, and `benchmark.json`. Keep it outside `shared-ai`: this repository is public, and a hidden suite stored here would stop being hidden.
- **configuration**: one combination of harness, route, and model per worker role.
- **price table**: the per-model price per million tokens by token type (input, output, cache read, 5-minute cache write, and 1-hour cache write), dated, in `benchmark.json`.
- **run**: one launch of a configuration on a brief, in a fresh container.
- **round**: the paired runs in which every configuration goes through the same brief. Briefs rotate between rounds.
- **run outcome**: `accepted`, `rejected`, `escalated`, `timeout`, or `error`.

## Commands

```
node bin/benchmark.js validate <corpus>
node bin/benchmark.js run <corpus> --out <folder> [--rounds <n>]
node bin/benchmark.js report --out <folder>
```

`run` validates the corpus first and launches nothing when it finds a problem. It writes one JSON file per run to `<folder>/runs/` as soon as the run ends, and one Markdown report per configuration (`report-<configuration>.md`) at the end. The output folder may not be inside the checkout or the corpus. After an interruption, `report` builds the reports from the saved runs and states how many runs are missing per configuration, and `run` with the same folder keeps the saved runs and continues. The default is 10 rounds; `--rounds` overrides `benchmark.json`.

## Corpus format

```
benchmark.json
project/                     base project, already prepared with `openspec init` for the harnesses used
briefs/<brief>/block.md      the brief (its `**Change name**` names the change)
briefs/<brief>/plan/         the fixed, human-reviewed plan; copied to openspec/changes/<change>/
briefs/<brief>/acceptance/   the hidden suite, with suite.json
```

`benchmark.json` holds `corpus` (the identifier), `rounds` (optional, default 10), `timeLimitSeconds` (mandatory), `configurations`, and `prices`:

```json
{
  "corpus": "private-corpus-2026-11",
  "rounds": 10,
  "timeLimitSeconds": 3600,
  "configurations": [
    {
      "id": "claude-plan-haiku",
      "harness": "claude",
      "route": "plan",
      "env": ["ANTHROPIC_API_KEY"],
      "models": {
        "sai-3-red-worker": { "model": "haiku", "effort": "medium" },
        "sai-3-green-worker": { "model": "haiku", "effort": "medium" }
      }
    }
  ],
  "prices": {
    "date": "2026-11-01",
    "models": {
      "haiku": { "inputPerMTok": 1, "outputPerMTok": 5, "cacheReadPerMTok": 0.1, "cacheWrite5mPerMTok": 1.25, "cacheWrite1hPerMTok": 2 }
    }
  }
}
```

- `route` is `plan` (launches `/sai-3-implement <change>` on a base project that holds the fixed plan) or `direct-build` (launches `/sai-direct-build --block-file --block-hash`).
- `models` maps worker roles to their agent-file tunables: `model` and `effort` on Claude Code, `model` and `variant` on opencode. The runner writes them as project-local agent files inside the container.
- `env` names the credential environment variables. The runner passes them to the container by name; their values never reach the corpus or the reports.
- `prices` is checked for shape only: a date and, per entry, `inputPerMTok` and `outputPerMTok`, with `cacheReadPerMTok`, `cacheWrite5mPerMTok`, and `cacheWrite1hPerMTok` optional. A configured model may have no entry. The `prices` date appears in the reports. Prices change, so the table lives in the corpus; updating it needs no change to `shared-ai`.

`acceptance/suite.json` holds `{ "command": ["..."] }`: the command that runs the suite from `/work`, with the suite files at `/acceptance`. The command prints a line `SUITE_RESULT {"passed": <n>, "total": <n>}`.

## How a run is classified

The hidden suite enters the container only after the agents end, and runs against the final working tree.

| Outcome | Meaning |
|---|---|
| `accepted` | The run printed its command's closing literal and every suite test passed. |
| `rejected` | The run printed its closing literal and the suite did not fully pass; the report shows how many tests passed. |
| `escalated` | The run ended without the closing literal (`Implement done.` for `/sai-3-implement`, `Direct build done.` for `/sai-direct-build`), even with exit code 0 and a passing suite. The suite result stays in the run detail. |
| `timeout` | The run exceeded `timeLimitSeconds`; its container was removed and the suite did not run. |
| `error` | Infrastructure failed: the container did not start, a credential or CLI was missing, authentication failed, or the suite could not run. These runs are excluded from the accepted count and its total and listed apart. |

On opencode the runner also counts the `question` calls that were cancelled with an error; the report shows how many runs had them.

Each report records the `shared-ai` commit of the runner and of the SAI installation, the corpus identifier, the price table date, the number of rounds, and the time limit.

## Tokens, tool calls, and cost

When a run ends, the runner copies the harness data out of the container before it removes the container, also for a run that timed out, and reads it with the shared readers of the SAI tools (`sai/tools/claude-transcripts.js` and `sai/tools/opencode-db.js`). The root session and every subagent count. Tool calls are every tool call the session made, subagent dispatches included. The wall time is measured by the runner around the launch.

- **Tokens** are input, output, cache read, and cache write. On opencode, reasoning tokens are part of the output.
- **Cost on Claude Code** is an estimate. Claude Code records no cost, so the runner multiplies the token counts of each recorded model by the price table. Cache writes pay the 5-minute or the 1-hour price as the transcript splits them; a cache write the transcript does not split pays the 5-minute price.
- **Cost on opencode** is the cost opencode recorded per message. A model whose messages recorded no cost is priced from the table.
- **Which table entry applies.** An entry matches a recorded model when its key equals the model name, or when the dash-separated words of the key appear in the model name as one run (`haiku` and `claude-haiku-4-5` both match `claude-haiku-4-5-20251001`). The longest key wins, and two keys of the same length that both match give no price.
- **No price.** A model with no matching entry, or whose entry lacks the price of a token type the run used, shows its cost as `no price`, never as zero. Its tokens, tool calls, and time are reported as usual. A run with such a model has no total cost, and the configuration's cost covers only its priced runs and says how many it leaves out.
- **Unmeasured runs.** When the harness data cannot be copied or read, the run keeps its classification and its usage is absent. The report counts these runs apart and leaves them out of the token, tool call, and cost figures. A run with an infrastructure error is excluded from these figures like from the wall time.

Each run's JSON file holds its `usage` (totals plus one entry per model) with the cost already computed from the price table of that benchmark. Only token counts, tool-call counts, and model names are saved: no session identifier, project path, or credential reaches the output folder. The report shows the figures in total and per run in its Result section, per model in `Usage by model`, and per run in the run table.
