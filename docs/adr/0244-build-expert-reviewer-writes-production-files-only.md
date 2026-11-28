# ADR 0244: The build expert reviewer writes production files only

## Status

Accepted.

## Context

The tests of a change come from the RED workers: the plan RED writes the failing tests of every step once, and a fix RED writes the test of a review or audit finding. A test is the oracle of the code it covers, so a reviewer allowed to edit a test could make a correction pass by moving the oracle instead of fixing the behavior, and the coordinator would see green tests that prove less than before. The build checkpoint also runs late: `review.md` already exists, the fix segment has ended, and no RED or GREEN worker is alive to re-derive a test. A finding about a missing or weak test is therefore a real finding that the checkpoint cannot correct within its means.

## Decision

In the `/sai-build` checkpoint the reviewer's product is the production files the change modifies against its change base, with the test paths `tasks.md` records (`**Tests**` fields and the plan RED's modified tests) excluded. Those same paths are its allowed write paths, and a worker change outside them, a test file included, is reverted from the before-snapshot and reported.

A finding about a missing or weak test is reported without a correction, in the `Reported without correction` line of the closing report, for a later `/sai-3-implement` run. The reviewer writes production files only; the coordinator keeps or reverts each correction, runs the tests related to the kept corrections, commits them in one local commit, and refreshes an existing inherent-risk block in its own commit. `review.md` stays as the review segment wrote it, so the closing report lists the checkpoint's kept corrections itself.

## Alternatives Considered

- **Let the reviewer correct tests too.** Rejected because the oracle would move with the correction: a test edited to agree with the code proves nothing about the behavior the approved scope asks for, and no worker of the run would re-derive it.
- **Route the corrections through a RED/GREEN segment.** Rejected for cost and latency: it reopens the step cycle after the review and the fix segment have closed, for corrections that usually need no new test, and a test gap is better reported for a run that owns RED.

## Consequences

- A test gap the expert finds reaches the next `/sai-3-implement` run as a report line, not as a fix, and the build closing report says so.
- The product excludes tests, so the checkpoint never reviews or rewrites an oracle, and the tests related to a kept correction stay the run's only test evidence.
- Because `review.md` predates the checkpoint, the kept corrections are absent from it; the closing report and any refreshed inherent-risk block are where they become visible.
- A correction the reviewer writes outside its allowed paths costs one reverted correction and one reported finding, never a silent change.

## Provenance

Change `adversarial-expert-review`, decision "The build expert reviewer writes production files only".
