# Project settings

`.sai/settings.jsonc` in the project root holds committed, per-project answers to questions that commands otherwise ask each run. It is the same file for Claude Code and opencode. Edit it from the post-setup menu of `npx --allow-git=all github:mmadariaga/shared-ai setup` (see [Post-setup menu](#post-setup-menu)), or by hand. The menu edits the language and provider settings, `publication.autoApprove`, and `experimental.changeTelemetry`, and opens the cache warming screen. A personal `.sai/settings.local.jsonc` overrides it key by key, and it alone can grant publication consent; see [Local overrides](#local-overrides) and [Publication consent](#publication-consent).

The file is JSON with comments and trailing commas allowed. Setting ids are dotted key paths, so `backlog.provider` is the key `provider` inside the object `backlog`:

```jsonc
{
  "backlog": {
    // A self-hosted GitLab host does not identify its provider.
    "provider": "gitlab"
  }
}
```

## Catalogue

| Setting id | Value | Used by |
|------------|-------|---------|
| `backlog.provider` | A registered backlog provider id (`github`, `gitlab`, `azuredevops`) | `/to-backlog`, `/from-next-backlog-item`; `/from-backlog` for bare `N` and `#N` references and as a tie-breaker |
| `backlog.repository` | Repository address | `/to-backlog`, `/from-next-backlog-item` |
| `backlog.project` | Project, board, or team name or address | `/to-backlog`, `/from-next-backlog-item` |
| `backlog.organization` | Organization address | `/to-backlog`, `/from-next-backlog-item` |
| `pr.provider` | A registered `/to-pr` provider id (`github`, `gitlab`, `azuredevops`) | `/to-pr` |
| `pr.repository` | Repository address | `/to-pr` |
| `pr.organization` | Organization address | `/to-pr` |
| `pr.project` | Project name or address | `/to-pr` |
| `pr.language` | A language name, preferably its endonym (`Español`), or `English`; an absent key means `English` | `/to-pr` and the unattended publications of `/sai-plan`, `/sai-build`, and the `/sai-explore` Plan and Direct Build routes (see [PR/MR language](#prmr-language)) |
| `pr.publishAfterRun` | `ask`, `yes`, or `no`; an absent key means `ask`; a `yes` counts only from `.sai/settings.local.jsonc` | `/sai-plan` and `/sai-build` publication question, and the `/sai-explore` round-3 publication question (see [Plan publication answer](#plan-publication-answer)) |
| `publication.autoApprove` | `true` or `false`; an absent key means `false`; a `true` counts only from `.sai/settings.local.jsonc`; see [Publication auto-approval](#publication-auto-approval) | `/to-pr`, `/to-backlog`, and the round-2 publication approval of `/sai-explore`, on Claude Code and opencode |
| `explore.readyToProposeLanguage` | A language name, preferably its endonym (`Español`), or `English` | `/sai-explore` crystallization language gate |
| `explore.overviewLanguage` | A language name, preferably its endonym, `English`, or `none` for no overview | `/sai-explore` overview-language question in round 3 of the route round (applied only for Plan - Unattended) |
| `explore.chatPublicLanguage` | A language name, preferably its endonym, or `English` | `/sai-explore` chat language, from the first message after the load |
| `warming` | An object with `defaults` and `rules`, or one block per harness (`claude`, `opencode`) with that shape and a global fallback; see [Cache warming](#cache-warming) | Every SAI agent that keeps its prompt cache warm (`sai/policies/cache-warming.md`) |
| `experimental.changeTelemetry` | `true` or `false`; see [Change telemetry](#change-telemetry) | `/sai-plan`, `/sai-build`, and the `/sai-explore` in-session routes, on Claude Code and opencode |

All three `explore.*` ids and `pr.language` accept any non-empty string as the language name; the endonym is recommended and never checked. `English`, `none`, and `ask` match case-insensitively, and the tool returns `English` and `None` in canonical form. In `explore.overviewLanguage`, `none` selects no overview. In `explore.readyToProposeLanguage`, `explore.chatPublicLanguage`, and `pr.language`, `none` is invalid.

`explore.overviewLanguage` answers only the overview question that the route round asks beside the route choice, and it takes effect only when the route is Plan - Unattended. Direct Build, Manual, and standalone `/sai-2-design` ignore it. The artifact-review language question has no setting. The `**Overview language**` field of a `Ready to Propose` block shows only the `--overview-lang` value or `None`, whatever the settings hold.

`explore.chatPublicLanguage` is the language that `/sai-explore` uses with you. It is the same as writing "let's talk in <language>" right after the command loads, before any idea or change is discussed. It always wins over the language you write in, so the chat stays in that language until you ask for another one; without the setting, `/sai-explore` follows the language you write in. Only explanatory chat text changes: reasoning stays English, fixed literals such as STOP notices, halt messages, and picker labels stay as written, and the `Ready to Propose` block, the change overview, and every artifact keep the languages that their own settings and gates choose.

`pr.language` is the language of the PR/MR title subject and of the description that SAI drafts; see [PR/MR language](#prmr-language).

The work-item type has no setting; it is chosen at each creation. Provider ids come from the provider registries, never from this page.

## Cache warming

The `warming` setting lets SAI agents keep their prompt cache warm between continuations. After each response, a final result included, an agent runs a foreground arm check and launches one background wait only when that check says so; the wait re-arms on each wake until its `max` window passes since its last real task or continuation, or until the agent that dispatched it disposes it. The `wait.js` tool owns the chain, the timings, the window, and the decision to launch; a coordinator that disposes a worker or helper turns its warming on with a `Warming: on` line in its messages. Each subagent message carries a diagnostic `warming: true` or `warming: false` line. The line does not decide when an agent ends: a coordinator disposes every worker and helper it creates at its last use, whatever the setting (`sai/policies/worker-lifecycle.md`), and the main session retires its chain at the terminal output of its command, so its live wait finishes its interval and nothing is re-armed (`sai/policies/cache-warming.md` § Retire at terminal output; the next command in the same chat reactivates the chain, and the `/sai-explore` hand-off wait is exempt). Each agent keeps a single live chain of waits: a newer wait supersedes the earlier one, which ends within seconds. The same applies on Claude Code and opencode. Without the setting, nothing warms. Each wake costs two short requests and some usage allowance, which the `max` window bounds; a pause longer than `max` still resumes cold. A worker that returned a result and has received no message since repeats that result on its next wake instead of its wake literal `warming context cache up`, so a coordinator that missed it recovers it; a coordinator also watches the report directory in the background while it waits for a worker, whether or not warming is on (`sai/policies/worker-report-transport.md` § Undelivered reports).

On Claude Code and opencode, arm responses and normal warm results include a short `reminder`. It asks the main session to handle an unhandled user response or work that the current command already permits, rather than automatically ending with a bare acknowledgement. Otherwise the session preserves its wait or completed state; a turn that only warming opened ends with `➡️ Warming context cache up.`. A subagent answers a wake with `warming context cache up`, and answers `dispose` and every wake after it with `cache warming stopped`; a bare `ok` from an earlier install is still recognized. The literals are fixed English text and are never translated (`sai/policies/cache-warming.md`). A `finished` result ends the warming wait, not necessarily the command's work. The reminder grants no permission, supplies no human action such as `next-slice`, and changes neither the subagent protocol nor rearming limits. It is a continuity aid, not a guarantee of model compliance or harness delivery; no next-action state is stored.

`interval` and `max` are numbers of minutes, and `max` is at least `interval`. The value is one object under the single id `warming`. It holds one block per harness under `claude` and `opencode`; a top-level `defaults` and `rules` pair is the legacy global value that a harness without a block still reads:

```jsonc
{
  "warming": {
    // Per-harness blocks: each role default applies only in its own harness.
    "claude": {
      // One entry per role: `agent` is a main session that runs a command, `subagent` is a worker or helper.
      "defaults": {
        "agent": { "interval": 4, "max": 30 },
        "subagent": false
      },
      // Rules are keyed by provider, an optional model, and a role. Model ids are values, never keys.
      "rules": [
        { "provider": "anthropic", "model": "haiku", "role": "subagent", "interval": 4, "max": 20 },
        { "provider": "anthropic", "role": "agent", "enabled": false }
      ]
    },
    "opencode": {
      "defaults": { "agent": { "interval": 4, "max": 30 } }
    }
  }
}
```

A legacy global value keeps working until a harness is edited; once `claude` and `opencode` both exist, the top-level keys are ignored and stay in the file:

```jsonc
{
  "warming": {
    // The fallback that both harnesses read until they have a block of their own.
    "defaults": { "agent": { "interval": 4, "max": 30 } },
    "rules": [{ "provider": "anthropic", "role": "subagent", "enabled": false }],
    // The first edit of a harness writes its block, seeded from the global defaults and rules above.
    "claude": {
      "defaults": { "agent": { "interval": 4, "max": 30 } },
      "rules": [{ "provider": "anthropic", "role": "subagent", "enabled": false }]
    }
  }
}
```

- A `defaults` entry is `{ "interval", "max" }` or `false`. A rule carries `provider`, an optional `model`, `role`, and either `interval` and `max` or `"enabled": false`.
- Resolution runs per harness: the harness's own block when it has one, and otherwise the top-level global value. Within the chosen value it runs separately for each role: the first rule that matches the provider, the model, and the role; then, for the provider `anthropic`, the first rule whose model is the model family of the runtime id; then the first rule that matches the provider and the role and has no `model`; then `defaults` for the role. When none applies, or the winning entry is `false`, the agent does not warm.
- The model family is the version-less alias of a Claude model: the runtime id `claude-opus-5-5` belongs to the family `opus`, so a rule for `opus` applies to it when no rule names the full id. The tool derives the family from ids of the form `claude-<family>-...`; an id of another shape, or a provider other than `anthropic`, has no family and skips this step. A command on Claude Code declares an alias such as `opus`, while the running session reports the full id, which is why the family step exists.
- The provider and model of a worker or helper come from the `model` frontmatter of its installed agent file. On Claude Code the provider is `anthropic` and the model is the frontmatter value as written (for example `haiku`). On opencode the value is `<provider>/<model>`, so `opencode-go/deepseek-v4.1-flash` is the provider `opencode-go` and the model `deepseek-v4.1-flash`.
- Timings are resolved again for every arm, so a change in either settings file, a local override included, applies from the next arm without restarting any agent. The local file replaces the whole `warming` value, as it replaces any key: a local value with per-harness blocks applies only to the harnesses it names, and an unnamed harness reads `off`.
- An invalid `warming` value is dropped with a warning, and nothing warms.

`/sai-explore` reads `warming` for the `agent` role of its own harness at its hand-off closes: when a `Plan - Unattended` slice closes, or a sliced `Manual` hand-off is printed, with another slice still pending, it keeps its own cache warm until you return with `next-slice`. An entry for the `agent` role supplies the interval, and `max` is the fixed duration counted from the hand-off, with no question; an off entry means no warming and no question. With no entry, `/sai-explore` asks for an interval and a duration instead, keeps the answer for the invocation only, and writes nothing to this file. See the [`/sai-explore` page](commands/sai-explore.md).

Print the effective values for one agent:

```sh
node sai/tools/project-settings.js warming --provider anthropic --model haiku --role subagent --harness claude --json --cwd <project-root>
```

It prints `{warming, origin, warnings}`, where `warming` is `{interval, max}` or `off`, and `origin` is `model`, `family`, `provider`, `defaults`, or `none`.

### Cache warming screen

Run `npx --allow-git=all github:mmadariaga/shared-ai setup`, and choose **Cache warming** in the post-setup menu. You can still edit the file by hand. The screen asks which harness to configure first (`Claude Code` or `OpenCode`), then shows that harness's role defaults and rules:

- **Role defaults**: `Default for agent` and `Default for subagent`. Each is `off` or `every <interval> min, up to <max> min`. A new project shows both as `off`, so nothing warms until you enable one.
- **Guided rules**: one row for each (provider, model) pair that an installed SAI file of the chosen harness declares in its `model` frontmatter, with any effort or variant suffix (`#xhigh`) removed. The `agent` role lists the pairs of that harness's installed commands and utilities. The `subagent` role lists the pairs of its installed workers and helpers. A file without a `model` key adds no row; provider rules and the defaults cover it. The screen reads the files of both harnesses and writes nothing to them.
- **Existing rules** of the chosen harness that match no installed pair, for example a hand-written rule or one for a full model id, are listed with the note `(no installed file uses it)`. You can edit or remove them, and a save never drops them.
- **Harness isolation**: a row of one harness never appears under the other, even when both use the same provider and model. A rule saved under one harness does not change the other harness's effective warming. When the chosen harness has no block of its own but a legacy global value exists, the screen shows that global value and the first save writes the harness's block from it; the other harness keeps reading the global value until it is edited too.

Choose a row to **Enable** it, set it to **Off** (`false` for a default, `"enabled": false` for a rule), or, for a rule, **Remove rule**. **Enable** asks for the interval and the maximum in minutes. An empty answer keeps the pre-filled value, which is the current one or `4` and `30` when none exists. Values must be positive and `max` at least `interval`; the screen asks again otherwise, so it never writes an invalid value.

**Done** saves the edits of the chosen harness and leaves the screen; **Back** saves them and returns to the harness choice; **Back** or **Esc** at the harness choice returns to the post-setup menu. The screen writes only the `warming` key of `.sai/settings.jsonc` and keeps the other keys and comments, including the other harness's block and the legacy global keys. A session without an edit leaves the file byte-identical, and so does Ctrl-C, which discards the unsaved edits. A reinstall keeps the stored values and shows them again. When the stored `warming` value is invalid, the screen prints the warning and starts from empty values; the first save replaces it. When `.sai/settings.local.jsonc` defines `warming`, the screen warns that the local value replaces the one it writes, and it still writes only the base file.

### Editing `warming` by hand

Set `warming` by editing its key in `.sai/settings.jsonc`, or in `.sai/settings.local.jsonc` for a personal override. The value has the shape shown under [Cache warming](#cache-warming): one block per harness (`claude`, `opencode`), or the legacy top-level `defaults` and `rules` that both harnesses read until they have a block. The **Cache warming** entry of the [post-setup menu](#post-setup-menu) opens a screen that edits `warming`; see [Cache warming screen](#cache-warming-screen).

- A new project has no `warming` key, so nothing warms until you add one.
- Edit the `warming` key only; the other keys and comments of the file stay as they are, and a reinstall keeps the stored values.
- Values must be positive, and `max` at least `interval`. An invalid `warming` value is dropped with a warning and nothing warms, as described under [Cache warming](#cache-warming).
- When `.sai/settings.local.jsonc` defines `warming`, its value replaces the whole value of `.sai/settings.jsonc`; a local value with per-harness blocks applies only to the harnesses it names, and an unnamed harness reads `off`.
- Check the result with the resolver command shown under [Cache warming](#cache-warming).

The `/sai-context-cache-ttl-benchmark` command turns warming off in `.sai/settings.local.jsonc` while it measures and restores the file afterwards; see its [command page](commands/sai-context-cache-ttl-benchmark.md#warming-override).

## Change telemetry

`experimental.changeTelemetry` is a boolean, edited with the **Telemetry** row of the [post-setup menu](#post-setup-menu) or by hand. An absent key reads as `false`. This setting is experimental and its shape may change.

```jsonc
{
  "experimental": { "changeTelemetry": true }
}
```

With `true`, a direct `/sai-plan` or `/sai-build` run on Claude Code or opencode, or an in-session **Plan - Unattended** or **Direct Build - Unattended** route of `/sai-explore`, records the cost of the run in `telemetry.md` in the change's folder when it closes; a completed Direct Build route writes it into the archived folder. The file is an optional artifact of the `sai-workflow` schema. Each run adds one section at the end, marked with its final status (`completed`, `failed`, `stopped`, `blocked`, or `unanswered`), and the change total at the top is recomputed. For the coordinator and every subagent, a section lists the model and variant, the requests, the tokens (input, output, reasoning, cache read, cache write), the cache hit share and the cache misses with their average overcost, the cost, the model time, the tool calls with their errors and a breakdown by tool, the subagents dispatched, and the cache-warming wakes (the turns that the completion of the agent's own wait opened). A `Cache-warming wakes` table then gives the requests and tokens those wake turns spent, per agent and in total; they are part of the figures above, not added to them. It also lists the review findings of each segment: found by the first review pass and still pending after the last one. Where a segment has no such tally, the section says `unavailable`.

- Every figure is read after the run by `sai/tools/change-telemetry.js`: from `opencode.db` on opencode (through `node:sqlite`, which needs Node 22.13 or later; with an older Node, an opencode run writes no telemetry section and the closing report gives the reason, and an opencode exploration origin shows as `unavailable`), and from the Claude Code session transcripts (`projects/<project>/<session>.jsonl` and its `subagents/` folder under `CLAUDE_CONFIG_DIR`, default `~/.claude`) on Claude Code. A worker that a Claude Code run routes to opencode is read from `opencode.db` by its session, together with the helper sessions it starts itself, each a row under it. A datum that the harness did not record shows as `unavailable`, never as zero, and a total that depends on it is marked `≥`. Claude Code records no reasoning or variant, so those two show as `unavailable` in every row and total on Claude Code; its cache write is the sum of the 5-minute and 1-hour cache writes. It records no cost either: its cost is estimated from the dated price table in `sai/tools/model-prices.js` (published prices, kept up to date by hand) and marked `~`, each Claude Code section states the table date, and a model with no price there shows `unavailable`. A cache miss is a request whose cache read is smaller than the previous request's cache read plus cache write, so partial expiries count, and `Overcost/miss` is what a miss costs beyond a cache hit (rewritten tokens × (cache write price − cache read price), per miss; `n/a` with no misses). `Cache hit` is cache read ÷ (cache read + cache write + input). A `By command` table after the change total adds up the executions of each command, with the exploration as its own row. Sections written before these figures existed keep their text and show them as `unavailable`.
- The figures of the coordinator leave out its own closing turn, because that turn is still running when the collection starts.
- On opencode, only the V2 session schema is supported. When the database or the transcript folder cannot be read, or the run is not found in it (for example after `/clear` started a new Claude Code session in the middle of the run), the command still closes normally, writes nothing, and prints the reason.
- One `telemetry.md` can hold executions from both harnesses. Each section names its harness, and a change total adds each field over the executions that recorded it and is marked `≥` when an execution lacks that field.
- An in-session `/sai-explore` route records one section per slice: the Plan route at the plan close, and Direct Build after its archive completes. Its window starts at the slice's first route worker, so the coordinator's work before that worker is not counted and, in Direct Build, a previous slice in the same chat stays outside it. `/sai-deep-review` records no telemetry.
- When the change's `.openspec.yaml` lists `explore_origin` sessions, the first run that writes `telemetry.md` also records the exploration that produced the change, in an `Exploration` section with one segment per listed session. The block's `Explore origin` line carries those sessions from `/sai-explore` (on opencode and on Claude Code, with this setting on; each entry names its harness, as in `claude <uuid>, opencode ses_…`), through a published backlog issue and a later re-crystallization, to the change. Each session is read with the reader of its own harness, so a Claude Code run can record an opencode origin and the other way round; the exploration of a Claude Code session shows an estimated cost and no reasoning or variant. A session missing from the data of its harness on the machine that collects (`opencode.db` or the Claude Code transcripts of the project) shows as `unavailable`. Several slices of one exploration each record it, marked shared, so adding their `telemetry.md` files counts it more than once. Every listed session ID is visible in a published issue.
- The command commits `telemetry.md` only when the project does not ignore it. A project that ignores `openspec/changes/` keeps the file on disk, and the closing report says so.

## Values and precedence

- A missing key, a missing file, or `"ask"` keeps the normal question.
- Precedence: an explicit override (an invocation flag, a direct statement in the conversation, or for `/from-backlog` the issue URL itself) beats a project setting, which beats a fast-track fixed value, which beats the normal question.
- When a setting answers a question, the command prints one line naming the setting id and its value.
- The explore language questions follow the same order. The crystallization language question takes the user's explicit statement, then `explore.readyToProposeLanguage`, then the normal question. The overview-language question takes `--overview-lang` or the user's explicit statement, then a value already resolved for the same crystallized set, then `explore.overviewLanguage`, then the normal question. Both read the setting only; an answer to the normal question stays in the conversation.
- Settings answer preferences only. Authorization gates (commit authorization, publication confirmation, safe-operations confirmations, route selection) always ask. The exceptions are `pr.publishAfterRun`, whose `yes` or `no` is the answer of the publication question of `/sai-plan`, `/sai-build`, and `/sai-explore` (the authorization the run holds), and `publication.autoApprove`, a standing grant of the person who runs the command that removes the approval question of `/to-pr` and `/to-backlog` (see [Publication auto-approval](#publication-auto-approval)). Both grant consent only from `.sai/settings.local.jsonc`; see [Publication consent](#publication-consent).

`/from-backlog` resolves a bare `N` or `#N` in `backlog.provider`: GitLab and GitHub against the repository of the Git remotes, Azure DevOps against `backlog.organization` and `backlog.project` when both are set, otherwise against its existing context. Without the setting a bare reference keeps its current resolution. A full URL that matches a provider positively keeps that provider, and the command prints a line saying that the setting was overridden. Among providers that accept a URL only as a fallback, the setting breaks the tie. When the setting names a provider that does not accept the reference, the command stops with `provider-destination-conflict`.

`/to-pr` takes its code host from the `pr.*` keys, never from `backlog.*`: the backlog provider and the code host can differ (for example Azure Boards with the code on GitLab). The order is an explicit provider or repository, then `pr.*`, then `.to-pr.json`, then Git remotes. An explicit value that differs from a `pr.*` key wins, and the command prints a line saying so. With `pr.provider` set, a self-hosted host needs no provider question. `.to-pr.json` is deprecated: it works only when no valid `pr.*` key is set, with a warning, and `.to-backlog.json` is no longer read.

### Plan publication answer

`pr.publishAfterRun` answers the question `/sai-plan` and `/sai-build` ask at the start of a run, and `/sai-explore` asks once per crystallized set in round 3 of its route question: whether to publish a PR/MR when the run ends (a draft of the plan for `/sai-plan` and an Explore Plan slice, a request ready for review for `/sai-build` and an Explore Direct Build slice). `yes` and `no` remove the question; `ask`, an absent key, and an invalid value (which also prints the warning) leave it normal. A `yes` counts only from `.sai/settings.local.jsonc`: a `yes` in `.sai/settings.jsonc` leaves the question normal and prints a warning (see [Publication consent](#publication-consent)), while a `no` counts from either file. It is not a destination field of `/to-pr`, so it never changes how the destination is resolved, and the screen does not list it: it stays hand-edited. An explicit `--publish yes|no` argument of `/sai-plan` or `/sai-build` wins over it, and so does the answer a resumed run already recorded. Command invocation, a stale conversation, or a general grant never stand in for the answer: only the argument, the recorded answer, this setting, or the question itself do.

### Publication auto-approval

`publication.autoApprove` is a boolean in the `publication.*` group, shared by `/to-pr` and `/to-backlog`. An absent key reads as `false`, and a value that is not a boolean is dropped with a warning that the key must be true or false, so the approval questions stay. A `true` grants the approval skip only from `.sai/settings.local.jsonc`; a `true` in `.sai/settings.jsonc` grants nothing and prints a warning (see [Publication consent](#publication-consent)). Edit it with the **Auto-approve publication** row of the **Backlog and PR settings** submenu, which writes the local file, or by hand in that file.

With the key `true`, each publication shows its complete proposal and then publishes with no approval question:

- `/to-pr` shows the title, description, destination, and the push target when a push is needed, then pushes without force and publishes with the unchanged push and publish tokens. The tool also refuses what unattended publication refuses (a force push, the default branch, a detached HEAD, a branch that is not at the shown commit, and a merged or closed request), and a refusal publishes nothing.
- `/to-backlog` shows the destination, visibility with the public warning, title, description, and planning changes (and for an update the baseline and the provider's non-atomic update note), then creates or updates with the unchanged confirmation token. A slice-set publication works the same way as a single item.
- `/sai-explore` round 2 drops the publication approval question and still asks the branch base when a branch will be created. Round 1 still asks whether to create or update the backlog.

The key's value is part of the proposal that each confirmation token binds, so a key that changes after a proposal was shown invalidates the token and nothing is published: the skill shows a new proposal. The question is asked anyway when someone else changed the issue (a stale baseline or divergent remote content renews the proposal), when you ask in the conversation to review before publishing (the setting stays unchanged), and for a pending retry whose remote content no longer matches the baseline. Confirmations outside publication approval, such as issue assignment at implementation start and every `safe-operations` confirmation, stay asked. The unattended publications of `/sai-plan`, `/sai-build`, and Direct Build, and `pr.publishAfterRun`, keep their behavior.

### PR/MR language

`pr.language` selects the language that SAI uses for the title subject and the description of a PR/MR. The language in force for one publication is, in this order: a language you explicitly request for the PR/MR in the conversation with `/to-pr` (for that publication only; the setting stays unchanged), else `pr.language`, else English. The language you chat in and `explore.chatPublicLanguage` do not count as a request. `/sai-plan`, `/sai-build`, and the `/sai-explore` Plan and Direct Build routes publish without a conversation, so they use `pr.language` when it is set and English otherwise, and ask no language question.

- The `type(scope):` prefix of the title stays English so that changelog and release tooling keep parsing it. Only the subject follows the language, and the title rules (imperative, at most 70 characters, no trailing period) still apply. The description's section headings follow the language too.
- Machine-read content stays verbatim: closing keywords such as `Closes #473`, and the stored inherent-risk ratings block with its markers.
- On update, `/to-pr` drafts only its own content in the language; text it preserves stays as written.
- `pr.language` is not a destination field of `/to-pr`, so it never changes how the destination is resolved. `to-pr.js collect` returns the resolved value as `language`, with `English` for an absent or invalid key, and carries the settings `warnings`, which the skill and the unattended closing reports print, so an invalid value never falls back to English silently. A value that fails validation (empty, not a string, or `none`) is refused when you write it with the menu, and counts as absent when read. The value `English` behaves like an absent key.
- The setting does not change the language of commit messages, OpenSpec artifacts, or the `Ready to Propose` block, and `explore.readyToProposeLanguage` has no effect on the PR/MR.
- After a squash merge, the commit subject that the provider takes from the request title is in this language.

## Location

Every reader looks for `.sai/settings.jsonc` in the git top-level directory of the working directory, so a subdirectory works. In a linked worktree that has no file of its own, the readers use the main worktree's file and print a notice, because `.sai/` is often untracked; a worktree's own file wins. Outside a git repository only the working directory is read.

## Local overrides

`.sai/settings.local.jsonc` holds your personal values. The installer never creates it, and neither the installer nor the menu edits any `.gitignore`; add the file to your own `.gitignore` so that it is not committed. Create it by hand, or let the menu create it when you save a publication consent key (see [Publication consent](#publication-consent)).

- The file has the same format and the same ids as `.sai/settings.jsonc`.
- Readers merge the two files key by key: a key in the local file replaces the base value, even when its value equals the base value, and every other key keeps the base value. `"ask"` or an invalid value in the local file also replaces the base value and leaves the question normal.
- The local file is looked up in the same `.sai/` directory that supplies the base file, under the worktree rule above. With no base file, it is looked up in `.sai/` at the project root.
- An unknown id or an invalid value in the local file is handled as in the base file, with the warning naming `.sai/settings.local.jsonc`. A local file that cannot be parsed contributes nothing: its warning says that the local overrides are ignored and the base values apply, while an unparseable base file keeps its own warning that every setting asks its normal question.
- Every reader gets the merged value: the `get` command, the explore language gates, `/to-backlog`, `/from-backlog`, and `/to-pr`. The two publication consent keys are the one exception to the merge; see [Publication consent](#publication-consent).

### Publication consent

`publication.autoApprove` and `pr.publishAfterRun` can grant consent to push and publish. A push is visible to others, so the consent must come from the person who runs the command and not from a shared file. A **granting value** (`publication.autoApprove: true`, `pr.publishAfterRun: yes`) grants consent only when `.sai/settings.local.jsonc` holds it. A **restricting value** (`publication.autoApprove: false`, `pr.publishAfterRun: no` or `ask`) keeps its effect from either file, and a key that the local file holds always wins over the same key in the base file: a local `false` overrides a base `true`, and a local `yes` overrides a base `no`.

- A granting value that only `.sai/settings.jsonc` holds grants nothing. `/sai-plan`, `/sai-build`, and the `/sai-explore` route selector ask their publication question, and `/to-pr` and `/to-backlog` require the explicit approval.
- Each reader of the key then prints one warning that names the key and says that the value grants consent only from `.sai/settings.local.jsonc`, and the run continues. The warning appears whether or not the local file also holds the key, and only a read of one of these two keys carries it. To grant consent, move the value to `.sai/settings.local.jsonc`.
- A team that sets `no` in the base file sets a default, not a prohibition: a personal local `yes` overrides it. A team that wants everyone to publish automatically cannot say so in the committed file; each person enables it for themselves.
- Every other setting keeps reading the merged base and local files.

## Invalid input

- A file that cannot be parsed produces one warning naming the file and the parse error; every setting asks its normal question.
- An unknown setting id is ignored with a warning.
- A value outside its allowed set invalidates only that key, with a warning; the other keys still apply.
- A gate that cannot read a setting (an unreadable file, an invalid value, or an unavailable tool) treats it as absent, prints the warnings or one line naming the failure, and continues at the next level.

## Post-setup menu

Run `npx --allow-git=all github:mmadariaga/shared-ai setup`. When `setup` finishes in an interactive terminal, the `Post-setup customization:` menu lists these entries, in this order:

- **Model customization**: opens a submenu with `Customize models`, `Reset to default models`, `Save preset`, and `Load preset`; see [Model customization](models.md). When an action finishes or is cancelled, the menu returns to the main menu.
- **Language settings**: opens a submenu with `Ready to Propose language`, `Change overview language`, `Chat language`, and `PR/MR language`.
- **Backlog and PR settings**: opens a submenu with `Backlog provider`, `Pull requests provider`, and `Auto-approve publication`.
- **Telemetry: on|off**: a value row that opens the `On`/`Off` picker and returns to the main menu with the new value.
- **Cache warming**: opens the [cache warming screen](#cache-warming-screen); leaving it returns to the main menu.
- **Exit**: closes the menu.

Each submenu row shows `<label>: <current value>`, and choosing a row opens that setting's value picker:

- **Ready to Propose language** (`explore.readyToProposeLanguage`): `ask`, `English`, or a language name you type.
- **Change overview language** (`explore.overviewLanguage`): `ask`, `English`, `none`, or a language name you type.
- **Chat language** (`explore.chatPublicLanguage`): `follow my language`, `English`, or a language name you type. `follow my language` removes the key from the file that holds it.
- **PR/MR language** (`pr.language`): `English` or a language name you type. `English` removes the key from the file that holds it, because an absent key reads as `English`.
- **Backlog provider** (`backlog.provider`): `ask` or a provider id from the provider registries.
- **Pull requests provider** (`pr.provider`): `ask` or a provider id from the `/to-pr` registry.
- **Auto-approve publication** (`publication.autoApprove`): `On` or `Off`; the row shows the value that takes effect, `on` or `off`, and an absent key shows `off`. A `true` that only `.sai/settings.jsonc` holds grants nothing (see [Publication consent](#publication-consent)), so it shows `off`. `On` writes `true` and `Off` writes `false`, both to `.sai/settings.local.jsonc`, which the menu creates when it is absent; the menu never edits `.sai/settings.jsonc` for this key. When git does not ignore `.sai/settings.local.jsonc`, the menu warns that committing it shares the grant with every clone; it never edits `.gitignore`.
- **Telemetry** (`experimental.changeTelemetry`): `On` or `Off`; the row shows `on` or `off`, and an absent key shows `off`. `On` writes `true`. `Off` removes the key from `.sai/settings.jsonc`, because an absent key reads as `false`. When `.sai/settings.local.jsonc` holds the key, `Off` writes `false` there, so a `true` in the base file cannot apply.

Every value you choose is saved at once, so nothing is pending: after a choice in a submenu you stay in that submenu and its row shows the new value, **Back** or **Esc** in a submenu returns to the main menu with the cursor on that section, and Ctrl-C closes the menu and keeps every value already chosen. Leaving a picker with **Back** or **Esc**, or leaving the `Other language...` text empty, saves nothing. A save that fails (for example when the file cannot be written) shows the error, leaves the value as it was, and keeps you in the submenu.

`backlog.repository`, `backlog.project`, `backlog.organization`, and the other `pr.*` keys (`pr.publishAfterRun` included) stay hand-edited; the menu has no `pr.publishAfterRun` row, and a `yes` for it belongs in `.sai/settings.local.jsonc`, where the settings writer sends that key too. A typed language name is checked like the reader checks it, and an entry that is not accepted is asked again. The menu writes the canonical form (`English`, `None`).

Choosing `ask` writes the string `"ask"`, which keeps the normal question and keeps the key's comment in the file. A stored value outside its allowed set shows with the reader's warning when its submenu or picker opens, and you may replace it.

A key that `.sai/settings.local.jsonc` holds shows as an override: the base value struck through, then the local value, then the marker `(local)`. Without a TTY, or with `NO_COLOR` set, the strikethrough is dropped and the row reads `base -> local (local)`. The menu saves a key that the local file holds to the local file and leaves the base file unchanged. It saves every other key to the base file. It never creates the local file. Choosing `follow my language` for a key in the local file removes it there, so the base value applies again.

The files are edited in place: comments, other keys, and every byte outside the edited value stay as they were. The first save creates `.sai/settings.jsonc`. Choosing the value a key already holds touches nothing. A file that cannot be parsed, the local file included, is reported when its submenu or picker opens and is never rewritten. Without a TTY the menu is skipped.

## Reader

`sai/tools/project-settings.js` reads and validates both files and writes nothing. It has no dependencies. The screen writes through `bin/project-settings-writer.js`, which validates each value through the reader's catalogue and picks the target file per key.

```sh
node sai/tools/project-settings.js get backlog.provider --json --cwd <project-root>
```

It prints `{value, source, warnings}`, where `value` is the merged value, `source` is `setting` or `absent`, plus `notices` when it read the main worktree's file.
