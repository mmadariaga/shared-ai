## ADDED Requirements

### Requirement: Promotion runs once per run, after the Final sweep and before the MANDATORY STOP

The `/sai-4-apply` coordinator SHALL perform exactly one promotion pass per run. The pass SHALL be positioned after the Final sweep — the scan that verifies every checkbox in `implementation.md` is marked — and before the MANDATORY STOP that prints the completion message. This is the same slot the fast-track combined Human Verification list already occupies.

The pass SHALL NOT be performed per Step, and SHALL NOT be performed more than once in a run. Because the whole `## Appendix: Plan vs Final Implementation` is on disk by the time the pass runs, supersede-by-key SHALL be applied as a single pass over the complete appendix rather than incrementally.

The promotion pass SHALL be performed by the coordinator itself. It SHALL NOT be delegated to a Step-execution subagent, and SHALL NOT introduce a new subagent type or a new dispatch kind.

#### Scenario: A run completes all Steps

- **WHEN** the coordinator finishes the Final sweep and every Step is checked
- **THEN** it runs the promotion pass once, over the complete deviations appendix, before printing the completion message

#### Scenario: The coordinator is tempted to promote per Step

- **WHEN** a Step's deviations are appended to the appendix mid-run
- **THEN** no promotion occurs at that point; promotion happens only in the single end-of-run pass

### Requirement: Promotion source is the deviations appendix

The promotion pass SHALL take its candidate entries from the `## Appendix: Plan vs Final Implementation` section of `openspec/changes/{change-name}/implementation.md` — the appendix the coordinator itself wrote from subagent report field 5. This is the primary source.

The coordinator's in-context technical-learnings memory, accumulated from subagent report field 6, MAY be used as a supplementary source for the same run. It SHALL NOT be the sole source of a promoted entry when the deviations appendix is present.

The criterion "the fact was observed during execution, not inferred from the plan" SHALL be treated as satisfied by construction for appendix-sourced candidates: a deviation is by definition something execution surfaced. No separate observation check SHALL be imposed on them.

Each deviation entry's `**Final:**` value — what was actually implemented — SHALL be treated as the carrier of "what works instead" when composing a promoted entry's fact.

Promotion SHALL NOT be triggered by any source other than these two. In particular, the coordinator SHALL NOT infer a promotable fact from a Step that succeeded without deviation, because a fact that execution never contradicted is not an observation.

#### Scenario: A deviation records a false toolchain assumption

- **WHEN** the appendix contains a deviation whose `**Plan:**` asserted a build flag the toolchain does not accept and whose `**Final:**` records the flag that works
- **THEN** the promotion pass considers it a candidate, and composes the promoted fact from the `**Final:**` value

#### Scenario: A field-6 learning has no appendix counterpart

- **WHEN** the coordinator holds a technical learning from field 6 that no deviation entry records
- **THEN** it MAY promote that learning as a supplement, subject to the same artifact filter as appendix-sourced candidates

### Requirement: A single artifact classification filters, keys, and anchors every entry

For each candidate, the coordinator SHALL apply exactly one classification: **does this candidate name a repo-level artifact rather than a symbol this change introduced?**

That single answer SHALL serve three purposes simultaneously:

1. It is the **promotion filter** — a candidate that fails it is not promoted.
2. It is the **supersede key** — the named repo-level artifact is the key the entry is written under.
3. It is the **reader anchor** — the value a later consumer matches on when deciding whether the entry is relevant.

A repo-level artifact is a package, a build target, a command, a configuration file, a compiler or linter rule, or a framework version constraint. A symbol the change introduced is a class, function, module, or file created or renamed by the change being applied.

No additional rubric, scoring, weighting, or multi-criteria judgement SHALL be imposed on the promotion decision. The classification is deliberately a single mechanical test, because `/sai-4-apply` runs on the cheapest model in the pipeline and the judgement budget is spent once.

#### Scenario: Candidate names a package version constraint

- **WHEN** a deviation records that a dependency at the pinned version lacks an API the plan assumed
- **THEN** the candidate passes the classification, is promoted, and is keyed on that package

#### Scenario: Candidate names a class the change created

- **WHEN** a deviation records that a newly created service class needed an extra constructor argument
- **THEN** the candidate fails the classification and is not promoted, because its subject is a symbol this change introduced

#### Scenario: Coordinator is tempted to score candidates

- **WHEN** the coordinator evaluates a borderline candidate
- **THEN** it applies only the single artifact classification and does not apply a severity score, a confidence rating, or any additional criterion

### Requirement: Promotion is committed separately behind its own authorization gate

After the Final sweep and the once-per-run promotion pass, `/sai-4-apply` SHALL treat the terminal commit as the run's documentation commit rather than as a commit owned exclusively by learnings promotion. The terminal documentation commit SHALL be a sibling subsection of `## Learnings Promotion Pass` in the apply instructions and SHALL be governed by one authorization gate for the complete terminal set.

When the promotion pass writes `SAI_LEARNINGS.md`, the coordinator SHALL include that file in the terminal documentation commit. The same commit MAY also include eligible documentation changes under `docs/**`; it SHALL NOT include any other path, including OpenSpec change artifacts.

The terminal documentation commit SHALL be proposed whenever `docs/**` has working-tree changes or the promotion pass wrote `SAI_LEARNINGS.md`, even when the promotion pass produced no qualifying entry. Eligibility SHALL be evaluated from the working-tree state at the terminal pass, not from a run-start baseline, so pre-existing uncommitted `docs/**` changes are intentionally included and made visible by the terminal file visibility listing. When neither condition holds, no terminal documentation commit SHALL be proposed.

When the promotion pass writes `SAI_LEARNINGS.md`, before proposing the terminal documentation commit the coordinator SHALL print a minimal promotion disclosure containing the path written, the count of entries added and superseded broken down by section, and the keys of any pre-seeded entries that this run's execution contradicted and superseded. The contradicted-key list is disclosure only and grants no delete authority. The coordinator SHALL also print the terminal file visibility listing specified below before proposing the commit message and before authorization. The disclosure and listing SHALL describe only the files eligible for this terminal commit.

Before proposing the terminal documentation commit message, the coordinator SHALL apply `sai/policies/commit-rules.md`. The message SHALL use the policy's commit-type classification, subject/body/footer limits, and faithfulness rules, and SHALL describe only the terminal documentation commit's staged paths and hunks.

The authorization SHALL be a closed-choice `yes` / `no` prompt presented through the harness's native option-picker where one exists, with yes-only execute semantics: anything other than an explicit `yes` SHALL be treated as a decline. On decline, the coordinator SHALL leave the eligible files in the working tree, describe what remains uncommitted, and proceed to the MANDATORY STOP without halting or retrying.

#### Scenario: Documentation exists but no learning is promoted

- **WHEN** the Final sweep passes, the promotion pass produces no qualifying entry, and `docs/**` has working-tree changes
- **THEN** the coordinator proposes the terminal documentation commit, shows the eligible docs files and any excluded paths before authorization, and does not skip the gate because promotion was a no-op

#### Scenario: Promotion and ADR documentation are both written

- **WHEN** the promotion pass writes `SAI_LEARNINGS.md` and `docs/adr/0000-INDEX.md` or ADR files are changed
- **THEN** the coordinator proposes one terminal documentation commit containing `SAI_LEARNINGS.md` and the changed `docs/**` paths, subject to the single authorization gate

#### Scenario: No terminal documentation inputs exist

- **WHEN** the Final sweep passes, the promotion pass writes no `SAI_LEARNINGS.md`, and `docs/**` has no working-tree changes
- **THEN** the coordinator proposes no terminal documentation commit and asks no terminal commit-authorization question

#### Scenario: User declines the terminal documentation commit

- **WHEN** the coordinator presents the terminal documentation commit gate and the user answers `no`, remains silent, or gives any response other than explicit `yes`
- **THEN** no terminal commit is created, the eligible docs and learnings files remain in the working tree, and the coordinator proceeds to the MANDATORY STOP

### Requirement: Terminal documentation commit emits a file visibility listing

The terminal documentation commit, which replaces the former single-file promotion commit, SHALL print a terminal file visibility listing before the coordinator proposes its commit message and before authorization.

For this terminal commit, the listing SHALL not depend on a Step number, a matching `tasks.md` scope, or a subagent report. It SHALL show the exact paths under `docs/**` and `SAI_LEARNINGS.md` that would be staged, and SHALL show working-tree paths that would remain uncommitted because they are outside that terminal set. It SHALL not stage or mutate the index while producing the preview.

The standard pre-commit file visibility report SHALL continue to fire unchanged at every ordinary STOP & COMMIT marker, including per-Step commits.

#### Scenario: Terminal documentation commit has docs and learnings files

- **WHEN** the terminal documentation commit is about to be proposed and both `docs/**` and `SAI_LEARNINGS.md` are eligible
- **THEN** the coordinator prints a terminal file listing containing both sets of paths, plus any working-tree paths excluded from the commit, before proposing the message or asking for authorization

#### Scenario: Terminal documentation commit has no subagent report

- **WHEN** the terminal documentation commit follows the last Step and no subagent report exists for it
- **THEN** the terminal file visibility listing uses the eligible path set directly and does not attempt a Step-number, plan cross-check, or subagent-to-git comparison

#### Scenario: Ordinary Step commit remains covered

- **WHEN** an ordinary Step reaches a STOP & COMMIT marker
- **THEN** the existing full pre-commit file visibility report still fires before that Step's commit proposal

### Requirement: Terminal documentation commit is independent of the per-Step add-list rule

Per-Step commits SHALL remain field-8-only: the coordinator SHALL continue to stage exactly the add-list supplied by the applicable subagent report field 8 for each Step and SHALL NOT widen that rule to sweep `docs/**` or `SAI_LEARNINGS.md`.

The terminal documentation commit SHALL use its own fixed path set, consisting only of `docs/**` and `SAI_LEARNINGS.md`. The coordinator SHALL determine eligibility from the terminal working-tree state and whether the promotion pass wrote `SAI_LEARNINGS.md`; it SHALL NOT consult a Step's intended add-list or any subagent report field 8 to construct this terminal set.

The coordinator SHALL NOT use `git add -A`, a broad working-tree sweep, or an equivalent operation that stages paths outside `docs/**` and `SAI_LEARNINGS.md`. In particular, `openspec/changes/{change-name}/` and its `implementation.md` SHALL remain outside the terminal documentation commit.

#### Scenario: Terminal commit stages only documentation and learnings

- **WHEN** the coordinator authorizes the terminal documentation commit while unrelated files and OpenSpec artifacts are also modified
- **THEN** it stages only changed paths under `docs/**` and `SAI_LEARNINGS.md`, leaving every other path uncommitted

#### Scenario: Per-Step add-list remains field-8-only

- **WHEN** an ordinary Step commit is prepared after or before the terminal documentation commit
- **THEN** its add-list remains sourced only from the relevant subagent report field 8 and does not include unrelated `docs/**` paths by default

#### Scenario: No learning promotion but docs trigger the terminal set

- **WHEN** the promotion pass writes no learning entry but `docs/**` has working-tree changes
- **THEN** the coordinator constructs the terminal set from the changed docs paths and does not require a qualifying promotion as a trigger

### Requirement: Terminal documentation commit preserves the halted-run boundary

The terminal documentation commit SHALL be evaluated only after the Final sweep and the once-per-run promotion pass. If the run halts before the Final sweep, the coordinator SHALL perform neither the promotion pass nor the terminal documentation commit, preserving the existing halted-run rule.

#### Scenario: Run halts before the Final sweep

- **WHEN** a GREEN conflict, user stop, or declined per-Step commit ends the run before the Final sweep
- **THEN** no terminal documentation commit is proposed, and any docs or learnings changes remain subject to a later completed run or manual commit

### Requirement: Bootstrap on first promotion

When the promotion pass produces at least one qualifying entry and `SAI_LEARNINGS.md` does not yet exist, the coordinator SHALL create it at the project root with the full four-section structure, placing the qualifying entries in their sections and leaving the remaining section headings present and empty.

On bootstrap the coordinator SHALL notify the user that the file was created and that future runs will append to and supersede entries within it.

When the promotion pass produces no qualifying entry and the file does not exist, the coordinator SHALL NOT create it. An empty `SAI_LEARNINGS.md` SHALL never be written.

#### Scenario: First qualifying entry in a repo with no file

- **WHEN** the promotion pass produces one qualifying entry and no `SAI_LEARNINGS.md` exists
- **THEN** the coordinator creates the file with all four section headings, places the entry in its section, and notifies the user that the file was bootstrapped

#### Scenario: No qualifying entries in a repo with no file

- **WHEN** the promotion pass produces no qualifying entry and no `SAI_LEARNINGS.md` exists
- **THEN** no file is created

### Requirement: A run that halts before the Final sweep promotes nothing

When a run ends before reaching the Final sweep — including a GREEN-conflict halt, a user stop, or a decline at a Step's commit gate — the promotion pass SHALL NOT run, and `SAI_LEARNINGS.md` SHALL NOT be written for that run.

This SHALL NOT be treated as data loss. Deviations for every completed Step are already committed to the `## Appendix: Plan vs Final Implementation`, and a later run over the same change can promote them from there.

The coordinator SHALL NOT attempt a partial or early promotion in order to salvage facts from a halted run.

#### Scenario: GREEN-conflict halt mid-plan

- **WHEN** a split-routed Step reports an unpassable GREEN and the coordinator surfaces the conflict to the user
- **THEN** the run stops without a promotion pass, and the deviations recorded so far remain in the committed appendix

#### Scenario: A later run resumes the change

- **WHEN** a subsequent `/sai-4-apply` run completes the remaining Steps and reaches the Final sweep
- **THEN** its single promotion pass reads the whole appendix, including entries written by the earlier halted run
