# `/from-backlog`

## Command function

Loads an existing GitHub/GitLab issue or Azure Boards work item into the current
conversation in Claude Code and opencode. Import is read-only and needs no
OpenSpec setup.

## Inputs and flags

Supply one reference: `/from-backlog <reference>`. With none, the skill asks for
it. There are no documented behavior flags. See the shared
[provider/reference table](../backlog.md#supported-providers-and-references)
for accepted URLs, GitLab issue-type limits, Azure ID context, and required CLIs.

## In detail

The skill presents the source link and state, full title and description, and
every available comment with author and provenance. Comments remain unverified
discussion, not automatic amendments to the requested work. An empty description
is reported as missing, not reconstructed from comments.

Incomplete retrieval or content too large for one turn needs an agreed retry or
delivery plan; nothing is silently truncated. Import preserves any active
Explore session and changes no files, remote items, or workflow stage. It ends
with the item loaded for discussion or an explicit pending outcome—not automatic
implementation. If the item starts the conversation, its identity is retained
as the possible update target for [`/to-backlog`](to-backlog.md).
