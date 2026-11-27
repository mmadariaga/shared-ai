# ADR 0235: Optional publication flags and one build hint

<!-- adr-index: amends 0222 -->

## Status

Accepted.

Amends [ADR 0222](./0222-sai-plan-asks-the-publication-answer-at-run-start.md).

## Context

The start-of-run publication answer already exists, but the build had no `draft` value, `--publish` had no bare form, and the closing hints did not carry the next command. The plan hint could disagree with the set answer, and the archive hint could push to the default branch or after `--publish no`.

## Decision

1. **`/sai-build` accepts an optional value.** It takes `--publish [yes|no|draft]`, where a bare `--publish` is `yes`, stores `draft` in `implement-run@1`, and publishes with `publish_pr_as_draft` `false` for `yes` and `true` for `draft`.
2. **`/sai-plan` accepts the same value and the build hint.** It takes `--publish [yes|no|draft]` (a bare `--publish` is `yes`, and `draft` normalizes to `yes`) and `--build-publish <yes|no|draft>`; its closing line carries the only build hint, and the explore close refers to it.
3. **`/sai-archive` keeps `--push yes|no`.** The build close prints `--push yes` only on a confirmed `yes` or `draft` push and otherwise `--push no`, and the no-changes close prints no hint.
4. **The run core accepts a per-machine list.** `publicationAnswers` names the values each machine admits: `implement-run` uses `yes|no|draft`, and `plan-run` uses `yes|no`.

## Alternatives Considered

- **Requiring a `--publish` value** — rejected because the bare, copy-paste form matches the user intent while the existing values keep working.
- **Letting the explore close print the hint** — rejected because two hints can disagree.
- **Adding `--publish` to archive** — rejected because archive never creates or updates a PR/MR and already has `--push`.
- **Extending the shared run-core list for every machine** — rejected because it widens the plan's surface.
- **Reading the provider default branch again for the archive hint** — rejected because a confirmed build push already excludes it.

## Consequences

- The optional flag is a public surface.
- The standalone plan hint is a recommendation.
- `draft` does not demote a ready request.
- The archive hint can be `--push no`.

## Provenance

Change `build-plan-publish-flag`, decision "Optional publication flags and one build hint".
