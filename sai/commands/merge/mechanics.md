# Merge mechanical evidence

Fetch @sai/policies/tool-resolution.md and resolve `merge.js` once for this
invocation. Use that same installed copy for every call. Its sibling
`commands/merge/instructions.md` is the authoritative section library; the
`instructions` action returns only the named stage. Both Claude Code and
opencode install these files through the existing `sai-tools` and
`sai-commands` projections. No command-local executable or permission change
is needed.

## Evidence, not authority

Mechanical results establish repository facts. The worker still reconstructs
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

Use `--record <unique-external-file>` when collecting a worker-owned receipt
(`preflight`, `suite`, `verify`, `collision`) so replacement can recover it.
The tool creates the complete record exclusively and returns its reference and
hash. For verification the record retains full stdout/stderr; the returned
view carries their hashes and `output_ref`, not another copy of successful
test output. Read full failure evidence at that exact reference as needed.
On the result that first reports a new receipt, include one technical
`## Mechanical evidence` block in `summary` with a JSON array of
`{action, record, record_hash}` entries. The coordinator verifies and retains
those exact references, not a shortened reconstruction of the receipt. This
is evidence inside the existing summary, not a new lifecycle field, a journal,
or a time claim. Later reports reuse the retained references and need no
repeated evidence block unless a new receipt replaces one.

## Active task delivery

After ready, and on every continuation, the coordinator includes:

```text
Active stage: <stage> — run node <merge-tool> instructions --stage <stage>
```

The pointer carries the exact resolved executable path. The worker executes
that disclosure command and follows only its output. The section library is
not fetched in full. Previously disclosed context remains in the persistent
worker, but grants no authority to execute a later stage. This is section-level
progressive disclosure, not a new worker per stage or a step machine.
The initial `preflight` disclosure includes the common evidence rules once.
For a replacement starting at another stage, append `--reconstruct` to its
disclosure command to include those common rules. Ordinary same-worker
continuations retain them and do not disclose them again.

| Current task | Stage | Required current evidence |
| --- | --- | --- |
| initial Batch 1, its answers, integration proposal | `preflight` | preflight receipt; exact answers and branch entry |
| coordinator launch/rebase outcome with conflicts | `detect` | outcome; original provenance; new conflict snapshot |
| language answer, context, revision, new strategy | `strategy` | complete affected inventory, stage blob OIDs, snapshot reference/hash, original provenance, language, prior proposal and new evidence |
| confirmed normal strategy or presented fast-track strategy; review correction | `apply` | complete exact confirmed strategy, semantic decisions, snapshot reference/hash, named correction if any; confirmation/presentation state |
| staged resolution; verification correction/re-entry | `verify` | staged paths, review outcome, verification round/result and full failure evidence; authorized fixes if any |
| final integration tree (clean merge or finished rebase) | `collision` | original provenance; verification outcome; surviving-record identity mapping if needed |
| final staging or actual finalization outcome | `final` | exact owned/staged paths, conflict/collision/verification outcomes, escalations and actual Git outcome |

A clean launch enters `collision`; a stopped rebase enters `final` after
verification and enters `collision` only after finishing. New conflicts enter
`detect`, then `strategy`; a revision enters `strategy`, not `apply`. A strategy
return, resolution return, verification return and collision return each end
the active task; only the coordinator selects and discloses its next stage.

## Mechanical calls by owner

All JSON commands take `--json --cwd <project-root>`.

- Worker `preflight`: `preflight` collects dirty paths, operation guards,
  current branch and timestamp-sorted authoritative unmerged local candidates.
  Read `data`; preserve the section library's questions, options and stops.
- Coordinator, after exact branch validation and before launch: `provenance
  --source-ref <full-ref> --method merge|rebase --squash yes|no|not-applicable`.
  Retain its original complete receipt and validate it immediately before the
  launch (before squash). Historical provenance is never recaptured later.
- Coordinator, at each conflict stop and before any worker write: `conflicts
  --record <unique-external-file>`. The tool captures the actual conflicted
  working file, including Git-combined content, marker byte ranges, modes,
  stage blob OIDs, and unrelated-content inventory. The returned compact
  inventory carries the exact record reference/hash. Worker analysis reads
  needed stage blobs through `git cat-file blob <oid>`; missing stages are
  evidence of structural conflicts, not collection success for a missing side.
- Coordinator, before checkout and again before staging: `resolution --record
  <snapshot> --record-hash <retained-sha256> --source <original-worker-result-file> --confirmed
  <semantic-decision-array-file> --phase authored|materialized`. Preserve the
  received worker result byte-for-byte in `--source`, including its original
  envelope, and validate it through the shared runner first. Do not construct
  a reduced substitute or strip its fields. The confirmed array is separate
  coordinator evidence derived from the exact confirmed strategy, never a
  replacement worker result. On both Claude Code and opencode, create
  `--source` and `--confirmed` inputs as unique files in the same
  harness-approved temporary area outside the repository as `--record`.
  Retain their exact references and hashes through same-worker continuations
  and replacement until the owning invocation closes. These are ephemeral
  validation inputs, not repository artifacts, `changed_files`, or staging
  candidates; creating them inside the repository would contaminate the
  unrelated-content check. Authored files must equal the captured file with
  only the declared region replacements; Git-sourced files stay unchanged
  until coordinator checkout, then equal the captured stage blob. The tool
  checks complete inventories, decisions, unrelated content and HEAD/index/
  operation identity. A successful result supplements, never replaces,
  independent semantic review. A missing selected stage requires explicit
  coordinator handling or escalation; never approximate it with a checkout.
- Coordinator, for an authorized verification fix with new boundaries:
  `correction --record <unique-external-file>` takes a complete JSON array on
  stdin: `{path, category, before_hash, regions: [{start, end, conflict_id}]}`.
  `before_hash` is SHA-256 of the current file; ranges are ordered, disjoint byte
  offsets in that preimage. Confirm each boundary independently and restrict
  paths to the current affected set before this call. This read-only capture
  creates the same protected snapshot with explicit correction ranges, not
  inferred markers. Continue `apply` with the authorized correction; it returns
  the same complete resolution payload. Validate and independently review it
  before re-staging and resuming `verify`. A correction that changes a confirmed
  objective instead re-enters `strategy` and its normal mode-specific hand-off.
- Worker `verify`: `suite` detects the command from metadata; `verify` runs
  that command and returns exit code, signal, full stdout/stderr, elapsed test
  time, and `passed|failed|unavailable`. Retain full failures at exact external
  references when large. A state change during the test invalidates a pass.
  Each actual run uses one of the existing three rounds; receipt validation
  is not another run. Corrections still require coordinator-owned review and
  re-staging before re-entry.
- Worker `collision`: `collision` takes the original provenance receipt on
  stdin. Verified absence of source-introduced records skips grouping and
  reference searches. Otherwise it groups the final tracked/index frontier by
  family and prefix. `needs-judgment` is not a collision disposition: the worker
  reconciles survival/renames, dates records, and interprets references through
  the disclosed collision instructions. Ambiguous identity or references
  escalate; no approximate mechanical rule authorizes a repair.

Completion: every transition has its active pointer, complete necessary state,
and valid supporting receipts; no mechanical result substitutes for a gate,
semantic decision, independent review, or coordinator mutation.
