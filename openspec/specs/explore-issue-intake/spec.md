# explore-issue-intake Specification

## Purpose
Give `/sai-explore` one defined, source-agnostic intake for any issue, bug, or ticket that enters the conversation, so an incoming issue becomes a candidate idea through a single work question instead of improvised turns.

## Requirements

### Requirement: Issue intake starts only on issue text or an explicit statement

`/sai-explore` SHALL start the issue intake when an issue URL that the `/sai-explore` load imported (the cleaned argument is exactly one URL that `from-backlog.js detect` classifies as an issue) brings its issue into the conversation, when text in issue format (a description carrying the headings `## Problem`, `## Goal`, `## Scope`, `## Non-goals`, `## Open questions`, and `## Maturity`) enters the conversation, or when the user explicitly states that the text is an issue, and SHALL apply the intake before the direct-looking request rule to that text. The intake SHALL behave the same for every source (imported, pasted, read from a file, or passed as the `/sai-explore` argument) and the intake step itself SHALL name no skill (the `/sai-explore` load that imports a whole-argument issue URL names the from-backlog skill before the intake starts). Any other link SHALL be ordinary content that triggers nothing, any other text SHALL enter through the direct-looking request rule, and hidden markers or HTML comments in the issue SHALL NOT carry block content. Claude Code and opencode SHALL follow the same intake.

#### Scenario: Issue passed as the command argument

- **WHEN** an issue-format text arrives as the `/sai-explore` argument
- **THEN** Explore follows the same intake as for an issue pasted into the conversation

#### Scenario: A link alone triggers nothing

- **WHEN** the user's message carries only a link to an issue and no issue text, and the link is not the whole `/sai-explore` argument
- **THEN** no intake starts and the message is classified as ordinary input

#### Scenario: Explicit statement starts intake

- **WHEN** the user states that a text without the issue-format headings is an issue
- **THEN** Explore starts the issue intake for that text

#### Scenario: Imported issue URL starts intake

- **WHEN** the `/sai-explore` load imports the issue of a whole-argument issue URL
- **THEN** Explore starts the issue intake for the imported issue and asks its work question

### Requirement: The work question decides whether the issue becomes the candidate idea

Explore SHALL read the issue once with `change-document.js sections` as soon as the issue's complete content is in the conversation, before asking the work question, and SHALL determine maturity and the proposed `Change name` from that reading's `ready_to_propose_form` and `proposed_change_name`, never from its own judgment. It SHALL then ask the work question through the harness-native picker (`AskUserQuestion` on Claude Code, `question` on opencode) with the options `work` and `context` in that order, and the question SHALL close that turn. When several unrelated issues arrive in one message, the question SHALL list one `work` option per issue plus `context`, falling back to numbered plain text beyond the picker capacity, and the user SHALL pick at most one issue to work on while the rest stay as context. A message that states the intent to work on the issue while bringing it SHALL answer the question with `work` without asking. An issue SHALL be mature when `ready_to_propose_form` is `true`, and for such an issue the question SHALL also show a kebab-case `Change name` proposed from the issue's `Goal`, starting from the tool's `proposed_change_name`, correctable through the free-text answer. For a mature issue the work question SHALL be one round of `@sai/policies/question-rounds.md` together with the drift check as its conditional second question, included only when the seed leaves at least one section `agreed`; the round SHALL close the turn, and a message that already states the intent to work SHALL leave the round the drift question alone. An issue that is not mature SHALL keep the work question alone. `--fast-track` SHALL NOT skip the work question.

#### Scenario: Work question closes the turn

- **WHEN** an issue-format text that is not mature enters the conversation without a stated intent to work on it
- **THEN** Explore asks the work question with the options `work` and `context` through the native picker and ends the turn

#### Scenario: Stated intent answers work

- **WHEN** the user brings an issue with a message such as "let's tackle this issue"
- **THEN** Explore treats the work question as answered `work` and asks nothing

#### Scenario: Several unrelated issues

- **WHEN** one message carries several unrelated issues
- **THEN** the work question offers one `work` option per issue plus `context`, and at most one issue becomes the candidate idea

#### Scenario: Fast-track still asks

- **WHEN** `/sai-explore` runs with `--fast-track` and an issue enters the conversation
- **THEN** the work question is still asked of the user

#### Scenario: The form comes from the conversion tool

- **WHEN** an issue enters the conversation
- **THEN** Explore runs `change-document.js sections` before asking and takes the maturity form and the proposed `Change name` from its `ready_to_propose_form` and `proposed_change_name`

#### Scenario: A mature issue asks the drift check in the same round

- **WHEN** a mature issue's reading leaves at least one section seeded `agreed`
- **THEN** the work question and the drift check are one round of `@sai/policies/question-rounds.md`, and the round closes the turn

### Requirement: A worked issue becomes the candidate idea with carried starting lists

On `work`, in the same turn and with no separate activation turn, the issue SHALL become the candidate idea with its stated content as starting content, and `Explore change` SHALL begin as for any candidate idea; the issue SHALL NOT be treated as an order to implement. Explore SHALL seed the issue's sections into `explore-idea@1` whatever its `Maturity`: a section the issue holds explicitly (present, or explicitly stated as none) and that no `Open questions` entry affects SHALL be recorded `agreed` with the source `issue`, an explicitly empty list SHALL be seeded as the agreed `- None`, and an absent or empty section, or one an open question affects, SHALL be recorded `open` with the issue's items as its starting proposal. The issue's `E#` and `I#` lists SHALL keep their identifiers `E1..En` and `I1..In`, and for an open list stage Explore MAY add only items that come from that stage's checks, with agreement and advancement unchanged. A section SHALL be skipped only because its data already exists in an agreed source; the data itself SHALL never be omitted. When the issue has related issues, Explore MAY explore them for context while the work stays limited to the issue mentioned first. When at least one section was seeded `agreed`, the drift check SHALL follow. On `context`, no candidate idea SHALL exist, nothing SHALL be seeded, and the issue SHALL only inform the conversation; when the user later chooses that issue for work, at any `Maturity`, Explore SHALL run the `work` path from its start and SHALL NOT ask the work question again.

#### Scenario: Carried edge cases start the edge-case stage

- **WHEN** an issue whose `E#` list is open (absent or affected by an open question) was answered `work` and the exploration reaches `Review edge cases`
- **THEN** Explore presents the carried list as the starting list and adds only items from the stage's own checks

#### Scenario: Carried implementation details start their stage

- **WHEN** an issue whose `I#` list is open was answered `work` and the exploration reaches `Implementation details`
- **THEN** Explore presents the carried list as the starting list and adds only items from the stage's own checks

#### Scenario: Context creates no candidate idea

- **WHEN** the user answers the work question with `context`
- **THEN** no candidate idea is created, nothing is seeded, and the next input is classified as usual

#### Scenario: A context issue later chosen for work resumes the intake

- **WHEN** an issue kept as `context` is later chosen for work
- **THEN** Explore seeds its sections at any `Maturity` and continues the `work` path without asking the work question again

#### Scenario: An explicit none is an agreed empty list

- **WHEN** a worked issue's `Implementation notes` section says `None`
- **THEN** the implementation-details section is seeded `agreed` as `- None`

#### Scenario: An open question reopens the section it affects

- **WHEN** a worked issue has an `Open questions` entry about an edge case
- **THEN** the edge-case section is seeded `open` with the issue's items as the starting proposal, and an entry that maps to no single section opens `Explore change`

### Requirement: The conversion tool owns the issue-to-block mapping in the intake

Explore SHALL NOT judge which sections an issue agrees, and the intake SHALL build no block from the issue: the change document is composed at `Crystallize` from the agreed sections and, on the mature fast path, by the conversion tool. Explore SHALL run `change-document.js sections` with `--input-file <path>`, the file holding the issue's complete text (its title as a `# <title>` first line, then its description exactly as it entered the conversation, Markdown or HTML; the text exactly as it entered when it already begins with a `# <title>` line, such as a pasted change document), written with the harness-native file-write tool in a directory from `transfer.js open`, as soon as the issue's complete content is in the conversation. The tool SHALL accept an issue of any `Maturity`. Explore SHALL read the tool's `sections`, `open_questions`, `seed`, `ready_to_propose_form`, `proposed_change_name`, `declared_clean_note`, `change`, and `backlog_origin`, and SHALL send `seed` verbatim to `explore-idea@1` as an input-file event only after `work` is answered. When the seed event answers `SECTIONS_INVALID`, Explore SHALL report it in one line and continue from `Explore change` with every section `open`, without running `sections` again for that issue.

#### Scenario: Conversion rejection continues with the planned steps

- **WHEN** the seed event sent to `explore-idea@1` answers `SECTIONS_INVALID`
- **THEN** Explore reports it in one line and continues from `Explore change` with every section `open`

#### Scenario: Open questions reject the conversion

- **WHEN** an issue whose `Maturity` reads `Ready to propose` still has entries in `Open questions`
- **THEN** no change document is built from the issue and the sections those entries affect are seeded `open`

#### Scenario: No seed before the work answer

- **WHEN** the issue reading is complete and the work question is still unanswered
- **THEN** no seed event is sent to `explore-idea@1` and nothing is composed

### Requirement: The drift check validates every section an issue seeded agreed

Explore SHALL ask the drift check once `work` is answered and at least one section was seeded `agreed`; for an issue that is not mature it is asked after `work`, and for a mature issue it is the conditional second question of the work round. No earlier assessment of the issue SHALL replace it. `validate` SHALL compare each `agreed` section's behaviors, constraints, and implementation notes with the current code read-only and report each mismatch with its path; on the mature fast path the deterministic precheck's missing references SHALL be the starting point of that comparison. The outcome SHALL be exactly one of `clean` (every agreed section stays agreed), `drift` (a mismatch was found, or the user states that the issue has drifted, which answers the question without asking), or `declared-clean` (the user skipped validation; every seeded section stays agreed and the change document composed at `Crystallize` carries the tool's `declared_clean_note` line in its `## Additional notes` section). On `drift`, each mismatch, doubt, or improvement SHALL be shown with its evidence and SHALL mark only the section it touches `open`, keeping that section's list as the starting proposal; every other section SHALL stay `agreed`, and no document SHALL be composed on the mature fast path. The same rule SHALL hold for a deviation found in an `agreed` section at any later point of the conversation. `--fast-track` SHALL NOT skip the drift check.

#### Scenario: Drift opens only the touched section

- **WHEN** `validate` reports a mismatch in the issue's implementation notes
- **THEN** only the implementation-details section becomes `open` and the other agreed sections stay agreed

#### Scenario: Declared-clean keeps the seeded sections

- **WHEN** the user answers the drift check with `declared-clean` on a mature issue whose every section is agreed
- **THEN** every seeded section stays agreed and the composed change document carries the declared-clean line in its `## Additional notes` section

#### Scenario: No agreed section means no drift check

- **WHEN** a worked issue seeds no section `agreed`
- **THEN** no drift check is asked and the issue continues in `Explore change`

#### Scenario: A validate mismatch composes nothing

- **WHEN** `validate` reports a mismatch on a mature issue
- **THEN** the touched section becomes `open` and no change document is composed on the fast path

### Requirement: A seeded issue resumes at its first open section through goto

Once the seed and the drift check are recorded, Explore SHALL emit one `goto` to `crystallize` with reason `user-request`. When every section is agreed the move SHALL be accepted; a mature issue whose drift check ended `declared-clean` or `validate` with no mismatch SHALL enter `Crystallize` on the fast path, where the conversion tool composes its document. An issue that is not mature, and a mature issue with any open section or drift mismatch, SHALL be composed by the model as always: a single change SHALL take its change document from the agreed sections, and a sliced set SHALL distribute the `I` items across slices with their literal text. The slicing assessment SHALL run as always, with one exception: a re-imported published change document (the reading returns `change.name`) SHALL skip it, because its origin exploration already sliced it. When a section is open the move SHALL answer `MISSING_PRECONDITIONS`; Explore SHALL then `goto` `resume_at` and present that stage with the issue's starting content, and the next forward move SHALL skip every stage whose section is still `agreed`. When `resume_at` is the current stage, Explore SHALL stay and present it. No route SHALL start without the explicit route-selector answer. Claude Code and opencode SHALL follow the same path.

#### Scenario: Fully agreed issue enters Crystallize

- **WHEN** every section of a worked issue is agreed after the drift check
- **THEN** the `goto` to `crystallize` is accepted and the change document set is followed by the route selector

#### Scenario: An open section is presented first

- **WHEN** the edge-case section of a worked issue is open
- **THEN** the `goto` to `crystallize` is rejected with `resume_at` `review-edge-cases`, Explore moves there, and presents the issue's edge cases as the starting list

#### Scenario: Slicing distributes literal implementation items

- **WHEN** the slicing assessment splits a fully agreed issue into several slices
- **THEN** each `I` item reaches its slice with its literal text

#### Scenario: A re-imported published change document is not sliced again

- **WHEN** the issue reading returns `change.name`
- **THEN** Explore skips the slicing assessment and follows the route selector for that one change

### Requirement: A mature issue is taken in through deterministic tools

A mature issue SHALL run the deterministic precheck of `sai/tools/issue-precheck.js` before its question round, SHALL present the issue as a summary instead of its full text, and SHALL compose its change document with `change-document.js compose` when the round answers `work` with every section agreed and a drift check that ends `declared-clean` or `validate` with no mismatch. The precheck SHALL inform and never decide: it SHALL list the paths, `path:line` references, and symbols the working tree does not hold, with the section each appears in, and SHALL open no section. The summary SHALL carry the link, state, title, `Goal`, the counts of edge cases, implementation notes, and decisions, and every comment in full with its author; the full issue text SHALL appear once, in the final document. When a section stays `open`, the exploration SHALL resume at that section and the later crystallization SHALL compose the document as before. On the fast path `compose` SHALL write the issue's literal text with the settled `## Change` lines, including `backlog_origin.value`, the `Explore origin:` list in order with the current session appended when it resolves, the `Specs:` value of a re-imported document, and the no-specs answer when the reading carries none. A `check` or document-emit rejection, or a `violation` hygiene verdict on a flagged line, SHALL fall back to model composition with its cause shown, without stopping the run. Claude Code and opencode SHALL follow the same flow.

#### Scenario: Fast path starts only for a mature issue

- **WHEN** `sections` reports `ready_to_propose_form: false`
- **THEN** the issue keeps the full flow: the work question alone, the seed after `work`, and the drift check only when a section is agreed

#### Scenario: The precheck informs the drift decision

- **WHEN** the precheck reports references the working tree does not hold
- **THEN** Explore shows each missing reference with its section before the round, and the user still chooses `validate` or `declared-clean`

#### Scenario: A newly proposed symbol is not an error

- **WHEN** an issue cites a symbol the change proposes that does not exist yet
- **THEN** the precheck lists it as missing and the intake continues without an error

#### Scenario: The composed document is the issue text plus the settled lines

- **WHEN** a mature issue answers `work`, every section is agreed, and the drift check ends `declared-clean`
- **THEN** `compose` writes the issue's literal text with the settled `## Change` lines and the declared-clean note, and the hygiene verdicts are judged only for the lines the check flags

#### Scenario: A rejected composition falls back

- **WHEN** `check` or the document emit rejects the composed document, or a flagged line receives a `violation` verdict
- **THEN** Explore shows the cause, composes the document as before, and does not stop the run

#### Scenario: The precheck failure does not block the round

- **WHEN** the precheck cannot run
- **THEN** one line reports it and the question round goes on
