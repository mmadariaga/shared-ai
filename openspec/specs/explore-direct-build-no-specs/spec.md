# explore-direct-build-no-specs Specification

## Purpose
TBD

## Requirements

### Requirement: Direct Build no-specs profile runs only viability steps

The Direct Build `--no-specs` profile SHALL be dispatched only from inside the POC lane, the conditional stage between `Explore change` and `Review edge cases`. Its envelope SHALL open with the line `--direct-build --no-specs` followed by the line `--work-root <path>`, carrying the path of the POC isolation worktree the lane recorded at creation, and SHALL carry no block file or hash line. The implementer SHALL read and write only under that work root. It SHALL run only the implementer and functional fix loop (Steps 1 and 2) and SHALL return to the lane, which forms the verdict naming the winning agreed candidate or none. It SHALL NOT run backfill, spec review, ADR or DDR processing, artifact archive, or other Steps 3 through 8 behavior. It SHALL NOT create or modify anything under `openspec/`, create planning artifacts, or run mutating Git commands. The POC SHALL be a direct worker dispatch that emits nothing to `explore-slice@1` and bypasses the slice machine entirely, so the NO_PENDING_SLICE rejection SHALL NOT apply to it. Dirty implementation code is acceptable, and minimal tests or human observation provide the verdict authority. The implementer's `changed_files` union SHALL be returned to the lane for verdict assessment.

The profile SHALL be pinned: it SHALL NOT be offered by the crystallization-close route selector, SHALL NOT be reachable as the Plan or the Manual route, and SHALL NOT be altered by `--fast-track`, which SHALL neither add back a skipped step, nor remove one of Steps 1 and 2, nor auto-approve any of the lane's three stops. The POC's writes SHALL be confined to the lane's POC isolation, a dedicated sibling worktree on an exclusive branch, and SHALL be discarded only when the user confirms `Destroy the POC` at a lane exit; otherwise the worktree and branch SHALL be kept and their location reported. The prohibition on mutating Git commands SHALL bind the dispatched implementer only and SHALL NOT bind the lane's own creation and confirmed destruction of that isolation.

#### Scenario: no-specs runs the implementer and fix loop

- **WHEN** the user accepts the go/no-go and the agreed candidate list is recorded
- **THEN** Direct Build runs only the implementer and functional fix loop and returns its result to the POC lane

#### Scenario: no-specs skips artifact and archive work

- **WHEN** the Direct Build `--no-specs` profile is active
- **THEN** it dispatches no backfill or archive worker and performs no OpenSpec artifact, spec, or archive operation

#### Scenario: no-specs preserves the OpenSpec boundary

- **WHEN** the implementer-only POC executes
- **THEN** it writes only the authorized code, tests, or required project configuration outside `openspec/`, only under its `--work-root` path, and runs no mutating Git command

#### Scenario: POC changes are returned for verdict assessment

- **WHEN** the no-specs implementer and fix loop complete
- **THEN** their first-seen `changed_files` union is returned to the POC lane, which forms the `<Cn> wins` or `none` verdict

#### Scenario: POC bypasses the slice machine

- **WHEN** the POC lane dispatches the `--no-specs` POC
- **THEN** the POC runs implementer plus fix loop only, with no slice-machine emit, no openspec writes, and no archive

#### Scenario: the profile is never a route option

- **WHEN** the crystallization-close route selector is presented
- **THEN** it offers exactly its three routes and never offers the `--no-specs` profile as Plan, as Manual, or as a fourth option

#### Scenario: fast-track cannot alter the profile

- **WHEN** `--fast-track` is active while the POC lane dispatches the profile
- **THEN** Steps 1 and 2 run unchanged, no skipped step returns, and none of the lane's three stops is auto-approved

#### Scenario: the envelope carries the recorded work root

- **WHEN** the POC lane dispatches the `--no-specs` profile after creating the POC isolation
- **THEN** the envelope's second line is `--work-root <path>` naming the recorded worktree path, it carries no block file or hash line, and the implementer reads and writes only under that path

### Requirement: Direct Build no-specs backfill route choice

At Step 3 the Direct Build coordinator SHALL run `backfill-no-specs.js compose` with the verified block file and hash, the change name, and the transfer directory before any backfill worker dispatch. The no-specs route SHALL apply only when the block declares `**Specs**: none — <reason>` and `openspec/changes/{name}/specs/` holds no file; every other block, including one that declares `**Specs**: none` while `specs/` already holds files, SHALL follow the worker route through `sai-backfill-worker` unchanged. A compose error SHALL be an obstacle of `step-3`. The route choice SHALL be the same for `/sai-explore` and `/sai-direct-build` on Claude Code and opencode, and SHALL NOT change standalone `/sai-backfill` or the `--no-specs` POC lane.

#### Scenario: A no-specs block with an empty specs directory takes the no-specs route

- **WHEN** the verified block declares `**Specs**: none — <reason>` and `openspec/changes/{name}/specs/` holds no file
- **THEN** `compose` answers `eligible: true` and the coordinator creates no backfill worker, opens no backfill guard window, and sends no prepare dispatch

#### Scenario: Existing spec files keep the worker route

- **WHEN** the block declares `**Specs**: none` but `openspec/changes/{name}/specs/` already holds a file
- **THEN** `compose` answers `eligible: false` and the change follows the worker route

#### Scenario: A block without the no-specs line keeps the worker route

- **WHEN** the verified block carries no `**Specs**: none — <reason>` line
- **THEN** `compose` answers `eligible: false` and the change follows the worker route

### Requirement: The no-specs drafts derive from the verified block

`backfill-no-specs.js compose` SHALL verify the block file against its hash, SHALL refuse a block that is not a valid Ready to Propose block or that names another change, and SHALL write exactly two drafts into the transfer directory with `transfer.js put`, printing one `{path, sha256, destination}` reference per draft. The `.openspec.yaml` draft SHALL carry `schema: sai-workflow`, a date-only `created`, `backfilled: true`, `prior_intent: true`, and `skip_specs: true`, plus `backlog_origin` and `explore_origin` when the block supplies them. The `proposal.md` draft SHALL open with the usable-intent post-hoc banner, SHALL carry the proposal template sections with `None` under both capability subsections, SHALL carry the block's Capabilities in scope, Edge Cases, and Key constraints under `## Impact` followed by the out-of-scope line, SHALL carry a `## Proposal Research Documentation` section listing the paths of the block's Research Leads, SHALL copy the block's Request Additional Notes verbatim into `## Request Additional Notes` when present, and SHALL carry the block's Decisions & Rationale under `## Additional Notes` when present. A supplied origin that is not valid SHALL be left out with a warning and SHALL NOT block the route.

#### Scenario: Compose writes the canonical metadata and proposal

- **WHEN** `compose` runs on an eligible verified block with an explore origin
- **THEN** the transfer directory holds `.openspec.yaml` with the five canonical keys and `explore_origin`, and `proposal.md` with the post-hoc banner and the block-derived sections, and stdout lists their two references

#### Scenario: A block that does not match its hash writes nothing

- **WHEN** the block file does not match the supplied hash
- **THEN** `compose` returns an error and writes no draft

#### Scenario: An invalid supplied origin warns without blocking

- **WHEN** `compose` receives a `--backlog-origin` value that is not a canonical issue URL
- **THEN** the value is left out of `.openspec.yaml`, a warning names it, and the drafts are still written

### Requirement: No-specs drafts are validated without a correction round

On the no-specs route the coordinator SHALL run `transfer.js verify` on both references, the read-only schema review of the draft content, and `validate-backfill-drafts.js validate`, and SHALL run no scenario-preservation check, no review round, and no correction request. A draft set that fails any of these checks SHALL be an obstacle of `step-4` that escalates under the obstacle-escalation policy and writes nothing to the repository. The validation reason `openspec-cli-unavailable` SHALL stay force majeure that escalates at once. When the drafts are accepted, the coordinator SHALL retain the accepted fingerprint and references in the run state, and the `Backfill` route item SHALL converge at that acceptance.

#### Scenario: Accepted no-specs drafts converge Backfill

- **WHEN** both generated drafts pass verification, the schema review, and `validate-backfill-drafts.js validate`
- **THEN** the coordinator keeps the fingerprint and references, the `Backfill` route item converges, and no backfill execute order is sent at Step 6

#### Scenario: Failed no-specs drafts escalate without correction

- **WHEN** a generated draft fails validation
- **THEN** the coordinator requests no correction, writes nothing to the repository, and escalates the `step-4` obstacle
