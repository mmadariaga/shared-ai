# inherent-risk-ratings Specification

## Purpose
TBD - created by archiving change pr-inherent-risk-ratings. Update Purpose after archive.

## Requirements

### Requirement: Four independent inherent-risk ratings

The shared policy `sai/policies/inherent-risk.md` SHALL be the single source of the inherent-risk computation for Claude Code and opencode. It SHALL define four independent ratings — security, reversibility, critical sections, and blast radius — each taking exactly one level of `low`, `medium`, or `high`, and SHALL NOT define an aggregated global score. Security SHALL measure the exposed surface (public interfaces to sensitive or personal data, and code that receives direct user input), not whether that surface is hardened. Critical sections SHALL be a judgment with no per-project list. The ratings SHALL be a signal for the human reviewer only: they SHALL NOT change automated review depth and SHALL NOT start an audit.

#### Scenario: A change is rated
- **WHEN** the policy is applied to a change
- **THEN** the result carries one `low`, `medium`, or `high` level for each of security, reversibility, critical sections, and blast radius, and no global score

#### Scenario: Ratings do not drive automation
- **WHEN** a change receives a `high` security rating
- **THEN** no review depth changes and no security audit starts because of that rating

### Requirement: Published levels respect deterministic floors

Each published level SHALL be the higher of the judged level and the floor that `sai/tools/risk-signals.js` sets for that rating; judgment SHALL be able to raise a floor and never lower it. Critical sections SHALL have no floor. Fixing findings, hardening, validating, or testing the code SHALL NOT lower a level; a level below the one a previous block published SHALL appear only when the final diff no longer contains the surface that motivated it.

#### Scenario: Judgment is below the floor
- **WHEN** the judgment for reversibility is `low` and the tool sets the reversibility floor to `high`
- **THEN** the published reversibility level is `high`

#### Scenario: Hardened code keeps its level
- **WHEN** a recomputation follows a fix that only adds validation to code that receives user input
- **THEN** the security level is not lower than the one previously published

#### Scenario: Removed surface lowers the level
- **WHEN** the code that motivated a `high` level is removed from the final diff
- **THEN** the recomputed level may be lower than the previous one

### Requirement: Justification with path and line evidence

Each rating SHALL carry a one-line justification citing at least one `path:line` of the diff that names the signal or the code deciding the level.

#### Scenario: A rating is justified
- **WHEN** the ratings are computed for a change
- **THEN** each of the four ratings has a one-line justification citing at least one `path:line`

### Requirement: Deterministic signal computation

`sai/tools/risk-signals.js compute --parent <branch> [--cwd <project-root>]` SHALL print one JSON object. On success it SHALL carry `status: ok`, the `merge_base` of the parent branch with HEAD, a `fingerprint` that is the hash of the diff from the merge-base to HEAD excluding `openspec/`, the `floors` for security, reversibility, and blast radius with `critical_sections` set to `null`, the `signals` behind them (each with `path` and, where it has one, `line`), `stats`, and `codegraph`. Floors SHALL derive only from generic path, extension, and diff-size signals: sensitive paths (`high`), exposed route or controller paths and added user-input lines (`medium`) for security; migrations and schemas (`high`), CI, container, and infrastructure files and dependency manifests (`medium`), and file deletions by count for reversibility; changed-file and changed-line counts for blast radius. Test and documentation files SHALL NOT raise the security or reversibility floor, and a rename SHALL NOT count as a deletion. An invalid or unknown parent SHALL produce `status: blocked` with a `message` and exit code 2.

#### Scenario: An empty diff
- **WHEN** HEAD has no changes against the merge-base
- **THEN** every floor is `low`, `critical_sections` is `null`, no signal is reported, and repeated runs give the same fingerprint

#### Scenario: A migration is added
- **WHEN** the diff adds `db/migrations/001_users.sql`
- **THEN** the reversibility floor is `high`

#### Scenario: User input is read
- **WHEN** the diff adds `const name = req.body.name;` at line 2 of `src/util.js`
- **THEN** the security floor is `medium` with a `user-input` signal citing `src/util.js` line 2

#### Scenario: OpenSpec artifacts change
- **WHEN** a commit only adds a file under `openspec/`
- **THEN** the fingerprint and the changed-file count stay the same

#### Scenario: The parent is invalid
- **WHEN** the tool receives `--parent` with a value starting with `-` or naming no commit
- **THEN** it prints `status: blocked` with a `message` and exits with code 2

### Requirement: Blast radius without a CodeGraph index

When the project has a `.codegraph/` index, the blast radius floor SHALL also consider the CodeGraph dependents of the changed files. When it has none, the blast radius SHALL rest on the diff-size signals alone, and the computation SHALL complete with no error and no blocking notice.

#### Scenario: No index exists
- **WHEN** the tool runs in a project without `.codegraph/`
- **THEN** `codegraph` reports `indexed: false`, the blast radius floor comes from diff size only, and the result has `status: ok`

### Requirement: Ratings block format

The ratings block SHALL sit between `<!-- sai-inherent-risk:start -->` and `<!-- sai-inherent-risk:end -->`, open with an `## Inherent Risk` heading, carry the merge-base and the code fingerprint from the tool output, and list the four ratings in a table with their level and justification.

#### Scenario: A block is rendered
- **WHEN** the ratings are published
- **THEN** the block between the markers contains the `## Inherent Risk` heading, the `Merge-base` and `Code fingerprint` line, and one table row each for security, reversibility, critical sections, and blast radius

### Requirement: Stored ratings block in review.md

A fix round SHALL store the ratings block in the change's `review.md` after the report's title lines (the title and its `**Reviewed:**` line) and before the first triage section, replacing any previous block entirely. The block SHALL be computed against the parent branch that the `**Reviewed:**` line names, so the ratings describe the diff that was reviewed. A review that runs again SHALL regenerate `review.md` with no ratings block. The `Surface touched` triage lines SHALL read the same with or without a stored block.

#### Scenario: A fix round stores the block
- **WHEN** a completed `/sai-3-implement` fix round stores the ratings in a `review.md` whose `**Reviewed:**` line names `main`
- **THEN** the block is computed against `main` and sits after the title and `**Reviewed:**` lines, before the first triage section

#### Scenario: A later fix round replaces the block
- **WHEN** a second completed fix round stores the ratings in a `review.md` that already holds a block
- **THEN** all four ratings are recomputed on the resulting tree and the previous block is replaced entirely

#### Scenario: The review runs again
- **WHEN** `/sai-4-review` regenerates `review.md`
- **THEN** the regenerated report carries no ratings block

### Requirement: Stored block validation

`sai/tools/risk-signals.js validate --parent <branch> --file <review.md> [--cwd <project-root>]` SHALL print one JSON object with `status: ok` and a `state` of `fresh`, `stale`, or `absent`, and with the `block` text when the state is `fresh`. The state SHALL be `fresh` when the stored merge-base and code fingerprint equal the ones computed now for `<branch>` and no stored level is below its floor computed now. It SHALL be `stale` when the merge-base or the code fingerprint no longer matches. It SHALL be `absent` when the file or the block is missing, or the block is invalid: a missing or repeated marker, a missing merge-base, fingerprint, or rating row, a level outside `low`/`medium`/`high`, or a level below its floor. A block that is not well formed SHALL be classified before any Git command runs. The `validate` function SHALL be exported for reuse as a module.

#### Scenario: The block matches the code
- **WHEN** `validate` reads a well-formed block whose merge-base and fingerprint equal the current ones and whose levels are at or above the current floors
- **THEN** it prints `state: fresh` with the block text

#### Scenario: The code changed after the block was stored
- **WHEN** a commit outside `openspec/` follows the commit that stored the block
- **THEN** `validate` prints `state: stale`

#### Scenario: The parent was merged in
- **WHEN** the parent branch moves and is merged into the change branch after the block was stored
- **THEN** `validate` prints `state: stale`

#### Scenario: The block is malformed or below the floor
- **WHEN** the block lacks a marker, lacks the fingerprint, carries a level outside the scale, or stores reversibility `low` for a diff that adds a migration
- **THEN** `validate` prints `state: absent`

#### Scenario: The report file is missing
- **WHEN** `--file` names a file that does not exist
- **THEN** `validate` prints `state: absent`
