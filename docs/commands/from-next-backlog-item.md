# `/from-next-backlog-item`

## Command function

Selects a highest-priority eligible item from your backlog and imports it for
discussion in the current Claude Code or opencode conversation. Needs no OpenSpec
setup and writes no files or remote data.

## Inputs and flags

Invoke `/from-next-backlog-item` with **no arguments or flags**. Use conversation
context for the desired provider, project/pile, and supported filters. The skill
tries existing context and Git remotes first, then asks only for missing or
ambiguous information using actual destination candidates. Choices are not
persisted as preferences.

## In detail

- GitHub Projects use project-wide manual position order.
- GitLab project issue lists use relative position; tied best-position issues,
  or all members when none has a valid position, form equally eligible
  candidates. The agent chooses one returned candidate without asking you.
- Azure team backlog levels use their configured manual rank; missing ranks or
  a tie at the top stay pending.

See [selection limits and supported filters](../backlog.md#import-the-next-item).
Unverifiable views/order, incomplete reads, and access failures stay pending.
An unsupported highest-priority item is reported rather than silently skipped.
You can cancel, choose another pile, or explicitly import another reference.

A selected reference continues the same [`/from-backlog`](from-backlog.md)
workflow. Empty piles and cancellation trigger no import, and a completed import
does not start exploration or implementation automatically.
