# backfill-unattended-intake Specification

## Purpose

TBD — created by archive sync of change unattended-backfill. Describe: pinned-label crystallized-block intake with three-step label → mine → ask field resolution.
## Requirements
### Requirement: Crystallized-block intake replaces intent capture

When the request body contains the `## Ready to Propose` heading together with its byte-exact pinned labels (`**Change name**:`, `**What**:`, `**Why**:`, `**Capabilities in scope**:`, `**Alternatives Considered**:`, `**Trade-offs Accepted**:`, `**Key constraints**:`, `**Edge Cases**:`, `**Implementation Details**:` among them), `/sai-backfill` SHALL treat the pasted block as supplied structured intent and SHALL NOT present the optional intent-capture choice. Detection SHALL be binary via the pinned labels: text without them SHALL fall through intact to the generic flow with no partial parsing. Records derived from a detected block SHALL enter intent reconciliation identically to statement-derived records, retaining no raw statement, taking the usable-intent path everywhere below including the four-key `prior_intent` form.

#### Scenario: Pinned labels route to structured intake
- **WHEN** an invocation's request body contains the `## Ready to Propose` heading with its pinned labels
- **THEN** the intent-capture choice is never presented and the flow proceeds directly into intent reconciliation with block-derived records

#### Scenario: Unlabeled paste falls through intact
- **WHEN** pasted text lacks the pinned labels
- **THEN** the command runs today's generic flow unchanged and never partially parses the text as a block

### Requirement: Consumed block fields resolve label then mined prose then ask

Every consumed block field SHALL resolve through the same three steps, identically with and without `fast_track_active`: use the labeled value when the pinned label is present and carries content (a `- None` bullet counts as no content); otherwise mine the answer from the surrounding pasted prose even off-format; otherwise restore that question's ordinary ask channel in the interview phase. Mined answers feed proposal prose only and never become normative requirements without qualifying evidence.

#### Scenario: Labeled Why answers Question 1 without asking
- **WHEN** the block carries a non-empty `**Why**` value
- **THEN** "What problem does this solve?" is answered from that value and is never presented to the user

#### Scenario: Missing limitations fall through to the ask
- **WHEN** neither the limitation-mapped labels nor the surrounding prose yield an answer for "What are the known limitations or technical debt left behind?"
- **THEN** the command asks that question exactly as written, identically in manual and fast-track modes

### Requirement: Direct Build route produces metadata-declaring artifact set

The Direct Build (unattended) backfill route SHALL compose and deliver a draft artifact set that includes `openspec/changes/{name}/.openspec.yaml` in the canonical three-key form (schema, created as YYYY-MM-DD date only, backfilled: true), in addition to `proposal.md` and capability specs, enabling the archive gate to classify the change as backfilled and skip design, tasks, and implementation from the blocking CORE set.

#### Scenario: Metadata file joins backfill artifact set
- **WHEN** the Direct Build route executes its preparation phase (step 3) after the implementer completes with a staged diff
- **THEN** the returned draft set from the backfill worker includes `openspec/changes/{name}/.openspec.yaml` with exactly the three canonical keys

#### Scenario: Metadata file survives to execute order
- **WHEN** the spec-review phase (step 4) validates the returned draft set
- **THEN** the metadata file is accepted as part of the set and validated as the canonical form (schema: sai-workflow, created as YYYY-MM-DD only, backfilled: true)

#### Scenario: Unattended build changes can be archived without planning artifacts
- **WHEN** the archive gate evaluates a change produced by the Direct Build route and reads `backfilled: true` from `.openspec.yaml`
- **THEN** the change can be archived by the standalone path without requiring design, tasks, or implementation artifacts

