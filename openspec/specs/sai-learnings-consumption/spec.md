## ADDED Requirements

### Requirement: sai-4-apply pre-seeds its Technical Learnings Memory at run start

At the start of a `/sai-4-apply` run, before the first Step is dispatched, the coordinator SHALL read `SAI_LEARNINGS.md` from the project root and pre-seed its accumulated Technical Learnings Memory with the entries it finds.

Pre-seeded entries SHALL be governed by the existing memory rules without exception: the coordinator SHALL select and inject only entries it deems relevant to a given dispatch, SHALL NOT dump the memory in full into any dispatch, and SHALL apply the existing blindness constraint when injecting into a blind test-writer dispatch.

Pre-seeded entries SHALL be indistinguishable in effect from entries accumulated from subagent report field 6 during the run. No new injection channel, dispatch field, or prompt section SHALL be introduced to carry them.

When entries accumulated during the run concern the same repo-level artifact as a pre-seeded entry, the run-observed entry SHALL take precedence for injection purposes, because it reflects the more recent observation.

#### Scenario: Run starts in a repo with a populated learnings file

- **WHEN** `/sai-4-apply` begins a run and `SAI_LEARNINGS.md` contains entries
- **THEN** the coordinator's Technical Learnings Memory is pre-seeded with those entries before the first dispatch, and the first dispatch can therefore receive a relevant entry it would otherwise have had to rediscover

#### Scenario: Pre-seeded memory is not dumped into a dispatch

- **WHEN** the coordinator dispatches a Step and the pre-seeded memory holds entries unrelated to that Step
- **THEN** only the relevant entries are injected, and the unrelated remainder is not

#### Scenario: A run observation contradicts a pre-seeded entry

- **WHEN** a subagent reports a field-6 learning about the same repo-level artifact as a pre-seeded entry
- **THEN** the coordinator injects the run-observed version into subsequent dispatches

### Requirement: sai-2-design merges the learnings file into Implementation Context

When `/sai-2-design` authors `tasks.md`'s `## Implementation Context`, it SHALL read `SAI_LEARNINGS.md` from the project root and merge **Stack** into **Stack**, **Conventions** into **Conventions**, and **Avoid** into **Avoid**. These three merge field-to-field, with no reshaping of entry content.

**Test Command** SHALL NOT be merged field-to-field. The consuming field is contractually a single directly-executable command, and `/sai-2-design` SHALL populate it from its own research as it does today. The learnings **Test Command** section SHALL be used only as corroboration: when fresh research and the recorded command agree, the field is written as researched; when they disagree, the field is written as researched and the disagreement is surfaced per the contradiction-notice requirement below.

When `/sai-2-design` takes any value from the learnings **Test Command** section, it SHALL take the command line only. It SHALL NOT carry the `*Observed:*` provenance line, a bullet marker, or a key prefix into the field, because `## Implementation Context`'s **Test Command** is injected verbatim into the blind test-writer dispatch and any such syntax would render it non-executable.

The merge SHALL be additive to codebase research, not a replacement for it. The existing requirement that each field be derived from actual codebase research SHALL continue to hold; a populated `SAI_LEARNINGS.md` SHALL NOT be accepted as a substitute for that research, and SHALL NOT license a placeholder in any field.

Where a learnings entry and fresh research disagree about the same repo-level artifact, `/sai-2-design` SHALL prefer what it observes in the current codebase, because the learnings entry is a record of what was true when it was written.

The merge SHALL NOT change the shape of `## Implementation Context`. It remains exactly four fields, **Conventions** keeps its 2–5 bullet quota, and **Test Command** remains a sibling field outside that quota.

#### Scenario: Design merges an Avoid entry

- **WHEN** `/sai-2-design` authors `## Implementation Context` in a repo whose `SAI_LEARNINGS.md` records an anti-pattern under **Avoid**
- **THEN** that anti-pattern appears in the **Avoid** field alongside the anti-patterns derived from this change's own research

#### Scenario: Learnings file disagrees with the current codebase

- **WHEN** a **Test Command** entry in `SAI_LEARNINGS.md` names a runner invocation that no longer matches the project's test tooling
- **THEN** `/sai-2-design` writes the command it observes in the current project, not the one recorded in the file

#### Scenario: Merge does not relax the research requirement

- **WHEN** `SAI_LEARNINGS.md` populates three of the four fields
- **THEN** `/sai-2-design` still performs codebase research for all four and does not leave any field as a bare copy standing in for research it did not do

#### Scenario: Conventions quota is preserved

- **WHEN** merging would push **Conventions** past five bullets
- **THEN** `/sai-2-design` selects within the 2–5 bullet quota rather than exceeding it, applying the precedence rule below

#### Scenario: Test Command provenance never reaches the field

- **WHEN** `/sai-2-design` writes **Test Command** in a repo whose `SAI_LEARNINGS.md` records a command with an `*Observed:*` line beneath it
- **THEN** the field contains only the executable command string, with no `*Observed:*` line, bullet marker, or key prefix

#### Scenario: Blind test-writer receives the merged field

- **WHEN** the coordinator injects the **Test Command** field verbatim into a blind test-writer dispatch
- **THEN** the injected value is directly executable from the project root, because the merge carried no bullet or provenance syntax into it

### Requirement: Fresh research takes precedence within the Conventions quota

`## Implementation Context`'s **Conventions** field is capped at 2–5 bullets, and the merge introduces a second source competing for that cap. `/sai-2-design` SHALL resolve the contention deterministically rather than ad hoc.

Bullets derived from this change's own codebase research SHALL be placed first. Bullets merged from `SAI_LEARNINGS.md` SHALL fill the remaining slots up to the cap of five, in the order they appear in the file. When the two sources together exceed five bullets, the merged learnings bullets SHALL be the ones dropped.

`/sai-2-design` SHALL NOT drop a research-derived bullet in order to admit a learnings bullet, and SHALL NOT exceed five bullets to accommodate both. The cap and the 2-bullet floor are unchanged.

A learnings bullet that duplicates a research-derived bullet SHALL be treated as already present rather than consuming a second slot.

#### Scenario: Both sources together exceed the cap

- **WHEN** this change's research yields four **Conventions** bullets and `SAI_LEARNINGS.md` contributes three more
- **THEN** the field contains the four research-derived bullets first and exactly one merged bullet, and the remaining two learnings bullets are dropped rather than displacing research or pushing the field past five

#### Scenario: Learnings bullet duplicates research

- **WHEN** a learnings **Conventions** entry states the same convention a research-derived bullet already states
- **THEN** it is not written a second time and does not consume a slot

#### Scenario: Research alone fills the cap

- **WHEN** this change's research yields five **Conventions** bullets
- **THEN** no learnings bullet is merged into **Conventions**, and the field is written from research alone

### Requirement: Design surfaces learnings entries its research contradicts

When `/sai-2-design` prefers a freshly-researched value over a `SAI_LEARNINGS.md` entry concerning the same repo-level artifact, it SHALL surface that disagreement to the user as a contradiction notice naming the entry's key, the recorded value, and the researched value.

The notice SHALL be printed output only. `/sai-2-design` SHALL NOT edit, delete, or rewrite `SAI_LEARNINGS.md`, and this requirement SHALL NOT be read as granting it any write authority over that file — the file remains writable only by the `/sai-4-apply` coordinator's promotion pass.

This exists because supersede-by-key alone cannot reach a class of stale entries. Promotion fires only from a deviation, a deviation is an execution failure, and a correct value in `## Implementation Context` is precisely what prevents that failure — so an entry corrected at design time may never be re-observed at apply time and would otherwise persist indefinitely. The notice hands the human the one signal needed to prune it, without granting delete authority to any phase.

When `/sai-2-design` finds no such disagreement, it SHALL print nothing.

#### Scenario: Research contradicts a recorded entry

- **WHEN** `/sai-2-design` researches a build target for which `SAI_LEARNINGS.md` records a fact the current codebase contradicts
- **THEN** it writes the researched value into `## Implementation Context` and prints a contradiction notice naming that key, the recorded value, and the researched value

#### Scenario: Design does not edit the learnings file

- **WHEN** `/sai-2-design` detects a contradicted entry
- **THEN** `SAI_LEARNINGS.md` is left byte-for-byte unchanged, and the entry is removed only if a human or a later promotion acts on it

#### Scenario: No contradictions found

- **WHEN** every learnings entry agrees with fresh research
- **THEN** no contradiction notice is printed

### Requirement: sai-3-implement never reads the learnings file directly

`/sai-3-implement` SHALL NOT read `SAI_LEARNINGS.md`. It SHALL receive promoted facts only through `tasks.md`'s `## Implementation Context`, which it already consumes as its expertise contract.

This is required by `/sai-3-implement`'s existing contract, which restricts it to the documents listed in `## Required Documentation` and forbids additional codebase exploration. Granting it a direct read of the learnings file would contradict that contract.

No instruction file SHALL add `SAI_LEARNINGS.md` to `/sai-3-implement`'s reading list, and `sai/instructions/implement.md` SHALL NOT be modified by this change.

#### Scenario: sai-3-implement plans a change in a repo with a learnings file

- **WHEN** `/sai-3-implement` produces `implementation.md` in a repository containing `SAI_LEARNINGS.md`
- **THEN** it reads only its existing inputs, and any promoted fact reaches it solely through the four fields of `## Implementation Context`

### Requirement: Promoted facts never breach test-writer blindness

A promoted fact reaching the blind test-writer through `## Implementation Context` SHALL never reveal the current Step's GREEN implementation body.

This invariant is held closed by construction rather than by an added filter: the promotion classification guarantees that a promoted entry keys on a repo-level artifact and never on a symbol the change being applied introduces. A fact that cannot name the change's new symbols cannot disclose that change's implementation body.

The invariant SHALL be stated explicitly wherever the promotion filter and the test-writer's injected slice are specified, rather than left as an implicit consequence. The coordinator's existing injection-time blindness constraint SHALL remain in force unchanged for entries injected directly into a dispatch.

#### Scenario: A promoted Stack fact reaches the test-writer

- **WHEN** the blind test-writer receives the **Stack** and **Test Command** slice of `## Implementation Context` and that slice carries a promoted entry
- **THEN** the entry names a repo-level artifact such as a framework version or a runner invocation, and reveals nothing about the current Step's implementation body

#### Scenario: Injection-time blindness is unchanged

- **WHEN** the coordinator injects an accumulated learning directly into a blind test-writer dispatch
- **THEN** the existing constraint forbidding any learning that reveals the current Step's GREEN body continues to apply

### Requirement: Wrapper wiring fetches the format file for both consuming commands

`sai/commands/sai-2-design.md` and `sai/commands/sai-4-apply.md` SHALL each fetch `sai/instructions/sai-learnings-format.md` in their instruction-loading block, so the format contract is in context wherever the file is read or written. The fetch SHALL mirror how `sai/instructions/glossary-format.md` is already fetched by `sai/commands/sai-2-design.md`.

These two wrapper edits SHALL be the complete set of wrapper changes. Harness parity SHALL ride the shared instruction bodies rather than being duplicated per harness, consistent with how the existing `glossary-format.md` fetch achieves parity today.

#### Scenario: sai-4-apply loads its instructions

- **WHEN** `sai/commands/sai-4-apply.md` runs its instruction-loading block
- **THEN** it fetches `sai/instructions/sai-learnings-format.md` alongside `sai/instructions/apply.md`

#### Scenario: Parity across harnesses

- **WHEN** the same command is invoked under a different harness
- **THEN** the promotion and consumption behavior is identical, because it is defined in the shared instruction bodies rather than in per-harness wrapper copies
