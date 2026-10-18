# Backlog implementation start

Retain the completed assignment check and its exact selected-child identity for
this implementation stretch. Same-stretch worker correction or resumption
re-verifies the retained assignees instead of asking a new start question. A
changed identity or responsibility stops for a fresh user decision. A new slice
or new implementation invocation receives no prior assignment authorization,
except that a set-level answer (below) authorizes every later slice of its set.
The implementation stretch is the span of one implementation invocation or
slice, including worker correction, resumption, and replacement.

Assignment is backlog bookkeeping, so the user decides whether it gates
implementation: the approval in step 3 and the failure stop in step 4 each offer
**Skip**, which starts implementation without assigning the work item. Skip
performs no remote operation and holds for the whole implementation stretch:
worker correction, resumption, and replacement proceed without re-verifying or
re-asking, and the retained skip is not an assignment authorization for a new
slice or a new invocation, which ask again unless a set-level answer covers
them. Skip comes only from a user answer.

**Advance approval.** A caller may collect the assignment answer before
implementation starts, in an earlier question round. It is valid only when it
names a concrete user and binds either an existing selected issue or the
publication proposal whose issue the caller then created, and only when the
user explicitly chose one of: assign that user, keep the current responsibility
(naming its assignees), replace the current responsibility with that user
(naming the previous assignees), or Skip. An advance approval names every issue it
covers, authorizes only those assignments, and is consumed per issue: each
implementation stretch uses only the approval for its own selected issue, and
the same-stretch retention rules above apply to it. Without a valid advance approval, steps 1–4 below ask
as written. With one, this owner runs only the checks, with no new question:

- resolve the selected issue and run `inspect-assignment` (steps 1 and 4's
  correspondence and parent checks);
- require the verified issue to equal the approved issue (the created child's
  identity replaces the proposal), the authenticated user to equal the approved
  user, and the current assignees to equal the approved context (none for
  assign, the approved set for keep and for replace);
- on a match, continue with `propose-assignment` and `assign` (assign) or the
  keep verification (keep) using the `confirmation` those calls return; for
  replace, run `propose-assignment` with `choice: "replace"` and `assign` with
  the `confirmation` it returns; then step 4's verification; an approved Skip starts with no remote operation;
- on any conflict, a lapsed approval (its proposal was never published), or a
  changed identity or responsibility, ask again for that authorization only,
  through steps 2–3, and wait.

**Set-level answer.** A caller that crystallized a set of slices may collect one
assignment answer for the whole set, in the earlier question round, and keep it in
conversation state for that set until a new crystallization replaces it. It is
valid under the Advance approval rules, with these differences: it covers the
selected issue of every slice in the set, and it is not consumed by the first
slice. Every later slice of the same set reuses it, whether the slice starts
automatically after a Direct Build continuation `yes` or through a later route
picker answer, and asks no assignment question for it; the continuation `yes`
itself authorizes no assignment. For each later slice this owner resolves the
slice's selected issue, runs `inspect-assignment`, and applies the answer:

- `skip` starts with no remote operation, for every slice of the set;
- `assign` and an intent (below) proceed with `propose-assignment`, `assign`, and
  step 4's verification when the issue has no assignees or only the approved user
  (for that case, the keep verification); when the issue already has other
  assignees, stop before that slice's implementation and ask keep, replace, or
  skip through step 2, then continue with the chosen action and, afterwards, the
  chain;
- `keep` and `replace` apply to a later issue only when its current assignees
  equal the approved context; otherwise ask the same keep, replace, or skip
  question;
- a changed identity, authenticated user, or failed assignment follows steps 2–4
  (Retry, Skip, and Stop included): Retry and Skip continue the chain from that
  slice, and Stop ends it. The answer to such a question applies to that slice
  only and does not replace the set-level answer.

An **intent** answer is collected when the issue does not exist yet, so it names
no user: it authorizes assigning the authenticated user of the provider to the
issue created from the published proposal. At the first implementation start,
`inspect-assignment` on the created issue resolves that user and binds the
answer to it, with no new question; from then on it is a concrete set-level
answer. An intent whose publication was cancelled or failed lapses, and that
slice asks steps 1–4 as written.

This owner contract runs in the user-facing coordinator, immediately before
the first implementation worker of Direct Build. Planning and optional initial-branch preparation do not run assignment.
Claude Code uses `AskUserQuestion`; opencode uses `question`. Load
`safe-operations` before a remote mutation. Fast-track and unattended route
consent do not approve assignment and never choose Skip; the questions are asked
under `--fast-track` and Direct Build alike, for every provider.

Resolve the selected issue from a publication's structured correspondence for
the explicitly selected change name, explicit originating-issue provenance, the
selected change's `**Backlog origin**` line, or `.openspec.yaml`'s
`backlog_origin`. A supplied parent does not select a child: ask which child
to implement and wait. With no provenance, run no remote operation. Use the
selected provider's publication correspondence to match an explicitly selected change name,
never an issue title. If correspondence was lost, `lookup-slice` recovers it
read-only using the known repository and change name; ask the user to resolve
zero or multiple candidates. Preserve the originating selected issue separately
from parent context. Resolve the provider through `resolve-origin`, retaining that
identity for every assignment operation; GitLab may use an authenticated custom host.

Locate `to-backlog.js` per `tool-resolution.md` and use the installed
`to-backlog/providers/registry.json`. Each operation receives JSON on stdin
with the resolved `provider` and `reference` (the selected child URL). For lost
correspondence, pass the known destination and explicit change name to
`lookup-slice`; Azure also requires the invocation's known work-item type.

1. Run `inspect-assignment`. Require either independently verified native child
   and parent identities, or verified published written correspondence. Ordinary
   native children need no SAI marker. On GitHub and GitLab, a standalone leaf (no SAI
   marker, no native parent and no native children or sub-issues) is also
   accepted; show it as having no parent. GitLab proves it with a complete read
   of its native work-item hierarchy. Azure keeps the child-and-parent
   requirement. An unverified/ambiguous written reference stops for a user
   decision; a parent (including an unmarked issue with sub-issues) receives no
   assignment. Show the issue URL and every current assignee.
2. If any assignee exists, ask whether to keep that responsibility and start,
   explicitly replace it with the authenticated user, or stop. Wait. Keep starts
   with no mutation: run `propose-assignment` with `choice: "keep"`, require its
   exact assignee set to equal the set the user approved, and retain its
   `confirmation` and `proposal.target`. A changed set asks again, never silently
   accepts a new responsibility. Replace goes to step 3 with `choice: "replace"`. A declined,
   absent or ambiguous answer starts nothing.
3. For an unassigned child or an explicit replace choice, run
   `propose-assignment` (with `choice` when applicable). Show the exact child,
   authenticated user, previous assignees, and proposed assignees. Ask **Approve /
   Stop / Skip** for that exact assignment; wait. Stop and a declined, absent or
   ambiguous answer start nothing. Skip starts implementation with no remote
   operation (see the opening paragraph). On approval call `assign` with the
   `confirmation` and `choice` that `propose-assignment` returned, unchanged.
   This operation changes assignees only.
4. Require `verify-assignment` to report `verified: true` before implementation.
   In every case, send `expected_parent`: the `parent` URL of the approved
   proposal, or `null` for a GitHub standalone leaf. A changed parent or
   leaf-or-parent outcome is not verified. For keep, also send `choice: "keep"`,
   the retained `expected_assignees` (the exact approved set, including multiple
   assignees), and `confirmation`. The verifier
   checks that set and approval, not whether it contains the authenticated user.
   Keep never calls `assign`; assignment/replacement still verifies the approved
   authenticated user. Same-stretch resumption retains the same target and keep
   token rather than generating fresh approval for a changed set.
   After an `uncertain` mutation, verify rather than replay. `assign` returns
   `rejected` when the provider's rejection proves no change was applied; there
   is nothing to verify and a retry cannot succeed. After any failed or
   unverified assignment (assign or replace, an `uncertain` or `rejected`
   outcome, or a failed verification), report the verified state and ask
   **Retry / Skip / Stop**, then wait; Retry re-verifies after `uncertain` and
   re-runs the step-3 proposal after `rejected`. After `rejected`, Skip is the
   recommended option. Starting all siblings requires separate selection and
   authorization for each child.

   After Skip, the coordinator's closing report states that the work item stayed
   unassigned by user choice and lists the assignees last verified.

Reuse the existing initial branch and its local-work protection. A branch
question is conditional on the owning branch workflow, not repeated because
an issue was imported. This contract performs no branch switch, issue closure,
label mutation, state transition, or assignment of the parent.
