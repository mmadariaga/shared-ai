# incremental-review Specification

## Purpose
Defines the shared pass, findings-ledger, and Pre-existing rules that let the coordinator review-fix loops of /sai-3-implement and Direct Build converge: a full first pass, then later passes over only the delta and its direct consumers.

## Requirements

### Requirement: One shared policy governs the two coordinator review-fix loops

The pass rules of the `/sai-3-implement` step review and of the Direct Build functional fix loop (Step 2 of `sai/commands/explore/steps/pipeline-direct-build.md`) SHALL live in `sai/policies/incremental-review.md`, which both loops SHALL fetch. `/sai-4-review`, the Direct Build suite-gate rounds (Step 2b), and every other review loop SHALL NOT load the policy and SHALL keep their own behavior. The starting point of a loop SHALL be `base_sha` in Direct Build and HEAD before the step in `/sai-3-implement`.

#### Scenario: The review command stays a full review
- **WHEN** `/sai-4-review` runs
- **THEN** its coordinator does not load `incremental-review.md` and the review reads the full diff

### Requirement: First pass full, later passes the delta plus its direct consumers

The first pass of a loop SHALL review the loop's full diff: in `/sai-3-implement` the step's staged diff (`git diff --cached`), with every step starting again with a full pass over its own diff; in Direct Build `git diff` from `base_sha`. Every later pass SHALL review only the delta from the previous pass's snapshot to the current one, plus the direct consumers of the code the delta changed. The consumer lookup SHALL be one `budget-explorer` dispatch with its two-phase startup, receiving the paths and symbols the delta changed and returning at most 30 direct consumers as `file:line` entries with no source text; the coordinator SHALL add no availability probe and no second search path. When the lookup fails or returns nothing usable, the pass SHALL review the delta alone, state in its report that consumers were not reviewed, and not block the loop.

#### Scenario: A later pass after a fix round
- **WHEN** a fix round changed two files
- **THEN** the next pass reviews only the delta of those files and the direct consumers the explorer returned, not the full diff

#### Scenario: The consumer lookup fails
- **WHEN** the explorer dispatch fails during a later pass
- **THEN** the pass reviews the delta alone, its report states that consumers were not reviewed, and the loop continues

### Requirement: Empty delta and missing snapshot

When a fix round changed nothing, the next pass SHALL review no code, the open findings SHALL stay open, and the round SHALL count toward the cap. When the previous snapshot identifier is missing or the snapshot tool answered `n/a`, the pass SHALL review the full diff.

#### Scenario: A fix round changes nothing
- **WHEN** the delta after a fix round is empty
- **THEN** the next pass reads no code, the open findings stay open, and the round counts toward the cap

#### Scenario: The snapshot is lost
- **WHEN** the previous snapshot identifier is not available
- **THEN** the next pass reviews the loop's full diff

### Requirement: Shared cap with a final report-only pass

Both loops SHALL run at most 3 fix rounds and then one final pass over the round-3 delta and its consumers. The final pass SHALL only report and SHALL send nothing to a worker; its findings SHALL go to the loop's pending record. A pass with no open finding SHALL converge the loop.

#### Scenario: Findings remain after the third fix round
- **WHEN** the third fix round completes
- **THEN** one final pass reviews the round-3 delta and its consumers, sends nothing to a worker, and records its findings as pending

### Requirement: Findings ledger

Each loop SHALL keep a ledger of its findings with one state per finding: `open`, `fixed`, `scope` (a scope observation of `sai/policies/artifact-review-contract.md`), or `Pre-existing`. A finding sent for fixing SHALL stay `open` until a later pass confirms it fixed; when the delta does not touch its area it SHALL be carried into the next round as open without re-reading the full diff. The ledger SHALL match a finding across passes by its location and issue and keep the identifier of its first appearance. A `fixed`, `scope`, or `Pre-existing` finding SHALL be reported again only when the delta changes its area.

#### Scenario: A fixed finding is not reported again
- **WHEN** a later pass's delta does not touch the area of a finding marked `fixed`
- **THEN** the pass does not report that finding again

#### Scenario: An open finding outside the delta
- **WHEN** a finding is still open and the delta does not touch its area
- **THEN** the finding is carried into the next round as open without re-reading the full diff

### Requirement: Pre-existing findings are decided by cause and never fixed in the loop

A finding SHALL be `Pre-existing` only when its problem also exists at the starting point, decided by cause and not by line. The reviewer SHALL read the file at the starting point with `git show <ref>:<path>`, without creating a worktree; a file absent at the starting point SHALL NOT yield a `Pre-existing` finding. A break the change causes in a consumer on an untouched line SHALL be an ordinary finding and SHALL open a fix round. A `Pre-existing` finding SHALL never be sent to a worker, SHALL NOT prevent convergence, and SHALL be reported once at the end in the loop's closing report.

#### Scenario: A consumer the change broke
- **WHEN** the change breaks a consumer whose lines the change did not touch
- **THEN** the finding is ordinary and opens a fix round

#### Scenario: A problem already present at the starting point
- **WHEN** a finding's problem also exists in the file at the starting point
- **THEN** it is marked `Pre-existing`, sent to no worker, and reported at the end
