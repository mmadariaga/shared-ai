# ADR 0202: One live explorer per coordinator, and agents keep their own prompt cache warm

<!-- adr-index: amends 0188; refs 0194; refs 0199 -->

## Status

Accepted

Amends [ADR 0188](./0188-subagents-open-with-a-ready-handshake-and-live-per-role.md), decision 3, for the explorer. [ADR 0194](./0194-implement-new-runs-outside-the-shared-orchestration.md) already amends the same decision for workers only; this record does the same for the explorer and leaves the ready handshake of decision 1 as it is.

## Context

Claude Code gives a subagent a five-minute prompt-cache lifetime. A worker, helper, or explorer that its dispatcher continues after a longer pause rewrites its whole prefix instead of reading it. Usage evidence from the local opencode v2 database (2127 child sessions) showed that 87 to 99 percent of worker continuations arrive within five minutes, while 28 to 30 percent of consecutive explorer and executor spawns under one parent are more than five minutes apart. An experiment showed that a subagent can keep its own cache warm on Claude Code and on opencode v2.1.4: it arms a background wait before it returns its result, the result reaches the parent at once while the wait stays armed, each wake reads the whole context from cache (Claude Code: 33144 read, 1019 written; opencode: about 31k read, 191 to 436 new input), and an external dispose stops it.

ADR 0188 decision 3 gives each `/sai-explore` search a new explorer, because a reused explorer collects every earlier search's reads. That fills the smaller context of a budget model and lets one search bias the next, for example by answering from a file it already holds. With a cold cache a new explorer also pays a rewrite on every spawn, and a spawn pays the bootstrap that ADR 0188 measured at about 48,500 tokens.

## Decision

1. **Every SAI agent keeps its own prompt cache warm under one policy.** After each response an agent arms one background wait, and on each wake it re-arms, until the `max` window passes since its last real task or until its dispatcher disposes it (`sai/policies/cache-warming.md`). The timings come from the `warming` setting of `.sai/settings.jsonc` by provider, model, and role, and nothing warms until the user enables it. The dispatcher resolves a subagent's timings, because no agent can read its own runtime model, and sends them in the task message. Dispose is a dispatcher action without a model turn: `TaskStop` by agent ID on Claude Code; removal of the outstanding shell followed by `session.interrupt` on opencode, because `session.interrupt` alone is a no-op on an idle session; and a `dispose` message when neither is reachable.
2. **The explorer lives for the whole coordinator run and is reused.** The first search opens the explorer through the ready handshake of ADR 0188 decision 1, which does not change. Each later sequential search is a continuation on the same handle and keeps its own per-segment tool-call ceiling. Searches that run at once start additional explorers, which are reused the same way. All of them are disposed at run close. This replaces the "one explorer per search" rule of ADR 0188 decision 3.
3. **Other helpers are disposed right after their result.** An executor, a task subagent, and any other helper arms like any subagent, and its dispatcher disposes it as soon as it has the result, unless the card reuses it.
4. **Long-lived workers are disposed at the coordinator's close points**: at run close, at a segment boundary, and when the coordinator replaces the worker. A pending `needs_input` question keeps its worker armed.

## Answer to the context-growth argument of ADR 0188

The argument against reuse was context pressure and contamination between searches on a budget model. Three things weigh against it now. A live explorer does not repeat the searches it already made, which is the cheaper path when two searches touch the same files. The explorer's context grows across searches, but a warm cache reads that growth at the cache-read rate, and the growth is bounded by the `max` window and by the run. The simplest per-coordinator rule needs no judgment about when a topic has changed, and a search that must not inherit earlier reads can still start an additional explorer. The remaining risk is bias from earlier reads; the coordinator states the goal and output contract of each search from scratch, as it did for a new explorer.

## Alternatives Considered

- **A per-agent one-hour cache lifetime on Claude Code, plus an opencode warming plugin (issue #161)** — replaced by one self-warming mechanism that both harnesses share.
- **A `warming` frontmatter attribute per agent** — rejected: the right timings depend on provider, model, and role, and the dispose protocol already decides who warms.
- **Dispose by message only** — kept as a fallback, because it costs one model turn per dispose.
- **A `Monitor`-based wake** — rejected: the experiment observed no wake.
- **A hand-back message before arming** — rejected: the agent's final report stayed withheld until the wait ended.
- **One explorer per topic** — rejected: it needs a judgment on every search.
- **Discarding the explorer above a context cap** — rejected in favor of the simplest per-coordinator rule.

## Consequences

- Each wake costs two short requests and some usage allowance; the `max` window bounds the cost. A pause longer than `max` still resumes cold and pays one rewrite.
- The explorer's context grows across searches in a run.
- On opencode, dispose can fall back to the `dispose` message when the server API is not reachable from the session; how a coordinator reaches `shell.remove` and `session.interrupt` from inside a normal opencode session was not verified.
- The cache TTL benchmark treats any warming as interference, so it turns warming off through a permitted override in `.sai/settings.local.jsonc` and restores the file afterwards. While it measures, every SAI session in the project loses warming from its next arm.
- The ready handshake of every explorer dispatch stays unchanged.
