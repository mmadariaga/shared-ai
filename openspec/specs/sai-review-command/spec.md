# sai-review-command Specification

## Purpose

Defines the `/sai-review` user-invoked routed composition command that runs the review phase and conditionally dispatches recommended audit phases as chained segments of a single supervising invocation.

## Requirements

### Requirement: /sai-review is a user-invoked routed composition command

The pipeline SHALL provide a user-invoked command `/sai-deep-review`, not an `opsx:*` skill, run through both harness wrappers with the `deep-review` command name. Each wrapper SHALL load the harness fetch skill and `sai/commands/deep-review/coordinator.md` and forward the invocation envelope, with no boot adapter and no command bootstrap. The coordinator SHALL follow the review coordinator as its first segment, then run the activated audits as cycles of the shared audit coordinator, the Assessment pass, and the `/sai-3-implement` fix segment in the same session. `/sai-deep-review` SHALL NOT declare a managed worker, worker binding, or worker matrix entry of its own; every segment SHALL keep its existing worker.

#### Scenario: Both harnesses route the composition
- **WHEN** a user invokes `/sai-deep-review {name}` on Claude Code or opencode, with or without options
- **THEN** the harness wrapper SHALL fetch the fetch skill and the deep-review coordinator, forward the `deep-review` envelope with the complete argument string in `arguments_value`, and run the coordinator without fetching a boot adapter or re-entering any wrapper

### Requirement: Single change resolution with composition-minted envelopes

After dropping `--fast-track` and splitting off the options, the run SHALL resolve the change name once, through the review segment: the leftover change-name token, or, when it is empty, the only change with a `proposal.md`, as the review coordinator says. The run SHALL keep that name for every later segment and hand each segment the name followed by `{options-for-<phase>}`, the possibly empty list of user-supplied options that the phase's own `options.md` declares, in the order and with the values the user wrote them. No later segment SHALL resolve the change again.

#### Scenario: One resolved name across all segments
- **WHEN** the review segment and an activated audit cycle run in one invocation
- **THEN** both SHALL use the same resolved change name and the audit cycle SHALL NOT re-run change resolution

### Requirement: Prerequisites run once at composition start

The `/sai-deep-review` coordinator SHALL run no OpenSpec prerequisite check and SHALL NOT fetch `@sai/policies/prereqs.md`; that check belongs to `/sai-explore` alone. The coordinator SHALL load only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, and `finding-state`, and no audit cycle SHALL run a prerequisite check.

#### Scenario: Segments inherit satisfied prerequisites
- **WHEN** the review segment completes and an audit cycle activates
- **THEN** neither the coordinator start nor the audit cycle runs a prerequisite check

### Requirement: No intermediate approval gate and review-first re-entry

A completed review segment SHALL lead immediately to the triage and the activated audit cycles, without stopping for artifact feedback, plan review, or user approval. Activation follows the triage parse, or `--full` / `--path` when given. Re-entry after an interruption SHALL go through the review segment again and regenerate the activated audit reports; only the fix segment resumes, through `/sai-3-implement`. Without `--full` or `--path`, the on-disk `review.md` triage sections SHALL remain the activation record. A review that finds no changes against the parent branch SHALL close the run with no audits, including when `--full` or `--path` was given.

#### Scenario: Failed review closes the invocation
- **WHEN** the review segment fails, or ends on an escalation the user stopped or left unanswered
- **THEN** the run SHALL activate no audit cycle, SHALL print the review segment's report, and SHALL end without a closing line

### Requirement: /sai-review accepts the union of its segments' declared options

After dropping every `--fast-track` token silently, `/sai-deep-review` SHALL fetch the review, security, performance, and accessibility `options.md` declarations. It SHALL accept exactly the union of the options they list and SHALL keep no list of its own. A token starting with `--` is an option. An option that takes a value (`--path`, `--tier`, `--url`, `--parent-branch`) SHALL consume the next token as its value. The one leftover token is the change name. With options and no change name, the review segment SHALL resolve the only change with a `proposal.md` and the options SHALL be kept.

#### Scenario: Options after the change name
- **WHEN** a user invokes `/sai-deep-review my-change --full`
- **THEN** `my-change` resolves as the change name and `--full` is kept as an option rather than read as part of the name

#### Scenario: Options without a change name
- **WHEN** a user invokes `/sai-deep-review --runtime` with one change that has a `proposal.md`
- **THEN** the review segment resolves that change and `--runtime` is kept for the audits that declare it

### Requirement: Undeclared input stops /sai-review before any dispatch

The coordinator SHALL stop before any dispatch, writing nothing, with `Cannot start /sai-deep-review: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.` naming the offending token, in four cases:
- an option that no segment declaration lists;
- an option missing its value;
- a value outside the set a declaration lists;
- a second leftover token.

#### Scenario: Option no segment accepts
- **WHEN** a user invokes `/sai-deep-review my-change --foo`
- **THEN** the command stops before any dispatch with a message that names `--foo`

### Requirement: Each segment receives only the options its command declares

Each segment envelope SHALL carry the change name plus only the options the segment's own `options.md` declares. The review segment SHALL never receive `--full` or `--path`; it keeps reviewing the diff.

#### Scenario: Options split across segments
- **WHEN** `/sai-deep-review my-change --tier db --parent-branch develop` runs and the performance audit activates
- **THEN** the review envelope carries `my-change --parent-branch develop`, and the performance envelope carries `my-change --tier db --parent-branch develop`

### Requirement: --full or --path runs the three audits without the triage

When `--full` or `--path` is given and the review segment completes successfully, the composition SHALL activate the security, performance, and accessibility audits without the triage parse. The Error close for a missing or illegible `review.md` SHALL NOT apply.

#### Scenario: Full scope skips the triage
- **WHEN** `/sai-deep-review my-change --full` runs and the review completes with every triage value `No`
- **THEN** all three audits activate, each with `--full` in its envelope

#### Scenario: Empty diff still ends with no audits
- **WHEN** `/sai-deep-review my-change --path src` runs and the review returns `no-changes` on an empty diff
- **THEN** the composition closes with no audit dispatched

### Requirement: Options aimed at segments that did not run are reported

The final summary SHALL print one line for each option aimed only at a segment that did not run, stating that the option had no effect and naming that segment. These lines SHALL print before the run's unchanged standard close.

#### Scenario: Tier for an inactive performance audit
- **WHEN** `/sai-deep-review my-change --tier db` runs and the performance audit is not activated
- **THEN** the summary states that `--tier` had no effect because performance did not run

### Requirement: /sai-review asks mid-run only with --runtime

`/sai-deep-review` SHALL ask the user nothing between its start and its close except the accessibility dev-server URL, asked once before the audit workers are created when accessibility is activated with `--runtime` and without `--url`; an audit worker question that nothing answers and whose answer would change the report, which pauses only that audit; and the escalation of an obstacle in the review or fix segment. `--runtime` SHALL be the whole authorization for the runtime diagnostics and scanners, and no audit SHALL ask a runtime authorization question. There SHALL be no findings round.

#### Scenario: No runtime option
- **WHEN** `/sai-deep-review my-change` runs and the performance and accessibility audits activate
- **THEN** neither audit asks a runtime question and the run asks no findings selection question
