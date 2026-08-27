# sai-merge-command Specification

## Purpose

Defines the `/sai-merge` routed command: pre-merge environment guards, recency-ordered local branch selection, the coordinator-only mutation surface with a strictly read-only worker, contextual conflict analysis with complete alternatives and escalation criteria, the fast-track-gated runtime resolution scope question, the bounded three-round verification loop, the unconditional post-merge ADR/DDR collision pass, and explicit final-commit authorization.

## Requirements
### Requirement: Pre-merge environment guards

The system SHALL run pre-merge environment checks before any merge work and SHALL refuse to start when the repository is unsafe.

#### Scenario: In-progress merge blocks a new run

- **WHEN** a `/sai-merge` invocation starts while `MERGE_HEAD` exists
- **THEN** the command stops with "Merge already in progress. Resolve or abort the current merge first (`git merge --continue` or `git merge --abort`)." and performs no merge step

#### Scenario: Dirty worktree requires confirmation

- **WHEN** the worktree reports modified, untracked, or staged files and no other guard fired
- **THEN** the user is asked to continue or stop before any branch listing or merge activity

### Requirement: Recency-ordered local branch selection

The system SHALL offer every local branch except the current one as merge sources, ordered by full committer timestamp descending with exact branch-name ascending as the deterministic tie-break. Each option SHALL carry the exact branch name as its value and a label of the form `<branch> — last commit <YYYY-MM-DD>`. The branch question SHALL be `¿Qué rama quieres mergear?`.

#### Scenario: User picks the source branch

- **WHEN** more than one local branch exists
- **THEN** the user picks one from a recency-ordered picker and the coordinator launches exactly `git merge <branch>` into the current branch

#### Scenario: User picks a date-labeled source branch

- **WHEN** more than one local branch exists
- **THEN** the user selects an exact branch value from the deterministic date-labeled picker and the coordinator launches exactly `git merge <branch>` into the current branch

### Requirement: Coordinator-only mutation surface

The system SHALL confine every mutating operation — merge launch, resolution writes, ADR/DDR renames, reference edits, staging, and commit execution — to the coordinator, while the worker remains strictly read-only.

#### Scenario: Worker never mutates

- **WHEN** the worker analyzes conflicts, proposes resolutions, scans collisions, or verifies the suite
- **THEN** it runs only read-only inspection and returns payloads, leaving all writes and git state changes to the coordinator

### Requirement: Categorized conflict resolution with criteria

The system SHALL classify each conflicted file as specs, ADR/DDR, or code immediately upon conflict detection and version reading. The analysis SHALL then inspect the base, both branch versions, surrounding file context, related branch changes, and relevant auto-merged files; distinguish directly observable **Facts** from explicitly labeled **Inferences**; and compare the objectives and affected contracts on both sides. For every semantically ambiguous conflict, it SHALL retain complete marker-free `ours` and `theirs` alternatives and MAY retain a complete marker-free `synthesis` only when that outcome has one owner for each responsibility, one authoritative source for each fact, compatible lifecycle behavior, and no duplicated gate or conflicting contract. It SHALL never represent a resolution as a labeled fragment, diff, hunk, or concatenation of conflict pieces. Complete alternatives are constructed only after scope selection in Step 5A.

#### Scenario: Obvious conflict stays lightweight

- **WHEN** a conflict is a non-overlapping edit, a pure addition beside unchanged content, or a complementary spec addition with a deterministic compatible result
- **THEN** the worker returns one complete marker-free resolution without a contextual human decision, and does not add semantic-analysis overhead to the lightweight path

#### Scenario: Semantic conflict requires an informed human choice

- **WHEN** the branches express different objectives, different strategies for the same objective, or incompatible contract-level consequences
- **THEN** the worker returns a contextual decision gate that names the affected file and region, presents Facts separately from Inferences, explains both branch objectives and trade-offs, and offers complete behavioral alternatives rather than merge-jargon fragment choices

#### Scenario: Contextual complete alternatives are preserved

- **WHEN** a semantic conflict has complete current and incoming outcomes and a technically safe combined outcome is possible
- **THEN** the worker retains complete `ours`, `theirs`, and justified `synthesis` alternatives, keeps their internal values stable, and offers the safe synthesis only as a complete outcome with a single owner for each rule

#### Scenario: True semantic contradiction is not auto-selected

- **WHEN** both sides change the same requirement or scenario with incompatible preconditions, outcomes, or ownership rules
- **THEN** the conflict is reported as a semantic contradiction, no side or synthesis is selected automatically, and the complete branch alternatives plus a `more-context` option remain available for human decision

#### Scenario: More context preserves the pending decision

- **WHEN** the user selects `more-context` for a semantic conflict
- **THEN** the same worker continues read-only, expands the evidence from related changes and auto-merged files, preserves the pending complete alternatives, and returns another decision gate without writing, staging, or returning a selected resolution

#### Scenario: True contradiction escalates

- **WHEN** both sides modify the same requirement or scenario with incompatible semantics
- **THEN** the conflict is flagged for escalation and left unresolved rather than auto-picked

### Requirement: Runtime resolution scope gate

When conflicts exist and fast-track is inactive, the system SHALL apply the scope selection after receiving the working language and before constructing complete alternatives. The system SHALL offer only scope options whose categories are present in the conflict classification, preserving the canonical order of artifacts, code, and full scope. Fast-track SHALL select full scope without presenting this gate, and SHALL bypass no contextual decision or semantic contradiction.

#### Scenario: Fast-track auto-applies full scope

- **WHEN** the envelope carries `--fast-track` and conflicts exist
- **THEN** full scope is applied automatically without the scope question

#### Scenario: Absent conflict categories are omitted

- **WHEN** a conflicted merge contains only code conflicts
- **THEN** the scope picker offers code and full scope without offering artifacts-only scope

#### Scenario: Fast-track bypasses only scope

- **WHEN** a fast-track merge contains a semantically ambiguous conflict or a true semantic contradiction
- **THEN** full scope is selected without the scope question, but the contextual analysis, Facts-versus-Inferences explanation, human decision, complete-file validation, verification, and final commit authorization remain required

### Requirement: Contextual decision precedes resolution mutation

The system SHALL keep every semantic alternative pending until the human explicitly selects an offered complete outcome. The coordinator SHALL perform no resolution write, conflict-marker removal, or staging while a contextual decision or `more-context` continuation is pending. A selected internal value SHALL unlock mutation only after the worker returns the matching complete marker-free file payload.

#### Scenario: Human decision gates every resolution write

- **WHEN** a semantic decision is unanswered, or the worker is continuing a `more-context` request
- **THEN** the coordinator leaves every affected conflict untouched and unstaged, and forwards the answer only to the same worker

#### Scenario: Selected outcome unlocks only its complete payload

- **WHEN** all required semantic decisions have explicit offered values
- **THEN** the coordinator accepts only the worker's corresponding complete file records and never reconstructs a file from prose, a hunk, a region, or an unselected alternative

### Requirement: Complete resolution payload validation

Before any resolution write, the coordinator SHALL atomically validate the worker's `## Complete resolution payload`. It SHALL contain exactly one record for every conflicted file in the selected scope, with the expected path and category, accepted decision records, and a JSON-escaped complete final UTF-8 `content` string. These records are the complete final file contents, not instructions for constructing them. The coordinator SHALL reject missing, duplicate, unexpected, fragmentary, reconstructed, or conflict-marker-containing content and SHALL leave all conflicts untouched and unstaged when any record fails validation.

#### Scenario: Fragmentary payload is rejected atomically

- **WHEN** a resolution payload contains a diff, hunk, region replacement, missing file, unexpected path, invalid decision, or `<<<<<<<`, `=======`, or `>>>>>>>` marker
- **THEN** the coordinator rejects the entire payload, writes no resolution, and stages no path

#### Scenario: Complete payload is materialized exactly

- **WHEN** every payload record matches the selected scope and contains complete marker-free file content
- **THEN** the coordinator writes each supplied `content` value exactly as received and stages only the validated resolved paths

### Requirement: Bounded verification loop

The system SHALL detect the project's test suite from project metadata, run it after resolutions are staged, and iterate proposed corrections for at most three rounds before surfacing the remaining failures for human decision.

#### Scenario: Suite failure exhausts the budget

- **WHEN** the detected suite still fails after the third correction round
- **THEN** the remaining failures are reported and the resolved-and-staged state is left uncommitted for human decision

#### Scenario: Verification follows validated staging

- **WHEN** complete resolutions have been validated, written, and staged
- **THEN** the worker runs the detected project suite, the coordinator records each result, and any correction is written and re-staged only within the three-round loop without resetting or committing the staged state

### Requirement: Unconditional post-merge ADR/DDR collision pass

After a merge, the system SHALL run an incremental ADR/DDR collision pass using only source-introduced records that remain identifiable in the final merge state. The coordinator SHALL capture `target_sha`, `source_sha`, and `merge_base` before merging and SHALL forward that provenance unchanged. Only exact added ADR/DDR record paths from the source-versus-base diff SHALL form the scan frontier; canonical index files, renames, and copies SHALL be excluded. Candidate keys SHALL be `(family, numeric prefix)`, and the system SHALL compare only those keys with final-state bare and suffixed records. References SHALL be searched and repaired only for affected family-aware identifiers.

#### Scenario: Numeric collision repaired

- **WHEN** two `0010-*.md` files coexist after a merge and the collision key is in the retained source frontier
- **THEN** the older file becomes `0010a-…md`, the newer becomes `0010b-…md` per introduction dates, and index links, pinned relationship tokens, and OpenSpec mentions are updated to the suffixed names.

#### Scenario: Orphan reference is reported, never invented

- **WHEN** an affected reference points to a number matching no file after renaming
- **THEN** it is reported as an orphan and left unmodified.

#### Scenario: Collision applicability controls presentation

- **WHEN** the collision pass finds neither an ADR nor a DDR directory, or the retained source frontier is empty
- **THEN** the coordinator records `not-applicable` and does not render a pending collision TODO item.

#### Scenario: Source frontier provenance is captured before mutation

- **WHEN** the coordinator prepares to merge a selected source branch
- **THEN** it SHALL capture the target SHA, source SHA, merge base, and added-only source record inventory before the merge and forward them unchanged.

#### Scenario: Unrelated historical collisions remain untouched

- **WHEN** a final-state collision key is absent from the retained source frontier
- **THEN** the worker SHALL not inspect, rename, or search references for that unrelated historical group.

#### Scenario: Affected references remain family-aware

- **WHEN** an affected record is renamed during collision repair
- **THEN** the coordinator SHALL update only exact affected family-aware links, relationship tokens, index metadata, and canonical references while leaving ambiguous or orphan references as escalations.

### Requirement: Explicit final-commit authorization

The system SHALL execute the merge commit only after explicit user authorization. The authorization presentation SHALL contain target branch, source branch, verification status, conflict result, collision result with applicability, and staged-file count without dumping the full staged-file list into the picker.

#### Scenario: Authorization declined

- **WHEN** the user answers no to the final-commit ask
- **THEN** the resolved-and-staged state remains, the current branch, merged branch, staged files, manual-commit and revert paths are documented, and no commit executes

#### Scenario: Authorization uses compact context

- **WHEN** final staging is complete and the commit authorization question is pending
- **THEN** the user sees the compact merge summary and the unchanged `yes (Recommended)` and `no` options

#### Scenario: Commit requires the final gate

- **WHEN** verification and any applicable ADR/DDR repair have completed and final staging is done
- **THEN** the coordinator asks for explicit commit authorization, executes the merge commit only on `yes`, and leaves the exact staged state uncommitted on `no`

### Requirement: Harness-parity merge contract

The Claude Code and opencode projections SHALL use the same neutral worker and coordinator contracts for contextual conflict analysis and the merge presentation seam. Given the same worker source payload and operation outcomes, both harnesses SHALL preserve the same Facts/Inferences content, complete alternative decision values and order, `more-context` continuation semantics, mutation gates, payload validation, verification behavior, authorization question, refusal state, and terminal completion literal; only the native task-list rendering mechanism may differ.

#### Scenario: Both harnesses preserve merge decisions

- **WHEN** the same semantically ambiguous conflict is handled through Claude Code or opencode
- **THEN** each harness presents the same complete behavioral alternatives and answer values, keeps `more-context` mutation-free, and does not permit a resolution write, staging, or commit before the same coordinator-owned gates


### Requirement: Adaptive TODO follows the resolved merge path

The coordinator MUST render the canonical merge, scope, resolution, verification, collision, and authorization items only when their route conditions apply, and MUST clear the merge-owned surface at terminal closure without restoring displaced foreign entries.

#### Scenario: Fast-track conflict route skips scope

- **WHEN** a fast-track merge has conflicts
- **THEN** the TODO omits scope and renders the full-resolution route before verification

### Requirement: Conflict-triggered language hand-off

The `/sai-merge` command SHALL keep clean merges on the existing path without asking for a working language or resolution strategy. When conflicts occur, the worker SHALL read the conflicted file versions (base, ours, theirs) and classify each file as specs, ADR/DDR, or code, then return `event: conflict_detected` with the exact ordered `affected_files` inventory and `continuation_state: language-selection` for the coordinator to request the working language before proceeding to semantic analysis.

#### Scenario: Clean merge needs no language or strategy

- **WHEN** a merge completes without conflicts
- **THEN** the command continues to the post-merge collision pass without asking for a working language or presenting a resolution strategy

#### Scenario: Conflict hand-off includes version reads and classification

- **WHEN** the coordinator-owned merge produces conflicted files
- **THEN** the worker reads base, current, and incoming versions for each conflicted file, classifies each file into Artifacts—specs, Artifacts—ADR/DDR, or Code category, then returns the closed conflict hand-off with `changed_files: []` before the coordinator requests a working language or performing semantic analysis

### Requirement: Global strategy gates resolution

The worker SHALL produce one complete global resolution strategy covering the selected conflict set, and the coordinator SHALL require explicit `apply-strategy` confirmation before resolution writes, marker removal, or staging. The strategy SHALL include facts, inferences, branch objectives, affected contracts, trade-offs, risks, alternatives, and complete marker-free content where required.

#### Scenario: Strategy is confirmed before mutation

- **WHEN** the worker presents a complete global strategy and the user selects `apply-strategy`
- **THEN** the coordinator accepts only the matching complete-file payload after validation and performs no mutation before that confirmation

#### Scenario: Strategy is revised without mutation

- **WHEN** the user selects `revise-strategy`
- **THEN** the same worker requests open context or correction with empty `options` and the repository remains unchanged

### Requirement: New conflict re-entry preserves language

Application or verification SHALL return a new conflict or invalidated strategy to global strategy analysis through the same worker with `continuation_state: strategy-analysis`, preserving the selected working language and requiring fresh strategy confirmation without asking for the language again.

#### Scenario: New problem re-enters strategy analysis

- **WHEN** resolution application or verification exposes a new conflict or inconsistent contract
- **THEN** the coordinator forwards the exact current state to the same worker and requires a newly confirmed strategy before another resolution write

### Requirement: Fast-track remains scope-only

Merge fast-track SHALL select full resolution scope without presenting the scope question, while language selection, strategy confirmation, complete-file validation, verification, and final commit authorization remain required.

#### Scenario: Fast-track conflict retains strategy safety

- **WHEN** `--fast-track` is active for a conflicted merge
- **THEN** only the scope gate is bypassed and the language and global strategy gates remain active
