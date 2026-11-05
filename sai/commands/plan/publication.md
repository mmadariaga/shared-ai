# Optional completed-plan publication

The plan is already complete. This action publishes its review copy on the current
change branch, which later implementation reuses. It starts no implementation and
never marks a request ready. Acceptance of the offer authorizes preparation only.

Load the `to-pr` skill and follow its destination, content, approval and recovery
workflow with the completed change name and an explicit `draft:true` request.
Use the same installed `to-pr.js` and provider registry that the skill resolves.
The following inclusion step runs after destination selection and before drafting
the final request. It is the only exception to ordinary planning's ignored-file rule.

1. Run `plan-query` with `{change: name}`. Show every `proposal.files` path, which
   are excluded by Git (`ignored`), their pending content and deletions, and the
   source branch. Read the listed documents and show their diff against HEAD;
   new or ignored documents need their content shown, not an empty Git diff.
   Include `.openspec.yaml`, all specifications, and an overview when present.
   Show the entire branch diff and commits against the resolved target as well:
   warn that all other committed changes on this branch also enter the request.
   This is not necessarily a documents-only request. A detached HEAD, unavailable
   destination/access, missing plan or uninspectable target blocks only publication.
2. Ask through Claude Code's `AskUserQuestion` or opencode's `question` for approval
   of this exact file list and content in one local plan commit, explicitly naming
   each excluded path that will be force-included. Options: `Commit listed plan
   documents`, `Cancel`. Without approval, run no `plan-commit`, push or publish.
   Do not stage unrelated files, change ignore rules, or use a separate branch.
3. After approval, run `plan-commit` with `{change: name, harness: "claude"|"opencode",
   approved: true, confirmation: <plan-query token>}`. It uses a private Git index
   and preserves unrelated staging and working files. Only the authorized excluded
   paths may bypass ignore rules. A changed plan, HEAD or owned index entry requires
   renewed file review and approval. A `no_changes` result needs no new commit.
   If the operation fails, inspect HEAD and the exact-path diff before retrying;
   report an already-created commit separately and never repeat it blindly.
4. Continue `/to-pr` with fresh collection against the same destination and branch.
   Keep `draft:true` in query and publication. Show the complete branch changes,
   included files, content, destination and branches in the final exact confirmation.
   A unique ready request requires explicit authorization of conversion to draft
   within that same confirmation; an existing draft is reused. Multiple matches
   require clarification, never duplicate creation. Changes to any approved details
   renew confirmation. The initial offer and local commit approval authorize neither
   push nor request mutation. Never force push or accept a normal request as success.

Cancellation after the local commit keeps it and stops pending operations. Report
local inclusion, branch push, request content and verified draft state separately.
On unavailable publication or uncertain effects, keep the completed plan and any
confirmed commit/push, explain the blocker and how to continue with `/to-pr` on this
same branch requesting a draft. Use read-only recovery before repeating remote work.
