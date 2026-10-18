# Bounded publication recovery

Use this sequence for failed new-issue publications, individual or slice sets.
It applies identically in Claude Code and opencode. Existing-issue content edits
retain `update.md` recovery; they receive no automatic mutation retry.

1. Warn before recovery: identify completed work, pending work, and the private
   receipt path. Preserve all known issue links.
2. Verify directly with `recover` or `recover-set`, using the saved receipt.
   Read-only queries need no additional consent, including after partial results.
   Verification may update the local receipt but must not modify remote state.
   A similar issue, or an empty candidate list after a lost creation response,
   does not establish the creation outcome. Ask for identification when uncertain;
   never recreate an attempted issue whose result remains unknown.
3. If everything is verified complete, report success without further action.
   Otherwise, when all pending actions are verifiable and within the original
   approval, continue once automatically with the returned `continuation` as
   `confirmation` and `automatic_retry: true`. For sets use `continue-set`; for
   individual GitHub Project insertion use `recover` with those fields. The
   adapter consumes the publication's durable retry allowance before writing.
   Other individual providers' recovery is read-only: report verified completion
   or consult about uncertain creation; there is no pending insertion to replay.
4. After a failed retry, verify again directly and consult the user with the
   completed and pending state. Re-entry and recovery retain the consumed limit.
   Further continuation needs an explicit user response and its fresh verified
   token, without `automatic_retry`. Never restart `publish` with a new receipt
   to bypass this limit. Changed content, destination, visibility, or relationship
   representation requires renewed full review and approval, not this retry.

Complete when publication is verified or the user has the verified remaining
state and a concrete decision. Verification itself consumes no retry allowance.
