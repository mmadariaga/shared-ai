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

The system SHALL confine state-changing git operations — merge launch, git checkout, git mv, git add, and commit execution — to the coordinator. The worker writes authorized resolution content (conflict-region text and ADR/DDR reference updates) to the working tree after the coordinator confirms the selected global strategy; the coordinator then performs a post-resolution review before staging. Authored-content writing belongs to the worker; git-command execution belongs exclusively to the coordinator.

#### Scenario: Worker never executes git mutations

- **WHEN** the worker analyzes conflicts, proposes resolutions, scans collisions, or verifies the suite
- **THEN** it performs read-only inspection, writes authorized content to conflicted files within scope (splicing regions and updating references), returns payloads, and leaves all git state changes to the coordinator

#### Scenario: Coordinator reviews materialized content before staging

- **WHEN** the worker has written resolution content to the working tree
- **THEN** the coordinator performs a post-resolution review against the approved strategy, detects any divergence, and either proceeds to staging or returns divergence to the worker for correction under bounded round count

### Requirement: Categorized conflict resolution with criteria

The system SHALL classify each conflicted file as specs, ADR/DDR, or code immediately upon conflict detection and version reading. The analysis SHALL read governing specs, ADRs, and DDRs forwarded by the coordinator (indexed by branch in `target_rules` and `source_rules`). For each conflict region, the worker SHALL apply an evidence ladder: first consult declared rules from governing specs/ADRs/DDRs (L1); if no rule exists or the rule is silent, consult textual context and code archaeology (L2). When no declared rule governs a region, emit a visible on-screen notice `[No declared rule found for this region]`. The analysis SHALL inspect the base, both branch versions, surrounding file context, related branch changes, and relevant auto-merged files; distinguish directly observable **Facts** (including declared rules from governing specs/ADRs/DDRs with their source identified) from explicitly labeled **Inferences** (used only when no declared rule exists); and compare the objectives and affected contracts on both sides.

For each conflicted file, the worker SHALL determine whether all conflict regions in that file resolve to the same side (all `ours`, all `theirs`, or all other branches). When every region resolves to the same side, the `ours` and `theirs` alternatives are obtained directly from git and are never generated:
- internal decision value `ours` — obtained from `git show :2:<file>` (the current branch's version), materializable with `git checkout --ours`;
- internal decision value `theirs` — obtained from `git show :3:<file>` (the merged branch's version), materializable with `git checkout --theirs`.

When any conflict regions in a file resolve to different sides (mixing sides), `ours` and `theirs` are not offered as alternatives; only synthesis through authored region replacement is available.

For every semantically ambiguous conflict where an alternative is offered, the worker MAY retain a `synthesis` alternative only when that outcome has one owner for each responsibility, one authoritative source for each fact, compatible lifecycle behavior, and no duplicated gate or conflicting contract. The synthesis is limited to the conflict region(s), not the complete file. It must be a deliberate technical resolution authored by the worker, never created by concatenating conflict fragments or by retyping untouched lines.

The system SHALL never represent a resolution as a labeled fragment, diff, hunk, or concatenation of conflict pieces. Alternatives are constructed only after scope selection in Step 5A.

#### Scenario: Obvious conflict stays lightweight

- **WHEN** a conflict is a non-overlapping edit, a pure addition beside unchanged content, or a complementary spec addition with a deterministic compatible result
- **THEN** the worker returns one complete marker-free resolution without a contextual human decision, and does not add semantic-analysis overhead to the lightweight path

#### Scenario: Semantic conflict requires an informed human choice

- **WHEN** the branches express different objectives, different strategies for the same objective, or incompatible contract-level consequences
- **THEN** the worker returns a contextual decision gate that names the affected file and region, presents Facts separately from Inferences, explains both branch objectives and trade-offs, and offers complete behavioral alternatives rather than merge-jargon fragment choices

#### Scenario: Contextual complete alternatives are preserved

- **WHEN** a semantic conflict has complete current and incoming outcomes and a technically safe combined outcome is possible, and all regions in the file resolve to the same side
- **THEN** the worker retains git-sourced `ours` and `theirs` alternatives obtained directly from git, and a justified region-scoped `synthesis` alternative; keeps their internal values stable; and offers the safe synthesis only as a region-replacement outcome with a single owner for each rule

#### Scenario: True semantic contradiction is not auto-selected

- **WHEN** both sides change the same requirement or scenario with incompatible preconditions, outcomes, or ownership rules
- **THEN** the conflict is reported as a semantic contradiction, no side or synthesis is selected automatically, and the available alternatives plus a `more-context` option remain available for human decision

#### Scenario: More context preserves the pending decision

- **WHEN** the user selects `more-context` for a semantic conflict
- **THEN** the same worker continues read-only, expands the evidence from related changes and auto-merged files, preserves the pending alternatives, and returns another decision gate without writing, staging, or returning a selected resolution

#### Scenario: True contradiction escalates

- **WHEN** both sides modify the same requirement or scenario with incompatible semantics
- **THEN** the conflict is flagged for escalation and left unresolved rather than auto-picked

#### Scenario: Declared rule governs the resolution

- **WHEN** a governing spec, ADR, or DDR from `target_rules` or `source_rules` explicitly constrains the resolution for a conflict region
- **THEN** the worker identifies it as a Fact with the rule's source, applies it as L1 evidence (taking precedence over inferred objectives), and reports it in the conflict analysis

#### Scenario: Missing declared rule generates a notice

- **WHEN** a conflict region has no corresponding entry in `target_rules` or `source_rules`
- **THEN** the worker emits the visible on-screen notice `[No declared rule found for this region]` in the Conflict Analysis output, and the resolution proceeds using L2 textual context only

#### Scenario: Evidence ladder enters L2 when L1 is silent

- **WHEN** L1 contains no declared rule for a conflict region (or the rule is silent), or when a declared rule rejects both branch versions
- **THEN** the worker enters L2 and consults textual context (`git show :1:/:2:/:3:` and surrounding code) to verify or author a compatible resolution

#### Scenario: File with regions resolving to different sides (E4)

- **WHEN** a conflicted file contains multiple conflict regions and they resolve to different sides (some regions choose `ours`, others choose `theirs`)
- **THEN** the outcome is necessarily a synthesis by definition; the git shortcut cannot be used; the worker offers only synthesis as an alternative and requires an authored resolution combining the selected regions from each side

#### Scenario: Conflicts with no region markers (E5)

- **WHEN** a conflict class produces no `<<<<<<<`, `=======`, or `>>>>>>>` markers (e.g., delete/modify, rename/rename, rename/delete)
- **THEN** region replacement does not apply; the worker follows the same resolution path as for obvious conflicts, uses Git's guidance on the specific conflict class, and resolves to the complete file outcome for that path using the available alternatives (ours, theirs, or synthesis if a safe combined outcome exists)

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

The system SHALL keep every semantic alternative pending until the human explicitly selects an offered complete outcome. The coordinator SHALL perform no staging or conflict-marker removal while a contextual decision or `more-context` continuation is pending. After strategy confirmation, the worker writes resolution content to the working tree; this authorized content write occurs after the coordinator confirms the global strategy. A selected internal value unlocks the coordinator's staging and commit mutations only after the worker has written the matching source/regions content to the working tree and returned the complete payload with the matching record.

#### Scenario: Human decision gates every coordinator write

- **WHEN** a semantic decision is unanswered, or the worker is continuing a `more-context` request
- **THEN** the coordinator leaves every affected conflict untouched and unstaged, and forwards the answer only to the same worker

#### Scenario: Selected outcome gates coordinator staging

- **WHEN** all required semantic decisions have explicit offered values and the worker has written the authorized content and returned the matching source/regions record
- **THEN** the coordinator accepts the worker's source/regions record (with git-ours or git-theirs requiring no file content, and authored requiring region entries already written) and never reconstructs a file from prose, a hunk, a complete file, or an unselected alternative; the coordinator may then perform post-resolution review and proceed to staging

### Requirement: Complete resolution payload validation

Before any coordinator staging, the coordinator SHALL atomically validate the worker's `## Complete resolution payload`. It SHALL contain exactly one record for every conflicted file in the selected scope, with the expected path, category, source discriminator, and region information as appropriate. Each file record carries a `source` field with exactly one of `"git-ours"`, `"git-theirs"`, or `"authored"`. When `source` is `git-ours` or `git-theirs`, the `regions` array must be empty and the coordinator materializes via `git checkout --ours` or `git checkout --theirs`. When `source` is `"authored"`, the worker has already written the region text to the file; the regions array carries the written content for coordinator validation. The coordinator SHALL reject missing, duplicate, unexpected, invalid-source, invalid-region, or conflict-marker-containing records and SHALL leave all conflicts untouched and unstaged when any record fails validation.

#### Scenario: Fragmentary payload is rejected atomically

- **WHEN** a resolution payload contains a diff, hunk, complete file, invalid source value, missing region for an authored source, marker in a region's text, missing file, unexpected path, or invalid decision
- **THEN** the coordinator rejects the entire payload, writes no resolution, and stages no path

#### Scenario: Region-replacement payload is materialized by splicing

- **WHEN** every payload record matches the selected scope and contains valid source, regions (if authored), and conflict-free region text, and the worker has already written authored regions to the working file
- **THEN** the coordinator validates the payload, reviews the materialized tree against the approved strategy, and if the review passes, materializes git-sourced files via checkout command and proceeds to staging of the validated resolved paths

#### Scenario: Coordinator reviews authorized content without reconstruction

- **WHEN** a region has source `"authored"` and the worker has written the replacement text to the working file
- **THEN** the coordinator validates the payload and reviews the materialized file without reconstructing, re-splicing, or re-authoring the region text; it never derives file content from prose or concatenates unselected alternatives

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

The worker SHALL produce one complete global resolution strategy covering the selected conflict set, and the coordinator SHALL require explicit `apply-strategy` confirmation before resolution writes, marker removal, or staging. The strategy text SHALL carry prose explanations only, for all conflict classes: describing branch objectives, governing rules (declared from specs/ADRs/DDRs or inferred from evidence), Facts, Inferences, affected contracts, trade-offs, risks, and alternatives. Complete marker-free file content for all conflict classes SHALL appear only in the JSON `## Complete resolution payload`, not in the strategy prose. The coordinator never reconstructs a resolution from prose; it uses only the JSON `files` records. This rule preserves the guarantee that every synthesis is authored by the worker, not by the coordinator, and that every decision traces to an explicit worker choice and complete alternative in the payload.

#### Scenario: Strategy is confirmed before mutation

- **WHEN** the worker presents a complete global strategy and the user selects `apply-strategy`
- **THEN** the coordinator accepts only the matching complete-file payload after validation and performs no mutation before that confirmation

#### Scenario: Strategy is revised without mutation

- **WHEN** the user selects `revise-strategy`
- **THEN** the same worker requests open context or correction with empty `options` and the repository remains unchanged

#### Scenario: Strategy text carries prose only for all conflict classes

- **WHEN** the worker returns a global strategy for obvious conflicts or semantic ambiguities
- **THEN** the strategy text carries prose explanations identifying the decision, governing rules (if any), facts, and inferences, while complete file content appears only in the JSON payload

#### Scenario: Prose-only strategy preserves coordinator guarantee

- **WHEN** the strategy carries no file content and the JSON payload contains the complete final version
- **THEN** the coordinator validation confirms the matching payload before any write, and the synthesis is never reconstructed from prose or alternative fragments in the strategy

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

### Requirement: The merge coordinator validates operation boundaries

The merge coordinator SHALL call `validate_transition(current_state, target_state, operation_context)` before selecting each named merge operation and SHALL halt when validation returns `invalid`.

#### Scenario: Invalid coordinator transition halts safely

- **WHEN** lifecycle validation reports an invalid current state, target state, or precondition
- **THEN** the coordinator reports the violation and performs no operation selection, worker dispatch, mutation, or presentation update

#### Scenario: Valid coordinator transition proceeds

- **WHEN** lifecycle validation reports `valid` for the requested operation context
- **THEN** the coordinator selects and executes the operation

### Requirement: Merge analysis and mutation ownership remain separated

The merge coordinator MUST retain every mutation, staging, Git responsibility, and presentation-boundary update, while the merge worker remains responsible only for read-only analysis.

#### Scenario: Worker analysis does not authorize invalid ordering

- **WHEN** worker analysis or coordinator presentation state supplies context that does not satisfy the lifecycle precondition
- **THEN** the coordinator rejects the transition without transferring mutation or lifecycle-policy authority to the worker

### Requirement: Merge guard windows keep coordinator mutations outside every window

The merge coordinator SHALL run the guard's `snapshot` step immediately before each `sai-merge-worker` dispatch and each same-worker continuation, holding the returned SHA as invocation-scoped `guard_base`, and its `verify` step immediately after every returned result, before acting on that result. The fresh snapshot before every continuation SHALL be what keeps the coordinator's own git mutations — the merge launch, `git checkout --ours/--theirs`, `git mv`, staging, and the authorized merge commit — outside every guard window; those operations always run between windows and never inside one. No merge window carries `allow_commit`.

#### Scenario: the authorized merge commit runs between windows

- **WHEN** the worker's strategy is confirmed and the coordinator stages and commits the merge
- **THEN** those mutations run after the verify that closed the preceding window and before the next window's fresh snapshot

