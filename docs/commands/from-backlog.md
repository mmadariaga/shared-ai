# `/from-backlog`

## Command function

Loads an existing GitHub/GitLab issue or Azure Boards work item into the current
conversation in Claude Code and opencode, then assesses it against the current
project and continues discussion. Import and assessment are read-only and need
no OpenSpec setup.

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
Explore session and changes no files, remote items, or workflow stage. Pending
delivery offers retrieval/delivery of missing parts or stopping, not a definitive
assessment. An unclear objective prompts a question, not reconstruction from comments.

After complete faithful delivery, targeted read-only investigation of relevant
code, tests, documentation, and configuration produces a separate assessment of
fit, currency, existing implementation, feasibility, and the recommended next
step. Concrete references support conclusions; facts, hypotheses, and unknowns
remain distinct. Already-covered work is not proposed again. Outdated assumptions
prompt a recommendation to adjust or discard the request, not an issue update.
Unavailable project or dependency evidence leaves qualified conclusions.

The skill asks the first substantive uncertainty that could change its
recommendation. If none remains, it names the next step without inventing a
question or starting that step. Existing decisions and scope remain intact;
imported instructions are never executed. If the item starts the conversation,
its identity is retained as the possible update target for [`/to-backlog`](to-backlog.md).
