# ADR 0187: Composition rules live in their own orchestration file

<!-- adr-index: supersedes 0147a, refs 0083, refs 0152b -->

## Status

Accepted

Supersedes [ADR 0147a](./0147a-three-rule-composition-delta-in-command-runner.md).

## Context

ADR 0147a placed the three composition rules inside `sai/orchestration/command-runner.md` and rejected a separate orchestration file, because a second file "would split the shared lifecycle contract".

Every routed and utility command loads the runner through its boot adapter, but only the two composition coordinators — `/sai-build` (`meta-build`) and `/sai-review` (`meta-review`) — ever execute more than one phase adapter. The composition section (about 580 words) therefore sat in the context of every other command, where it never applies and competes for attention with the Result Loop rules that do.

## Decision

Move the three composition rules, the malformed-transition rule, and the chained-apply envelope shape verbatim into `sai/orchestration/composition.md`. The two composition coordinators fetch it next to `bounded-recovery.md`. The runner keeps a short `## Chained phase composition` section that names the file without fetching it, so segment references inside the Result Loop still resolve. The installer projects the new file to both harnesses as a managed `sai`-class file.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Keep the rules in the runner (ADR 0147a) | One file holds every lifecycle rule | Every non-composition command pays the context and attention cost of rules it never uses |
| Move the rules into the two coordinator cards | No new orchestration file | The same contract duplicated across `meta-build` and `meta-review`, and any future composition command copies it again |
| Separate orchestration file loaded only by composition coordinators (chosen) | One source for composition; non-composition commands stop loading it | A second orchestration file; composition readers must follow one more fetch |

## Consequences

- The shared lifecycle contract spans two files. The runner's stub section records the split, and `composition.md` states that it layers on the runner.
- A new composition command must fetch `@sai/orchestration/composition.md` in its coordinator card; without it, the composition rules are not in context.
- Composition behavior is unchanged: rules, transition validation, supervisor continuity, and the chained-apply envelope are moved, not edited.

## Provenance

User — command-runner cleanup session, phase 3 (2026-09-23).
