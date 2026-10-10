# sai-review-command Specification

## Purpose

Defines the `/sai-review` user-invoked routed composition command that runs the review phase and conditionally dispatches recommended audit phases as chained segments of a single supervising invocation.

## Requirements

### Requirement: /sai-review is a user-invoked routed composition command

The pipeline SHALL provide a user-invoked command `/sai-review` that is a routed composition command, not an `opsx:*` skill, run through both harness wrappers and the `meta-review` card name. The command SHALL run the existing review phase adapter at position 0 to completion, then conditionally dispatch the recommended audit phase adapters as chained segments of one supervising invocation. `/sai-review` SHALL NOT declare a managed worker, worker binding, or worker matrix entry of its own; every segment SHALL retain its existing worker.

#### Scenario: Both harnesses route the composition
- **WHEN** a user invokes `/sai-review {name}` on Claude Code or opencode, with or without options
- **THEN** the harness wrapper SHALL fetch its boot adapter and the meta-review command-bootstrap, forward the `meta-review` envelope with the complete argument string in `arguments_value`, and run the composition coordinator without re-entering any wrapper

### Requirement: Single change resolution with composition-minted envelopes

After stripping `--fast-track` and splitting off the options, the composition SHALL resolve the target OpenSpec change name exactly once at invocation start. It SHALL use the standard change-consuming resolution order: the leftover change-name token, then the zero/one/multiple picker. It SHALL mint each segment envelope as `{command_name: <phase>, arguments_value: {name} {options-for-<phase>}}`. `{options-for-<phase>}` is the possibly empty list of user-supplied options that the phase's own `options.md` declares, in the order and with the values the user wrote them. Segments SHALL NOT re-run the change-picker or the prerequisite checks.

#### Scenario: One resolved name across all segments
- **WHEN** the review segment and an activated audit segment run in one invocation
- **THEN** both SHALL receive the same resolved change name in their composition-minted envelopes and neither SHALL re-run resolution

### Requirement: Prerequisites run once at composition start

The `/sai-review` composition coordinator SHALL run no OpenSpec prerequisite check and SHALL NOT fetch `@sai/policies/prereqs.md`; that check belongs to `/sai-explore` alone. It SHALL fetch `@sai/policies/prereqs-paths.md` for the artifact path table, and no segment SHALL run a prerequisite check.

#### Scenario: Segments inherit satisfied prerequisites
- **WHEN** the review segment completes and an audit segment activates
- **THEN** neither the composition start nor the audit segment runs a prerequisite check

### Requirement: No intermediate approval gate and review-first re-entry

A successful review segment SHALL transition immediately to the activated audit segments, without stopping for artifact feedback, plan review, or user approval. Activation follows the triage parse, or `--full` / `--path` when given. Re-entry after interruption or partial audit execution SHALL go through the review segment again; the run SHALL never resume audit loops directly while skipping review regeneration. Without `--full` or `--path`, the on-disk `review.md` triage sections SHALL remain the activation record. A review that ends on an empty diff returns `cancelled`. The composition SHALL then close with no audits, including when `--full` or `--path` was given.

#### Scenario: Failed review closes the invocation
- **WHEN** the review segment returns `failed` or `cancelled`
- **THEN** the composition SHALL close without activating any audit segment and SHALL report the failure or clean-stop summary, the accumulated changed-files union, and one line per option aimed only at an audit stating that it had no effect

### Requirement: /sai-review accepts the union of its segments' declared options

After stripping every `--fast-track` token as a behavioral no-op, `/sai-review` SHALL fetch the review, security, performance, and accessibility `options.md` declarations. It SHALL accept exactly the union of the options they list, and the composition SHALL keep no list of its own. A token starting with `--` is an option. An option that takes a value (`--path`, `--tier`, `--parent-branch`) SHALL consume the next token as its value. The one leftover token is the change name. With options and no change name, the picker SHALL resolve the change and the options SHALL be kept.

#### Scenario: Options after the change name
- **WHEN** a user invokes `/sai-review my-change --full`
- **THEN** `my-change` resolves as the change name and `--full` is kept as an option rather than read as part of the name

#### Scenario: Options without a change name
- **WHEN** a user invokes `/sai-review --runtime` with one active change
- **THEN** the picker resolves the change and `--runtime` is kept for the segments that declare it

### Requirement: Undeclared input stops /sai-review before any dispatch

The composition SHALL stop before any dispatch with a message naming the offending token in three cases:
- an option that no segment declaration lists;
- an option missing its value;
- a second leftover token, with a message stating that the parent branch is written `--parent-branch <branch>`.

#### Scenario: Option no segment accepts
- **WHEN** a user invokes `/sai-review my-change --foo`
- **THEN** the command stops before any dispatch with a message that names `--foo`

### Requirement: Each segment receives only the options its command declares

Each segment envelope SHALL carry the change name plus only the options the segment's own `options.md` declares. The review segment SHALL never receive `--full` or `--path`; it keeps reviewing the diff.

#### Scenario: Options split across segments
- **WHEN** `/sai-review my-change --tier db --parent-branch develop` runs and the performance audit activates
- **THEN** the review envelope carries `my-change --parent-branch develop`, and the performance envelope carries `my-change --tier db --parent-branch develop`

### Requirement: --full or --path runs the three audits without the triage

When `--full` or `--path` is given and the review segment completes successfully, the composition SHALL activate the security, performance, and accessibility audits without the triage parse. The Error close for a missing or illegible `review.md` SHALL NOT apply.

#### Scenario: Full scope skips the triage
- **WHEN** `/sai-review my-change --full` runs and the review completes with every triage value `No`
- **THEN** all three audits activate, each with `--full` in its envelope

#### Scenario: Empty diff still ends with no audits
- **WHEN** `/sai-review my-change --path src` runs and the review returns `cancelled` on an empty diff
- **THEN** the composition closes with no audit dispatched

### Requirement: Options aimed at segments that did not run are reported

The final summary SHALL print one line for each option aimed only at a segment that did not run, stating that the option had no effect and naming that segment. These lines SHALL print before the run's unchanged standard close.

#### Scenario: Tier for an inactive performance audit
- **WHEN** `/sai-review my-change --tier db` runs and the performance audit is not activated
- **THEN** the summary states that `--tier` had no effect because performance did not run

### Requirement: /sai-review asks mid-run only with --runtime

`/sai-review` SHALL ask no question mid-run unless the user passes `--runtime`. With `--runtime`, each segment's runtime question SHALL pause only that segment.

#### Scenario: No runtime option
- **WHEN** `/sai-review my-change` runs and the performance and accessibility audits activate
- **THEN** neither audit returns a runtime `needs_input`
