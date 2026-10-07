# Merge mechanical evidence

Fetch @sai/policies/tool-resolution.md and resolve `merge.js` once for this
invocation. Use that same installed copy for every call. Its sibling
`commands/merge/` files are the authoritative section libraries:
`coordinator-stages.md` and `presentation.md` for the coordinator,
`instructions.md` for the worker. The tool returns only the named stage.
Both Claude Code and opencode install these files through the existing
`sai-tools` and `sai-commands` projections. No command-local executable or
permission change is needed.

## Evidence, not authority

Mechanical results establish repository facts. The coordinator collects them
through the merge tool. The worker still reconstructs
intent and interprets genuine failures; the coordinator still owns approval,
independent review, lifecycle validation, unrelated-change protection, HEAD
checks, and every Git mutation. Keep the existing three-round review and
verification budgets and normal versus fast-track hand-offs.

Each fact receipt carries `version`, `action`, `outcome`, `dependencies`,
`state`, and `data`. `success` is a collected fact, `failure` is a failed check,
and `not-applicable` is an explicit skipped operation, never a passing test.
Collection/usage errors exit 2; assertions fail with exit 1. Stop on missing,
malformed, or incomplete evidence rather than infer a successful result.

The state records the exact repository, HEAD, index entries, refs, operation
identity, file hashes and modes required by that result. Retain receipts
verbatim, with complete external references and hashes when their content is
large. To reuse one, run `node <merge-tool> valid --json --cwd <project-root>`
with the complete receipt on stdin. Reuse it only on `success`; a receipt
whose validity cannot be verified must be recollected. A write, checkout,
staging, launch, new conflict, rename, or finalization invalidates only receipts
whose dependencies changed. Immutable captured provenance remains historical
evidence after launch: do not replace its SHAs with current HEAD or moved refs.

External records live outside the target repository in the harness-approved
temporary area, use unique paths, and remain available through replacement and
closure. They are invocation records, not change artifacts or `changed_files`.
Never overwrite a conflict snapshot to make a failed comparison pass. Verify
its retained `record_hash` before using it; missing or changed records stop
before a write, staging, or finalization.

Use `--record <unique-external-file>` when collecting a `conflicts`,
`verify`, or `collision` receipt, so a worker dispatch or replacement can
read it. The tool creates the complete record exclusively and returns its
reference and hash. For verification the record retains full stdout/stderr;
the returned view carries their hashes and `output_ref`, not another copy of
successful test output. The worker reads full failure evidence at that exact
reference. Hand a receipt to the worker as its exact reference and hash, not
as a shortened reconstruction.

## Stage delivery

Instructions arrive per stage, for both roles. A stage's text is in force from
its entry to its exit; earlier stage text grants no authority to run a later
stage.

### Coordinator stages

Enter a stage the first time with its composite call. One call returns the
stage's instructions, its fixed presentation texts, and a `## Stage facts`
JSON block holding the stage's receipt:

```text
node <merge-tool> enter --stage <stage> --json --cwd <project-root> [--record <unique-external-file>]
```

| Stage | Entered when | Stage facts | Later entries |
| --- | --- | --- | --- |
| `preflight` | the run starts | `preflight` receipt | none |
| `conflicts` | a launch or `git rebase --continue` stops on conflicts | `conflicts` snapshot view (`--record`) | `conflicts --record <new file>` |
| `verify` | a conflict stop's resolution is staged | `verify` receipt (`--record`) | `verify --record <new file>` |
| `collision` | the integration is final: a clean launch, a verified merge, a finished rebase | `collision` receipt (provenance receipt on stdin, `--record`) | `collision --record <new file>` |
| `final` | final staging is done, or a stopped rebase is verified | `status` receipt | `status` |

The `preflight` entry also carries the presentation seam's rules once. A
clean launch enters `collision`, never `verify`. A stopped rebase enters
`final` after `verify` and enters `collision` only after finishing. Every
`verify` call, the stage entry included, carries the test command fixed in
preflight: `--command '<test_command>'` for an explicit command, else
`--suite <record> --suite-hash <record_hash>` for the suite record. The exit
code is that of the stage's mechanical action: a failed test run exits 1 and
still returns the complete stage text.

`instructions --stage messages` returns the informative-message rules alone,
for a `rebase-squash` launch; the `final` stage already includes them.

### Worker stages

At the first judgment point the coordinator dispatches the worker. After
ready, and on every continuation, it includes:

```text
Active stage: <stage> — run node <merge-tool> instructions --stage <stage>
```

The pointer carries the exact resolved executable path. The worker executes
that disclosure command and follows only its output. Its section library is
not fetched in full. Previously disclosed context remains in the persistent
worker, but grants no authority to execute a later stage. This is section-level
progressive disclosure, not a new worker per stage or a step machine.

The first task of a worker, and the first task of a replacement, appends
`--reconstruct` to the disclosure command. That form adds the common evidence
rules, the side mapping, and the provenance definition, and the coordinator
sends the complete reconstruction state with it: the worker saw none of the
earlier stages. Ordinary same-worker continuations retain those rules and do
not disclose them again.

| Judgment point | Stage | Required current evidence |
| --- | --- | --- |
| a conflict stop, language answer, context, revision, new strategy | `strategy` | complete affected inventory, stage blob OIDs, snapshot reference/hash, original provenance, language, prior proposal and new evidence |
| confirmed normal strategy or presented fast-track strategy; review correction; captured test correction | `apply` | complete exact confirmed strategy, semantic decisions, snapshot reference/hash, named correction if any; confirmation/presentation state |
| a failed test round below three | `test-correction` | staged paths, review outcome, verification round and the failure record's reference/hash |
| a `needs-judgment` collision receipt | `renumbering-plan` | original provenance; collision receipt reference/hash; verification outcome |

New conflicts enter `strategy`; a revision enters `strategy`, not `apply`. A
strategy return, resolution return, correction proposal and renumbering plan
each end the active task; only the coordinator selects and discloses the next
stage. A run that reaches no judgment point dispatches no worker.

## Mechanical calls

All JSON commands take `--json --cwd <project-root>`. Each coordinator stage
names its exact calls in its own text; the worker calls only `instructions`
and `valid`.

Completion: every stage was entered through its one call, every worker task
carried its active pointer, complete necessary state, and valid supporting
receipts; no mechanical result substitutes for a gate, semantic decision,
independent review, or coordinator mutation.
