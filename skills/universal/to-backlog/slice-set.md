# Crystallized slice publication

Reach this branch only for an explicitly crystallized slice set, including a
one-slice set: with no origin it creates the parent, with an originating issue
it adopts that issue as the parent. An ordinary request without slices follows
the existing one-item branch (an origin without slices keeps update mode).
Load the selected provider's mechanics for its relationship
representation, content format and invocation-scoped type requirements.
Updating a previously published set retains its correspondence and children;
this branch grants no additional child creation on update.

## Originating issue

With an unambiguous originating issue (`SKILL.md` section 1) the origin is the
parent of the set: never create a replacement parent, never close the origin or
mark it superseded, and offer no new-parent option. Read it as `update.md`
does (`resolve-origin`, then `read-update`) and pass the canonical URL as
`origin` and the returned baseline as `origin_baseline` in `query-set` and
`publish-set`; the destination derives from the origin, and `repository`,
when supplied, must be the origin's own. The whole-objective `description`
becomes the origin's new description (its title is kept) and appears in the
proposal beside the origin's current description, its existing children, and
the children to create; the single publication confirmation covers all of it.
The origin is rewritten last, after every child exists and is linked, so an
interrupted publication leaves its original text and `continue-set` resumes with
the same origin as parent. Existing children without a SAI marker stay linked
and are listed. An origin that is itself a published child keeps its parent link
and its earlier correspondence (the marker's `child_of`, plus `Parent:` and
`Depends on:` lines), and its new slices become its children. `query-set` answers `blocked` before any write, with a `reason`,
when the origin already carries a `sai-backlog-slices@1` parent marker
(`origin-already-published`), is closed (`origin-closed`), cannot be read or
is not editable by the authenticated user (`origin-unavailable`; checked by a
read-only permission query on every provider), or belongs to another provider or destination
than the configured one (`origin-destination-mismatch`); report the state and
stop. `needs_input` with `stale-baseline` means the origin changed since it was
read: read it again, prepare, and ask for approval again. A user who wants a new
parent publishes without an origin.

Use the existing whole-objective parent title/description and every agreed
slice block verbatim. There is no second decomposition or breakdown approval.
Resolve content ambiguity with the user; do not synthesize replacement slices.
Call `query-set` with the selected provider's ordinary destination/content fields and
`blocks` (the complete Ready to Propose text). The single dependency validator
checks the whole set and returns stable blocker-first order. Resolve invalid
dependencies before delivery or publication without changing agreements alone.

Show the complete parent and every complete child in returned order, the exact
destination/visibility/Project when applicable, and relation operations. State the returned
representation: native hierarchy when supported; otherwise written references.
Disclose the returned dependency representation too: native blocker relations
when supported, otherwise written immediate references. Only agreed immediate
edges are created; execution order and branch ancestry add none.
The approved relation recipe appends issue URLs and structured correspondence
to agreed source content after creation; assignees, labels and state stay intact.
Obtain the existing explicit publication confirmation for this entire proposal,
or act on a supplied answer that binds it (`SKILL.md`, "Prepare for a caller and
act on a supplied answer"). The optional backlog Yes, fast-track, and unattended
consent do not replace it.

Call `publish-set` with the same request, unchanged `confirmation` and a new
private receipt path under the existing temporary-directory protocol. Each
creation, Project membership, written reference, and native hierarchy link is a
separate verified operation when applicable. Retain returned `correspondence` with
`version`, `platform`, `parent`, and `slices` (change_name, issue, depends_on).
The same mapping is stored in each issue's `sai-backlog-slices@1` marker, so
import and `lookup-slice` can recover it independently of this conversation.
When the caller stores the blocks for later planning dispatch, return the
complete verified correspondence to `backlog-origin-transport.md`: that owner
amends the stored blocks with actual child origins and new hashes before cold
planning dispatch. Conversation-only retention is not sufficient for that path.

On a partial or uncertain result, follow `publication-recovery.md` beside this
file: warn, verify directly, and automatically retry verified pending work once
within the original approval. Show `created`, `pending`, and the receipt.
`recover-set` reads remote results and updates only the local receipt. A lost
creation response returns candidates, never another creation. Ask the user to
identify the existing result and send `identified: {"<index>": "<issue URL>"}`.
If unresolved, consult the user. `continue-set` uses the returned `continuation`
as its `confirmation`, with `automatic_retry: true` only for the one covered
retry. After that allowance is consumed, show pending operations and obtain an
explicit response before further continuation. It re-verifies results before
executing pending operations.
Changed content or visibility requires renewed review, not automatic replay.

If native relationship operations fail, `recover-set` with `fallback: "written"`
proposes written hierarchy/dependencies and lists native links already verified. Show
that limitation and ask the user to approve the changed representation. Only
then call `continue-set` with that fallback and its new confirmation token.
This leaves existing native links intact and never claims remaining links are
native. An uncertain creation must still be identified before continuation.
Report only verified success. End without assignment or implementation.
