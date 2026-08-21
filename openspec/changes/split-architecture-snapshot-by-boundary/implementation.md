# split-architecture-snapshot-by-boundary

## Goal

Split Architecture Snapshot by caller boundary (external-first, then internal public) across the live design-target-state capability, design authoring instructions, change-overview rendering contract, glossary terminology, and contract tests — without expanding schema templates or rewriting existing designs.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "split-architecture-snapshot-by-boundary"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Retarget main design-target-state capability spec

*(Non-testable step — capability delta and main-spec prose only; structural regressions land in Step 5.)*

- [x] Confirm the change delta at `openspec/changes/split-architecture-snapshot-by-boundary/specs/design-target-state/spec.md` already carries these three wording fixes (edit the delta only if any is missing):
  1. Overview boundary requirement: nested `#### External Surfaces` / `#### Internal Public Surfaces` are structural anchors that stay English regardless of `overview_language`.
  2. Glossary relationship: terminology-only link (Architecture Snapshot → External Surface then Internal Public Surface, external first); no nonempty-inventory or unclear→external authoring conditions on the glossary relationship.
  3. External-block inventory: direct `SHALL inventory … when the change plans them` (not “SHALL be able to inventory”).
- [x] Fold the corrected delta into the live main capability at `openspec/specs/design-target-state/spec.md` by applying all of the following in one coherent edit (preserve non-conflicting requirements such as File Manifest net-fold and File Manifest glossary term):

**A. MODIFIED — `### Requirement: design.md opens with a Target State section`**

Replace the paragraph that begins `Directly beneath \`## Target State\`` so it requires exactly two `###` siblings (`### Architecture Snapshot` then `### File Manifest`), states that nested Architecture Snapshot boundary blocks are internal structure and do not count as additional `###` siblings, and forbids a third `###` sibling. Add this scenario after the existing Target State scenarios:

```markdown
#### Scenario: nested snapshot structure does not add a Target State sibling

- **WHEN** `design.md` contains both Architecture Snapshot boundary blocks
- **THEN** `## Target State` contains exactly `### Architecture Snapshot` followed by `### File Manifest`
- **AND** the nested external-first/internal-second blocks do not become a third `###` subsection
```

**B. MODIFIED — `### Requirement: Target State does not replace or duplicate per-step interfaces`**

After the first paragraph, add that external/internal grouping in `### Architecture Snapshot` is a review classification only and does not change step attribution, detailed signatures, or exact test assertions. Add:

```markdown
#### Scenario: snapshot grouping does not replace step authority

- **WHEN** a public method is listed in either Architecture Snapshot boundary block and introduced by a particular step
- **THEN** the matching `interfaces.md` step remains authoritative for that method's signature, attribution, and test assertions
- **AND** the snapshot's block classification does not create a second per-step contract
```

**C. MODIFIED — `### Requirement: File Manifest has an independent None sentinel`**

Update independence wording so the File Manifest sentinel is independent of the whole Architecture Snapshot inventory's shared `None — no planned public surfaces` sentinel and of either boundary block's empty rendering. Update the docs-only scenario to say “plans no externally consumable or internal public surfaces”, keep the shared snapshot sentinel, keep the full manifest, and add that no empty boundary-block rendering is emitted when the whole snapshot inventory is empty.

**D. ADDED requirements** — append (before any REMOVED/RENAMED stubs) the five ADDED requirements from the change delta, byte-aligned with the delta text for:

1. `### Requirement: Architecture Snapshot is partitioned by caller boundary` (including scenarios: external precedes internal; installed layout external without replacing manifest; unclear→external; endpoint-map not reintroduced)
2. `### Requirement: Architecture Snapshot has one shared empty-inventory sentence` (both empty; only external empty; only internal empty; emptiness does not suppress manifest)
3. `### Requirement: Derived change-overview rendering preserves snapshot boundary order` (non-empty division with English nested headings regardless of `overview_language`; whole-inventory sentinel source-only; one empty block distinguishable)
4. `### Requirement: Architecture Snapshot boundary terms are defined in the glossary` (canonical entries; relationships external-first terminology-only; caller-boundary flagged ambiguity)
5. `### Requirement: Snapshot boundary changes are prospective and preserve existing artifacts`

- [x] Do **not** edit `openspec/schemas/sai-workflow/templates/design.md`, `change-overview.md`, or `schema.yaml`.
- [x] Do **not** rewrite any other change’s `design.md`.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `openspec/specs/design-target-state/spec.md` contains `#### External Surfaces` before `#### Internal Public Surfaces` in the partition requirement
- [x] Main spec contains shared sentinel `None — no planned public surfaces` and block-specific sentinels `None — no planned externally consumable surfaces` / `None — no planned internal public surfaces`
- [x] Main spec overview requirement states nested boundary headings stay English regardless of `overview_language`
- [x] Main spec external inventory uses direct `SHALL inventory` (not “able to inventory”)
- [x] Main spec does not introduce Endpoint Map as a positive structure
- [x] `npm test` — expected: PASS (or only pre-existing unrelated failures; Step 5 owns structure-test alignment if any test still encodes the unsplit inventory wording)

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Update live Architecture Snapshot authoring instructions

*(Non-testable step — normative command instruction rewrite. Existing structure tests may go red until Step 5.)*

- [x] In `sai/commands/design/instructions.md`, under `### Target State (authored first in design.md)`, replace the undifferentiated Architecture Snapshot inventory paragraph (the paragraph that begins `` `### Architecture Snapshot` is a concise derivative review surface`` and inventories “every planned public class, interface, and method”) with the split contract below. Keep the two-subsection emission rule (`### Architecture Snapshot` then `### File Manifest`) and the entire File Manifest net-fold block unchanged except the File Manifest independent-None sentence if it still couples only to “public classes/interfaces/methods”.

Replace the Architecture Snapshot inventory rules with:

```markdown
`### Architecture Snapshot` is a concise derivative review surface, not a replacement for the authoritative per-step contracts. When the inventory contains at least one planned public surface, emit exactly two ordered nested blocks under `### Architecture Snapshot`: `#### External Surfaces` first, then `#### Internal Public Surfaces` second. Those nested blocks are internal structure only — they SHALL NOT count as additional `###` siblings under `## Target State`, and no third `###` subsection SHALL be emitted inside `## Target State`.

Classify a surface as external when callers, users, or integrations outside the repository's controlled caller boundary may consume or depend on it. Classify a surface as internal public when it is intentionally public but its callers are constrained to the repository or another explicitly controlled part of the change. When classification is unclear, default the surface to `External Surfaces`.

When the change plans them, the external block SHALL inventory externally consumable typed commands, produced artifact formats, installed file layout, and other public promises — including public classes, interfaces, and methods when their callers are uncontrolled. When the change plans them, the internal block SHALL inventory internal public classes, interfaces, methods, and other public surfaces whose callers are controlled. List each surface once with its project-root-relative path or owning location and concise portable-ASCII relationships or execution flow where relevant. The snapshot remains surface-oriented: it MAY identify an installed layout or produced format as a public surface, but SHALL NOT duplicate every File Manifest entry as a surface merely because a file is touched. Do not emit absolute filesystem paths. Do not invent file-level entries as substitutes for surfaces.

Do NOT author a separate Endpoint Map block, endpoint-map table, endpoint table, or endpoint-map announcement; endpoint-like public promises belong in the external block.

When neither boundary has a planned public surface, emit no nested boundary-block headings and carry exactly one shared emptiness sentence, `None — no planned public surfaces`, followed by one line explaining why the complete inventory is empty. When one boundary has no entries but the other has at least one, still emit both nested blocks in order; the empty block uses its own block-specific rendering — `None — no planned externally consumable surfaces` for `#### External Surfaces` or `None — no planned internal public surfaces` for `#### Internal Public Surfaces` — followed by a one-line reason. Never substitute the shared whole-inventory sentence for a block-specific rendering. These snapshot renderings remain independent from the File Manifest sentinel `None — no files affected`.

The matching `## Step N` sections in `interfaces.md` remain authoritative for step attribution, detailed signatures, and exact test assertions; the snapshot's external/internal grouping is a review classification only and must not override or silently replace them.
```

- [x] Update the File Manifest independent-None sentence in the same file so it references independence from the shared whole-inventory snapshot sentinel and from either boundary block's empty rendering (not only from a class/interface/method inventory).
- [x] Leave all non-snapshot instruction sections (approval gate, collaboration, decisions, tasks generation, interfaces generation, feedback presentation, cost discipline) unchanged.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `sai/commands/design/instructions.md` contains `#### External Surfaces` before `#### Internal Public Surfaces` in the Architecture Snapshot authoring rules
- [x] Instructions use direct inventory obligation language (not “able to inventory”)
- [x] Instructions contain `None — no planned public surfaces`, `None — no planned externally consumable surfaces`, and `None — no planned internal public surfaces`
- [x] Instructions state unclear classification defaults to External Surfaces
- [x] Instructions do not introduce Endpoint Map as an authored block
- [x] Nested blocks are stated not to be additional `###` Target State siblings
- [x] `node --test test/design-coordinator-worker.test.js` — may FAIL on structure/snapshot wording until Step 5; record failures; do not revert Step 2 to silence them

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step. Known red structure tests are deferred to Step 5.

#### Step 3: Update derived change-overview snapshot rendering contract

*(Non-testable step — derived projection rules. Overview contract tests may go red until Step 5.)*

- [ ] In `sai/commands/design/change-overview.md`, extend the rendering language / output organization rules for `## Target Architecture` / `### Snapshot` as follows (integrate into existing prose; do not add a tenth top-level section or change the five-field result envelope):

1. **Source-only derivation** remains: Architecture Snapshot content is derived only from `design.md`.
2. **Non-empty inventory projection:** When the source Architecture Snapshot inventory has at least one surface, under the fixed `### Snapshot` subsection render exactly two nested headings in order: `#### External Surfaces` then `#### Internal Public Surfaces`. External entries and source-grounded prose under the first; internal under the second. MAY condense prose under existing fidelity rules; MUST NOT flatten the two groups into an undifferentiated list, reverse their order, or invent a surface.
3. **English structural anchors:** Add `#### External Surfaces` and `#### Internal Public Surfaces` to the closed English-fixed structural-anchor set alongside the nine top-level headings and `### Snapshot`. They stay English regardless of `overview_language`; only free-text prose under them may localize. Generator-authored *editorial* `###` headings under Target Architecture may still localize; these two nested `####` boundary headings must not.
4. **Whole-inventory empty:** When the source snapshot is entirely empty (`None — no planned public surfaces`), the overview MUST NOT emit that shared public-surface sentinel as a rendered promise and MUST NOT emit either nested boundary heading.
5. **One empty block:** When the source has one empty boundary block, the overview still renders both nested headings in order and retains the source-grounded block-specific empty sentinel under the correct heading (never replace with the shared whole-inventory sentence).

Suggested concrete insertion after the existing `### Snapshot` / Target Architecture localization bullets (adapt wording to match surrounding style):

```markdown
When projecting a non-empty Architecture Snapshot from `design.md` under `## Target Architecture` / `### Snapshot`, render exactly `#### External Surfaces` followed by `#### Internal Public Surfaces`. These two nested headings are structural anchors in the same closed English-fixed set as the nine top-level headings and `### Snapshot`: they remain English regardless of `overview_language` and are never translated. Place external entries and source-grounded prose under the first heading and internal entries under the second. You MAY condense source prose under the fidelity rules, but you MUST NOT flatten the two groups, reverse their order, or invent a surface.

When the source snapshot is entirely empty, omit both nested boundary headings and do not copy the source shared `None — no planned public surfaces` sentinel into the overview as a rendered public-surface promise. When the source has one empty boundary block, still render both nested headings in order and retain the corresponding source-grounded block-specific empty sentinel under the correct heading rather than substituting the shared whole-inventory sentence.
```

- [ ] Do not change schema templates, the nine-section overview shape, or the closed result envelope.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `sai/commands/design/change-overview.md` requires external-first then internal-second nested Snapshot headings for a non-empty source inventory
- [ ] Overview contract lists the two nested boundary headings among English structural anchors that stay English regardless of `overview_language`
- [ ] Overview contract omits whole-inventory public-surface None projection
- [ ] One-empty-block projection retains block-specific sentinel under the correct heading
- [ ] `node --test test/change-overview-contract.test.js` — may FAIL until Step 5 if new boundary assertions are not yet present; existing Endpoint Map absence checks should remain green

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 4: Normalize Architecture Snapshot boundary glossary terms

*(Non-testable step — glossary compliance check and minimal wording normalization.)*

- [ ] Verify project-root `GLOSSARY.md` against the glossary requirement:
  - Exactly one `**External Surface**` and one `**Internal Public Surface**` entry under `## Language`, each with an `*Avoid*` line (already present — keep definitions aligned with uncontrolled vs controlled callers).
  - `## Flagged ambiguities` distinguishes uncontrolled vs controlled callers (already present — keep).
  - Do **not** add Endpoint Map as a positive glossary term.
- [ ] Normalize the Architecture Snapshot relationship line so it is **terminology-only**: link **Architecture Snapshot** to an external-first **External Surface** block and an **Internal Public Surface** block. Remove nonempty-inventory conditions and the unclear→external default from that relationship line (those authoring rules live only in design-target-state / instructions).

Replace the current relationship line that includes inventory/default authoring conditions with:

```markdown
- An **Architecture Snapshot** relates to an external-first **External Surface** block and an **Internal Public Surface** block.
```

Keep the separate File Manifest / Target State relationship lines unchanged.

- [ ] Confirm `**Architecture Snapshot**` language entry still describes boundary blocks at the term level without restating emptiness/default authoring procedures as normative authoring steps.

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `GLOSSARY.md` `## Language` contains exactly one `**External Surface**` and one `**Internal Public Surface**` entry, each with `*Avoid*`
- [ ] Relationships name Architecture Snapshot → External Surface then Internal Public Surface (external first) without nonempty/default authoring conditions on that line
- [ ] Flagged ambiguities still distinguish uncontrolled vs controlled callers
- [ ] No new positive Endpoint Map glossary term

*(No Human checks — service-side step with no observable browser behavior. Manual glossary-format compliance is the automated checklist above.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 5: Align contract tests with split snapshot and overview projection

*(Non-testable step — contract-test alignment after sources landed; suite green only after this step. No RED/GREEN: the step rewrites existing lexical oracles, not production functions with assertion-first TDD.)*

- [ ] Update `test/change-overview-contract.test.js` and `test/design-coordinator-worker.test.js` in the **same step** so duplicated structure oracles stay byte-aligned on shared literals (heading strings, sentinels, Endpoint Map absence).
- [ ] Preserve existing `node:test` + `assert.match` / `assert.doesNotMatch` / index-order style and the shared `artifact()` helper. Do not introduce a renderer harness.
- [ ] Keep all existing Endpoint Map absence / schema non-advertisement assertions green.
- [ ] Keep design template skeleton assertions: templates still have `### Architecture Snapshot` then `### File Manifest` and still lack nested `#### External Surfaces` / `#### Internal Public Surfaces` headings.

**Add (or extend) tests in both files covering:**

1. **External-first nested headings in live instructions** — in `sai/commands/design/instructions.md`, `#### External Surfaces` appears before `#### Internal Public Surfaces` within the Architecture Snapshot authoring region.
2. **External-first nested headings in overview contract** — in `sai/commands/design/change-overview.md`, the same order for Snapshot projection.
3. **Emptiness forms** — instructions (and main spec where asserted) contain shared `None — no planned public surfaces` and block-specific `None — no planned externally consumable surfaces` / `None — no planned internal public surfaces`, with independence from File Manifest `None — no files affected`.
4. **Overview projection rules** — non-empty division propagates nested headings; whole-inventory public-surface None is source-only (not copied); one-empty-block keeps block-specific sentinel; nested headings stay English regardless of `overview_language`.
5. **Exactly two Target State `###` siblings** — design instruction/spec still require only `### Architecture Snapshot` then `### File Manifest`; nested blocks do not create a third `###` sibling.
6. **Template skeletons unchanged** — `openspec/schemas/sai-workflow/templates/design.md` and `templates/change-overview.md` do not contain `#### External Surfaces` or `#### Internal Public Surfaces`.
7. **Unclear→external** and **direct inventory obligation** — instructions/main spec match those rules.
8. **Endpoint Map absence** — retain existing negative assertions on design surfaces and schema description.

**Concrete test additions** (paste into each file near the existing Target State / overview localization tests; adjust only if a near-identical test already exists after Steps 1–4):

```javascript
test('Architecture Snapshot authoring is partitioned external-first then internal', () => {
  const instruction = artifact('sai/commands/design/instructions.md');
  const externalIndex = instruction.indexOf('#### External Surfaces');
  const internalIndex = instruction.indexOf('#### Internal Public Surfaces');
  assert.ok(externalIndex !== -1, 'design instruction should name #### External Surfaces');
  assert.ok(internalIndex !== -1, 'design instruction should name #### Internal Public Surfaces');
  assert.ok(externalIndex < internalIndex, 'External Surfaces must precede Internal Public Surfaces');
  assert.match(instruction, /unclear[\s\S]{0,120}External Surfaces|default[\s\S]{0,80}External Surfaces/i,
    'unclear classification should default to External Surfaces');
  assert.match(instruction, /SHALL inventory|shall inventory|When the change plans them[\s\S]{0,80}inventory/i,
    'external inventory should be a direct obligation when surfaces are planned');
  assert.match(instruction, /None — no planned public surfaces/);
  assert.match(instruction, /None — no planned externally consumable surfaces/);
  assert.match(instruction, /None — no planned internal public surfaces/);
  assert.match(instruction, /None — no files affected/);
  assert.doesNotMatch(instruction, /^## Endpoint Map\s*$/m);
  assert.doesNotMatch(instruction, /^### Endpoint Map\s*$/m);
});

test('design-target-state main spec carries split snapshot contract', () => {
  const specification = artifact('openspec/specs/design-target-state/spec.md');
  const externalIndex = specification.indexOf('#### External Surfaces');
  const internalIndex = specification.indexOf('#### Internal Public Surfaces');
  assert.ok(externalIndex !== -1 && internalIndex !== -1 && externalIndex < internalIndex);
  assert.match(specification, /stay English regardless of[\s\S]{0,40}overview_language|remain in English regardless of[\s\S]{0,40}overview_language/i);
  assert.match(specification, /SHALL inventory/);
  assert.doesNotMatch(specification, /SHALL be able to inventory/);
  assert.match(specification, /None — no planned public surfaces/);
  assert.match(specification, /None — no planned externally consumable surfaces/);
  assert.match(specification, /None — no planned internal public surfaces/);
  assert.match(specification, /endpoint-map structure is not reintroduced|no Endpoint Map/i);
});

test('overview contract preserves snapshot boundary order and English nested anchors', () => {
  const instruction = artifact('sai/commands/design/change-overview.md');
  const externalIndex = instruction.indexOf('#### External Surfaces');
  const internalIndex = instruction.indexOf('#### Internal Public Surfaces');
  assert.ok(externalIndex !== -1 && internalIndex !== -1 && externalIndex < internalIndex);
  assert.match(instruction, /English[\s\S]{0,120}overview_language|overview_language[\s\S]{0,120}English/i);
  assert.match(instruction, /structural anchors|English-fixed|fixed[\s\S]{0,40}English/i);
  assert.match(instruction, /flatten|reverse|invent/i);
  assert.match(instruction, /None — no planned public surfaces/);
  assert.match(instruction, /block-specific|one empty|empty boundary/i);
});

test('schema templates remain skeletons without nested boundary headings', () => {
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const overviewTemplate = artifact('openspec/schemas/sai-workflow/templates/change-overview.md');
  for (const template of [designTemplate, overviewTemplate]) {
    assert.doesNotMatch(template, /#### External Surfaces/);
    assert.doesNotMatch(template, /#### Internal Public Surfaces/);
  }
  assert.match(designTemplate, /### Architecture Snapshot/);
  assert.match(designTemplate, /### File Manifest/);
});
```

- [ ] Prefer placing the shared assertions in both files when the suite historically duplicates design/overview structure checks; if one file already owns a given oracle exclusively, keep that ownership and only add the missing half.
- [ ] After edits, run the focused suites then the full suite.

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `node --test test/change-overview-contract.test.js` — expected: PASS
- [ ] `node --test test/design-coordinator-worker.test.js` — expected: PASS
- [ ] `npm test` — expected: PASS
- [ ] Both test files assert `#### External Surfaces` before `#### Internal Public Surfaces` in the relevant live instruction/overview sources
- [ ] Both retain Endpoint Map absence assertions
- [ ] Schema templates still lack nested boundary headings
- [ ] Design structure still requires exactly `### Architecture Snapshot` then `### File Manifest` under Target State

**Human (manual verification from design.md — no browser UI):**
- [ ] Open `openspec/schemas/sai-workflow/templates/design.md` and `openspec/schemas/sai-workflow/templates/change-overview.md` and confirm they still lack nested `#### External Surfaces` / `#### Internal Public Surfaces` headings (skeletons unchanged).
- [ ] Open `sai/commands/design/instructions.md` Target State section and confirm a reader sees external-first/internal-second nested blocks, the three emptiness forms, File Manifest independence, and no Endpoint Map heading.

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify the Manual Verification checks above, then stage and commit before continuing.
