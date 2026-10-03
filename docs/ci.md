# CI delivery and main protection

## Workflow delivered

`.github/workflows/ci.yml` runs on every pull request targeting `main` and every
push to `main`, including documentation-only changes. Node 22 runs `npm ci` and
`npm test` on Linux and Windows. Both Bash and PowerShell 7 must be available;
the workflow fails before tests if either interpreter is missing. Installation
tests retain their temporary destinations. The manual opencode model smoke
script is not part of `npm test`.

Linux separately checks `npm pack --dry-run --json` against all runtime source
files, both harnesses' installation inputs, and executable entry points. It does
not publish a package. `CI Required` runs even after prerequisite failure and
passes only when the entire test matrix and package verification succeed.
Failures, cancellation, skips, and waiting for fork approval are not success.

The workflow uses standard GitHub-managed runners, a read-only token, checkout
without retained credentials, no secrets, no caching, and no result uploads.
No-cost use depends on this repository remaining public and GitHub continuing
to offer free standard runner use for public repositories. Do not enable paid
alternatives automatically.

## Protection activation: pending

Workflow delivery is not merge enforcement. Read-only GitHub inspection found
`mmadariaga/shared-ai` public with default branch `main` and administrative
access for the current account. Traditional main branch protection is absent.
The effective rules currently prohibit deletion and non-fast-forward updates,
but do not require `CI Required`. No GitHub settings were changed: specific
authorization to change protection was not provided, and this new workflow has
no actual GitHub executions yet.

The pre-change local `npm test` run (Node 26, Linux) had 1,972 passes, one failure,
and four skips out of 1,977 tests. The existing failing test is
`the native selector follows the authoritative shared close after inventory recording`
in `test/explore-pipeline-selector.test.js`; it expects wording absent from the
published specification. PowerShell is unavailable locally, so its three tests
were skipped (the other skip is environment-dependent). This change does not
disable or fix that unrelated test. The post-change local suite on Node 22.23.3
also reports that same failure: 1,977 passes, one failure, and four skips out of
1,982 tests. All five new CI tests pass, and package verification confirms all
309 required runtime files. Linux with both interpreters and Windows results
remain to be verified on GitHub before activation.

Activation is a separate administrator operation after explicit authorization:

1. Integrate the workflow and inspect real Linux, Windows, package, and
   `CI Required` executions on the current revision. Resolve or explicitly
   approve the scope of fixes for pre-existing failures; do not disable tests.
2. Preserve existing rules. Add an active rule targeting `main` that requires
   `CI Required` from GitHub Actions and requires the branch to be up to date.
   Do not accept any source for the check or introduce bypass grants.
3. Read back main's effective rules and confirm this requirement is enforced.
   Check that a new pull-request revision waits for its own successful checks;
   success on an older revision must not permit merging the new revision.

Until those executions, authorization, mutation, and effective-rule verification
are complete, protection activation remains **pending**, not delivered. Missing
administrative permission is also a blocker; never infer activation from the
presence of the workflow alone.
