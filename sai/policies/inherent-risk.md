# Inherent Risk

The single source of the inherent-risk computation: four independent ratings of
how risky a change is by its nature, published as a ratings block for the human
reviewer. Fetch `@sai/policies/tool-resolution.md` to locate `risk-signals.js`.

The ratings measure the change itself, never its remaining defects: fixing
findings, hardening, validating, or testing the code lowers no level. They are a
signal for the human reviewer only. They change no automated review depth, start
no audit, and carry no global score.

## The ratings

Each rating takes one level of `low`, `medium`, or `high`.

| Rating | Measures |
|--------|----------|
| Security | The exposed surface: public interfaces to sensitive or personal data, and code that receives direct user input. Whether that surface is hardened is out of the measure. |
| Reversibility | How hard the change is to undo once merged and deployed: data migrations and schemas, file deletions, CI, container, and infrastructure files, dependency manifests, effects outside the repository. |
| Critical sections | How much of the change sits in sections that matter most: access gates, money, core business flows, and large or heavily used sections. This is judgment alone, with no per-project list and no floor. |
| Blast radius | How much of the system a defect in the change would reach: diff size, the number of dependents of the changed files, shared modules. |

## Floors

`risk-signals.js` computes a floor for security, reversibility, and blast radius
from path, extension, and diff-size signals that hold in any stack:

```
node <tool-path> compute --parent <branch> [--cwd <project-root>]
```

It prints one JSON object: `merge_base`, `fingerprint` (the hash of the diff
between the merge-base and HEAD, excluding `openspec/` and `SAI_LEARNINGS.md`,
rendered the same whatever the user's git configuration), `floors`, the `signals`
behind them (each with `path` and, where it has one, `line`), `stats`, and
`codegraph`. A floor is the least level the rating may take: judgment raises it
and never lowers it. Critical sections have no floor (`null`).

The blast radius adds CodeGraph dependents when `codegraph.indexed` is true. In a
project without an index it rests on the diff-size signals alone, and the
computation completes with no error and no notice.

## Computation

Pass the tool the branch the change is compared against. When no OpenSpec change
exists, this diff against the parent branch is the whole input. The computation
is complete when:

1. Each rating has a level judged from the changed code, read where the signals
   point and wherever the definition above asks for judgment.
2. Each published level is the higher of that judgment and its floor.
3. Each rating carries a one-line justification citing at least one `path:line`
   of the diff, naming the signal or the code that decides the level.
4. A level below the one a previous block published appears only when the final
   diff no longer contains the surface that motivated it, for example because the
   code was removed.

## Ratings block

The block sits between the markers and carries the merge-base and the code
fingerprint from the tool output:

```
<!-- sai-inherent-risk:start -->
## Inherent Risk

Merge-base: `<merge_base>` | Code fingerprint: `<fingerprint>`

| Rating | Level | Justification |
|--------|-------|---------------|
| Security | low/medium/high | <one line with `path:line`> |
| Reversibility | low/medium/high | <one line with `path:line`> |
| Critical sections | low/medium/high | <one line with `path:line`> |
| Blast radius | low/medium/high | <one line with `path:line`> |
<!-- sai-inherent-risk:end -->
```

## Stored block

A fix round, a `/sai-3-implement` run that marks at least one report finding fixed,
stores the block in the change's `review.md`: after the report's title lines (the title
and its `**Reviewed:**` line), before the first triage section, replacing any previous
block entirely. The parent branch of its computation is the one the `**Reviewed:**` line
names, so the ratings describe the diff that was reviewed. A review that runs again
regenerates the report with no block, which matches the tree before the fixes.

`risk-signals.js` checks a stored block against the current code:

```
node <tool-path> validate --parent <branch> --file <review.md> [--cwd <project-root>]
```

It prints `status: ok` with a `state`, and with the `block` text when the state is
`fresh`:

- `fresh`: the stored merge-base and code fingerprint equal the ones computed now for
  `<branch>`, and no stored level is below its floor computed now.
- `stale`: the merge-base or the code fingerprint no longer matches, as after later
  commits, a rebase, a merge of the parent, or a different `<branch>`.
- `absent`: the file or the block is missing, or the block is invalid: a missing or
  repeated marker, a missing merge-base, fingerprint, or rating row, a level outside
  the scale, or a level below its floor.

Only a `fresh` block is published as stored. For `stale` and `absent`, compute the
ratings as described above.
