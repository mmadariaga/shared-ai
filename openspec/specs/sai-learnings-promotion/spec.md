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

When the promotion pass writes `SAI_LEARNINGS.md`, the coordinator SHALL propose a commit containing that file and no other, and SHALL obtain explicit authorization before running `git commit`.

Before proposing the commit, the coordinator SHALL print a **minimal disclosure**: the path written, and the count of entries added and entries superseded, broken down by section. This disclosure replaces the pre-commit file visibility report for this commit.

The disclosure SHALL additionally list the keys of any pre-seeded entries that this run's own execution contradicted — entries the coordinator superseded because a deviation reported the opposite of what the file recorded. Surfacing them is disclosure only and grants no delete authority; it exists so the human can see which recorded facts the repository has moved past.

The authorization SHALL be a closed-choice `yes` / `no` prompt presented through the harness's native option-picker where one exists, with `yes`-only execute semantics: anything other than an explicit `yes` — no, silence, a redirect, or any other reply — SHALL be treated as a decline. On decline, the coordinator SHALL leave the written file in the working tree, describe it so the user can commit it themselves, and proceed to the MANDATORY STOP without halting or retrying.

#### Scenario: Promotion writes entries and the user authorizes

- **WHEN** the promotion pass adds two entries and supersedes one, and the user answers `yes`
- **THEN** the coordinator commits `SAI_LEARNINGS.md` alone, after having printed the path and the per-section added/superseded counts

#### Scenario: User declines the promotion commit

- **WHEN** the coordinator proposes the promotion commit and the user answers anything other than `yes`
- **THEN** no commit is created, the modified `SAI_LEARNINGS.md` is left in the working tree with a description of what it contains, and the run proceeds to the MANDATORY STOP

#### Scenario: No candidate survives the filter

- **WHEN** the promotion pass finds no candidate that passes the artifact classification
- **THEN** it writes nothing, proposes no commit, prints no authorization prompt, and the run proceeds to the MANDATORY STOP

### Requirement: The pre-commit file visibility report does not fire for the promotion commit

The mandatory pre-commit file visibility report is specified to fire at every STOP & COMMIT marker. The promotion commit is not a STOP & COMMIT marker, and the report SHALL NOT be printed for it.

The report's blocks have no referent at this point in the run: the intended add-list is sourced from subagent report field 8, the `Plan cross-check` block is keyed on the integer `N` of a `## Step N` heading, and the `Subagent ↔ git` block compares a subagent-claimed set against the working tree. The promotion commit follows the last Step, involves no subagent report, and stages a single coordinator-written file.

Suppressing the report for this commit SHALL NOT weaken it anywhere else: the report continues to fire, unmodified, at every STOP & COMMIT marker.

#### Scenario: Coordinator reaches the promotion commit

- **WHEN** the coordinator is about to propose the promotion commit
- **THEN** it prints the minimal disclosure rather than the pre-commit file visibility report, and prints no add-list, `Plan cross-check`, or `Subagent ↔ git` block

#### Scenario: A later run reaches a STOP & COMMIT marker

- **WHEN** any Step in any run reaches a STOP & COMMIT marker
- **THEN** the full pre-commit file visibility report fires exactly as specified today

### Requirement: The promotion commit is independent of the per-Step add-list rule

The promotion commit SHALL stage exactly the path `SAI_LEARNINGS.md`, determined directly by the promotion pass. The coordinator SHALL NOT consult the per-Step intended add-list, and SHALL NOT consult subagent report field 8, when staging the promotion commit.

This independence is deliberate: the per-Step add-list rule is scoped per Step and sourced from field 8, and routing the promotion through it would couple this behavior to the separate, unresolved question of how the per-Step staging rule interacts with the report's other blocks. That question is explicitly out of scope here and is neither fixed nor worsened by this requirement.

#### Scenario: Coordinator stages the promotion commit

- **WHEN** the coordinator stages files for the promotion commit
- **THEN** it stages `SAI_LEARNINGS.md` and nothing else, without reading any subagent report field 8

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
