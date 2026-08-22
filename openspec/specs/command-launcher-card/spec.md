# command-launcher-card Specification

## Purpose

TBD placeholder — purpose to be written when the change completes.

## Requirements

### Requirement: launcher-per-in-scope-command

Every in-scope command SHALL have exactly one launcher card at `sai/commands/{name}/launcher.md`, and that one shared card SHALL serve both harnesses. The in-scope set is the `sai-*` commands shipped as card folders under `sai/commands/`: adding or retiring a command includes adding or removing its launcher, so the membership is owned by the library layout rather than pinned by name here. `budget` SHALL NOT have a launcher and SHALL NOT be loaded through one.

#### Scenario: a launcher per in-scope command

- **WHEN** `sai/commands/` is walked after the change
- **THEN** every in-scope command folder contains exactly one `launcher.md`

#### Scenario: one shared card per command

- **WHEN** a command's launcher is resolved under the Claude Code and opencode roots
- **THEN** both harnesses read the same single `sai/commands/{name}/launcher.md` card

#### Scenario: budget has no launcher

- **WHEN** the change is applied
- **THEN** no `launcher.md` exists for `budget` and no `sai/commands/budget/` card folder holds one

### Requirement: launcher-content

Each launcher SHALL hold exactly the directives its command needs beyond the fetch-skill and boot-adapter loads: the behaviour skills the command genuinely requires at launch time, and the command's routed worker binding under `sai/orchestration/workers/bindings/` where the phase routes through a worker. A directive the command does not need at launch time SHALL NOT remain in a launcher. Card selection is owned by the harness boot adapter, which performs it before the launcher loads; launchers SHALL NOT re-fetch coordinator cards, and this requirement is the canonical home of that rule. Every directive in the launcher SHALL keep its established relative order.

#### Scenario: launcher carries only what its command needs

- **WHEN** any launcher is read
- **THEN** every directive it carries is either a behaviour skill the command genuinely needs at launch time or the command's routed worker binding, and no directive serves any other purpose

#### Scenario: same relative order

- **WHEN** a launcher's directives are compared with their previous order
- **THEN** the relative order of the remaining directives is unchanged

### Requirement: near-empty-launchers

A command whose wrapper carries no directives beyond the fetch-skill, boot-adapter, and launcher loads SHALL still ship a `launcher.md`, near-empty at creation, because a uniform shape across all commands is worth more than the saved files and the card is the extension point that keeps future additions out of the user-owned wrapper. A near-empty launcher SHALL contain no behaviour-skill load and no binding; the absence of coordinator-card fetches follows from the launcher-content rule. Which commands are near-empty is a property of their wrappers, not a membership list: when a command gains a launch-time load its launcher grows and it stops being near-empty, with no specification change.

#### Scenario: wrappers without extra directives ship near-empty launchers

- **WHEN** the launcher of a command whose wrapper carries no directives beyond the fetch-skill, boot-adapter, and launcher loads is read
- **THEN** it contains no behaviour-skill load and no binding

#### Scenario: near-empty launcher is the extension point

- **WHEN** a later library change needs a new behaviour load for a command whose launcher is near-empty
- **THEN** the load lands in the existing `launcher.md`, and the command's wrapper body does not change

### Requirement: harness-neutral-launcher

The launcher SHALL contain no harness-conditional logic: no `claude` or `opencode` token, no harness-specific path or card reference, and no fetch whose target is per-harness. A directive whose presence diverges between the harnesses — one that only one harness's wrapper carries — SHALL stay in that harness's wrapper and SHALL NOT be added to the shared launcher, because the launcher loads in both harnesses and would make the other harness load it too; divergence of presence counts as harness-conditional even when the directive's target path is harness-neutral in form (e.g. a neutral worker binding path carried by only one wrapper). Anything that cannot be written harness-neutrally SHALL stay in the wrapper.

#### Scenario: no harness token in any launcher

- **WHEN** any `launcher.md` is read
- **THEN** it contains neither the string `claude` nor the string `opencode`, and no `@sai/adapters/...` fetch

#### Scenario: divergent directive stays in the wrapper

- **WHEN** a directive is present in exactly one harness's wrapper
- **THEN** the directive remains in that harness's wrapper and is not added to the shared `launcher.md`

#### Scenario: one launcher loads in both harnesses

- **WHEN** a command's launcher call is executed under each harness root
- **THEN** both harnesses resolve and load the same shared card without modification

### Requirement: load-parity

Each command SHALL still load exactly what it loads today: the union of the directives in its wrapper and its launcher — excluding the launcher-call directive itself — SHALL equal the command's directive set, with the fetch-skill and boot-adapter each appearing exactly once and every moved behaviour or binding directive appearing exactly once. Only the load order changes — the boot adapter loads before the behaviour skills — and that SHALL NOT change the command's outcome.

#### Scenario: directive-set parity per command

- **WHEN** the directive sets of a command's wrapper and launcher are collected after the change
- **THEN** the union, excluding the launcher-call directive, equals the command's current directive set with no moved directive added or dropped

#### Scenario: order change is bounded

- **WHEN** the load order before and after the change is compared for any command
- **THEN** the only permitted reordering is the boot adapter loading before the behaviour skills

#### Scenario: outcome preserved

- **WHEN** a command whose behaviour skills moved to the launcher is executed after the change
- **THEN** the boot adapter routes to the same card it routes to today, and the command session applies the same behaviour set to its work once the launcher has loaded

### Requirement: launcher-failure-handling

If the launcher cannot be resolved or read, the command SHALL stop and report the failure. It SHALL NOT proceed half-loaded.

#### Scenario: unresolvable launcher stops the command

- **WHEN** the launcher call names a path the fetch skill rejects or that does not exist
- **THEN** the command stops and reports the resolution failure, and loads no further behaviour

### Requirement: install-through-recursive-projection

Launchers SHALL ship through the existing `sai-commands` projection — recursive copy of `sai/commands/` into the `sai` destination class for both harnesses — with no installer or manifest change.

#### Scenario: no manifest entry names the launcher

- **WHEN** `sai/install-manifest.json` is read
- **THEN** it contains no entry naming `launcher.md`, and the recursive `sai-commands` projection covers the new cards

#### Scenario: no installer source change

- **WHEN** `bin/` is compared before and after the change
- **THEN** no installer source file is modified

### Requirement: test-assertions-move

Tests that assert against command wrapper bodies SHALL move those assertions to the corresponding `launcher.md`. Assertions that pin frontmatter or the wrapper's own directives — the full directive set of that wrapper, including `sai-explore`'s harness-specific loads — SHALL remain on the wrapper.

#### Scenario: binding-count assertions move

- **WHEN** the test suite that verifies how direct worker-binding fetches are classified and counted across installed launchers and wrappers is read
- **THEN** it counts the launcher's binding fetches instead of the wrapper's

#### Scenario: frontmatter assertions stay

- **WHEN** the test suite asserting `sai-1-spec` wrapper frontmatter is read
- **THEN** it still asserts the wrapper file's `model` and `effort` (Claude Code) and `model` (opencode) frontmatter
