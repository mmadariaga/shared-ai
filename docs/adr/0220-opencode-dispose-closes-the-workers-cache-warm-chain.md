# ADR 0220: opencode dispose closes the worker's cache-warm chain

<!-- adr-index: amends 0213 -->

## Status

Accepted. Amends ADR 0213: its opencode stop call removes the worker's running shells, and it now also closes the cache-warm chain of each removed `wait.js warm` shell. ADR 0215 (the `dispose` message after a `none` listing) and ADR 0218 (the arm check and the live wait) stay in force and are not edited, because existing records are never edited in place. The stop call is stated in `sai/policies/worker-lifecycle.md` § Stop call and the wake rule in `sai/policies/cache-warming.md` § Wake.

## Context

ADR 0213 ends a disposed opencode worker's armed wait by removing the running shells of its session. The removed shell reaches its owning session as an error with `Shell.NotFoundError`, but the worker's cache-warm chain stays open: the chain record carries no closed marker, and `dispose-shells.js` only knows the worker's session, not its chain. The woken worker can therefore re-arm, and `wait.js` accepts the new wait.

A `/sai-retrospective` of an opencode Direct Build run showed this (issue https://github.com/mmadariaga/shared-ai/issues/432): a disposed backfill worker was woken by `Shell.NotFoundError` and re-armed for about 45 minutes. Of three disposed workers, two replied `ok` to the error wake and one re-armed, so the outcome rested on a model judgment about an unusual wake, not on a rule the tool enforces.

## Decision

1. **A closed chain ends warming for good.** `wait.js` gains `close --chain <id>`, which writes `closed_ms` into the chain record under the existing lock. It is idempotent and prints `closed`, `already-closed`, `absent`, or `refused` as JSON. `arm` then returns `launch: false`, `warm --chain` and `warm --state` return `finished`, and `renewLease` returns nothing, so a wait already in flight finishes at its next renewal, whatever its lease and window. The window, lease, timing, and benchmark cutoff rules stay unchanged for chains that are not closed.
2. **The main session's chain is never closed.** `close` refuses a chain whose `identity.role` is `agent`, the role a main session's `begin` records, because that chain id derives from the chat session and a closed chain would end warming for every later command of the chat. A subagent chain carries `subagent`. On Claude Code nothing changes: `TaskStop` ends the agent and its wait together, and no chain is closed.
3. **`dispose-shells.js` closes the chain deterministically.** It reads each running shell's launch line from the `command` field of the `GET /api/shell` listing, which holds the line as typed beside `metadata.sessionID` (verified on a live opencode server). A quote-aware tokenizer (single and double quotes, either path separator, backslashes literal) splits it, and an argument whose base name is `wait.js`, followed by `warm`, marks a cache-warm shell. The chain id comes from `--chain <id>`, or is decoded from `--state <token>` by the `decodeStateToken` function that `wait.js` now exports, extracted from its own `--state` parse. After the removal, whatever its outcome (`removed`, `failed`, or `unavailable`), the tool closes each distinct chain once through the `wait.js` module of the installed root that `resolveGlobalRoot('opencode')` returns. An `already-closed` answer counts as closed.
4. **The result reports the close beside the removal.** The single-session object and each `results` entry gain `closed` and `close_failed` arrays. A close that fails (no record, an older `wait.js` without `close`, a lock or write error) is reported there and never changes `status` or the exit code. A `none` listing finds no shell and closes no chain; the ADR 0215 `dispose` message stays the only stop in that case. A shell that is not a `wait.js warm` command, an entry without a command, and a token that does not decode are removed as before and close no chain.
5. **The policy rule is only a fallback.** `cache-warming.md` § Wake tells an agent that a wake which is not the JSON `wait.js` prints (a shell error, a non-zero exit, or unparseable output) is a dispose: it replies `ok` and arms nothing again. The tool closes the chain regardless of whether the agent follows this rule.

## Alternatives Considered

- **Record the opencode session id in the chain record so `dispose-shells.js` finds the chain by session** — rejected: it changes the chain record and the subagent `begin`, while the removed shell's own launch line already names the chain.
- **Rely on the agent to treat an error wake as a dispose** — rejected as the mechanism, kept as the fallback: the observed failure was a model judgment, and two of three workers answered correctly while one did not.

## Consequences

- A disposed opencode worker cannot arm another wait, even when it misjudges the error wake; the fallback rule covers the case where the chain could not be closed.
- `dispose-shells.js` now depends on the installed `wait.js` and on the `command` field of the shell listing. Without them the chain stays open and is listed in `close_failed`, and the removal and its `status` are unaffected.
- A shell launched in a form the tokenizer cannot read (for example `wait.js` inside a nested quoted shell command) closes no chain and falls back to the policy rule.
- The stop call's `status` values, exit codes, and the ADR 0215 fallback are unchanged. Claude Code and opencode keep their own stop call; only opencode closes a chain.

## Provenance

Change `disposed-opencode-worker-never-arms`, decision "The tool closes the chain deterministically, and the policy rule is only a fallback".
