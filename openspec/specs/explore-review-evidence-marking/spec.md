# explore-review-evidence-marking Specification

## Purpose

TBD - seeded from delta spec `explore-review-evidence-marking` in change `explore-idea-progress-plan`.

## Requirements

### Requirement: review-item-no-high-pass-marks

A reviewed-sai-1 item SHALL be marked exactly when the most recent completed review over that slice's available sai-1 artifact set reports no High findings, and SHALL be cleared exactly when the most recent completed review reports at least one High finding. A reviewed-sai-2 item SHALL follow the same rule for that slice's sai-2 artifact set. A review transaction that ends without a completed review — an absence report for a missing change directory or missing artifact set (item 9 of `sai/commands/explore/instructions.md`), a review blocked by missing specs, or a failed or cancelled pipeline reviewer — SHALL leave the item unchanged. The marking evidence SHALL come from either entry path: the manual post-crystallization review loop (item 9 of `sai/commands/explore/instructions.md`), whose review closes with the base-form `Summary: High=<count> Medium=<count> Low=<count>` tally, and the supervised pipeline (item 10), whose pass converges on a pass with no High findings. The severity vocabulary, finding shape, and tally form SHALL be applied by reference to `@sai/policies/artifact-review-contract.md` and SHALL NOT be restated.

A completed `Review change-overview` transaction (per the `explore-post-crystallization-review-loop` capability) SHALL participate in reviewed-sai-2 marking on the same evidence rule: a completed `Review change-overview` closing with `High=0` SHALL mark the slice's reviewed-sai-2 item, and a completed `Review change-overview` reporting at least one High finding SHALL clear it. Precedence SHALL be by the most recent completed review over the sai-2 slice: when both a `Review sai-2's artifacts` transaction and a `Review change-overview` transaction complete, the most recent one's High-finding outcome decides the reviewed-sai-2 item's marked state. A `Review change-overview` over an overview that does not exist produces an absence report and SHALL leave the item unchanged.

#### Scenario: manual sai-1 review without High findings marks the item

- **WHEN** the review loop's `Review sai-1's artifacts` transaction over the slice's change closes with a tally reporting `High=0`
- **THEN** the slice's reviewed-sai-1 item is marked

#### Scenario: medium and low findings do not block marking

- **WHEN** a completed review pass reports only Medium and/or Low findings
- **THEN** the corresponding review item is marked
- **AND** the item is not cleared by that pass

#### Scenario: supervised spec convergence marks the sai-1 item

- **WHEN** a supervised spec pass completes with no High findings
- **THEN** the slice's reviewed-sai-1 item is marked

#### Scenario: supervised design convergence marks the sai-2 item

- **WHEN** a supervised design pass completes with no High findings
- **THEN** the slice's reviewed-sai-2 item is marked

#### Scenario: completed Review change-overview with no High findings marks reviewed-sai-2

- **WHEN** the review loop's `Review change-overview` transaction over the slice's change closes with a tally reporting `High=0`
- **THEN** the slice's reviewed-sai-2 item is marked

#### Scenario: Review change-overview with High findings clears reviewed-sai-2

- **WHEN** a completed `Review change-overview` transaction reports at least one High finding
- **THEN** the slice's reviewed-sai-2 item is cleared

#### Scenario: most recent review over the sai-2 slice decides precedence

- **WHEN** a `Review sai-2's artifacts` transaction and a later `Review change-overview` transaction both complete over the same slice, and the later overview review reports a High finding
- **THEN** the slice's reviewed-sai-2 item is cleared, because the most recent completed review over the sai-2 slice decides

#### Scenario: Review change-overview over a missing overview leaves the item unchanged

- **WHEN** a `Review change-overview` transaction reports that the overview does not exist (an absence report)
- **THEN** the slice's reviewed-sai-2 item is neither marked nor cleared

#### Scenario: Review change-overview over a non-current overview leaves the item unchanged

- **WHEN** a `Review change-overview` transaction produces an availability/integrity report because `overview.state` is `materializing`, `failed`, `stale`, or `unmaterialized` (or current metadata is paired with a missing/not-`done` file), rather than a completed review
- **THEN** the slice's reviewed-sai-2 item is neither marked nor cleared, because the transaction produced no findings tally

#### Scenario: an empty completed pass marks

- **WHEN** a supervised pass completes over available artifacts with no findings at all
- **THEN** the corresponding review item is marked

#### Scenario: a later pass with High findings clears the item

- **WHEN** a completed review over an already-marked item's slice reports at least one High finding
- **THEN** the corresponding review item is cleared

#### Scenario: a later no-High pass re-marks a cleared item

- **WHEN** a completed review over a cleared item's slice reports no High findings
- **THEN** the corresponding review item is marked again

#### Scenario: an absence report leaves the item unchanged

- **WHEN** a review transaction reports a missing change directory or a missing artifact set
- **THEN** the corresponding review item is neither marked nor cleared

#### Scenario: a blocked review leaves the item unchanged

- **WHEN** a sai-1 review is blocked because the normative specs are missing
- **THEN** the slice's reviewed-sai-1 item is neither marked nor cleared

#### Scenario: a failed or cancelled reviewer leaves the item unchanged

- **WHEN** a supervised reviewer returns `review_failed` or `review_cancelled`
- **THEN** the corresponding review item is neither marked nor cleared

### Requirement: review-item-per-slice-targeting

A review pass over one slice's change SHALL mark or clear only that slice's review items. The review items of every other slice SHALL remain unchanged by that pass.

#### Scenario: a pass over one slice leaves the other slice's items unchanged

- **WHEN** a review pass completes over slice 1's change while slice 2 also has review items
- **THEN** only slice 1's corresponding review item is marked or cleared
- **AND** slice 2's corresponding review item is unchanged

### Requirement: review-item-evidence-only-marking

Review items SHALL be marked or cleared only from the review-pass evidence of this capability. The list SHALL NOT mark, add, or remove any item from artifact reads, repository state, plan progression, or the completion of any other command or session.

#### Scenario: artifact existence does not mark

- **WHEN** `implementation.md` or any other artifact exists on disk for the slice's change
- **THEN** no review item is marked or cleared from its existence or contents

#### Scenario: another command's completion does not mark

- **WHEN** `/sai-2-design` or any other command completes for the slice's change
- **THEN** no review item is marked or cleared without a review pass

#### Scenario: session progression does not mark

- **WHEN** the explore session continues past crystallization without a review pass
- **THEN** the slice's review items remain unchanged
