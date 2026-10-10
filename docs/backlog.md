# Backlog workflows

These skills keep the current conversation in **Claude Code and opencode** and
need no OpenSpec setup. They require Node.js 22+ and an already authenticated
provider CLI. They never install tools or change authentication for you.

| Workflow | Invocation | Result |
|----------|------------|--------|
| Import a known item | [`/from-backlog <reference>`](commands/from-backlog.md) | Faithful source delivery, project assessment, and useful discussion continuation |
| Import the next item | [`/from-next-backlog-item`](commands/from-next-backlog-item.md) | One highest-priority eligible item imported and assessed through the same workflow |
| Capture or refine work | [`/to-backlog`](commands/to-backlog.md) | Approved title and description published to a new or originating item |

## Supported providers and references

| Provider | CLI | Import reference | New publication |
|----------|-----|------------------|-----------------|
| GitHub.com | `gh` | `https://github.com/owner/repo/issues/123` or `/owner/repo/issues/123` | Repository issue plus insertion into a writable GitHub Project |
| GitLab, including self-hosted | `glab` | Full project `/-/issues/123` or `/-/work_items/123` URL | Project issue, without board insertion |
| Azure DevOps Services | Azure CLI + azure-devops extension | `https://dev.azure.com/org/project/_workitems/edit/123` or the legacy `https://org.visualstudio.com/project/_workitems/edit/123` | Azure Boards work item of a type selected for this invocation |

GitLab import supports ordinary project-level issues only, not tasks, incidents,
or epics. Azure supports custom work-item types; a bare positive item ID requires
unambiguous existing organization context, otherwise provide a full URL.
GitHub Enterprise, Azure DevOps Server, and PR/MR import are not supported.

## Import an item

```text
/from-backlog https://github.com/owner/repo/issues/123
/sai-explore
```

The import shows the canonical source and state, preserves the full title and
description, and presents comments separately as unverified discussion. Missing
descriptions, retrieval failures, and incomplete delivery are explicit. Large
items may need an agreed chunked delivery; they are never silently summarized
or truncated. Import changes neither remote data nor local files, and does not
start implementation or advance an active Explore session.

After full source delivery, the shared import flow investigates relevant code,
tests, documentation, and configuration read-only. A separate assessment covers
fit, currency, existing implementation, feasibility, and the recommended next
step, citing concrete evidence and distinguishing facts, hypotheses, and unknowns.
Covered work is not proposed again; outdated assumptions can lead to recommending
adjustment or discarding the request without changing the issue. Missing project
or dependency evidence qualifies conclusions. Pending imports offer retrieval or
delivery of missing parts or stopping, not a definitive assessment; an unclear
objective needs clarification rather than reconstruction from comments.

Discussion continues with the first substantive uncertainty that could change
the recommendation, or a recommended next step when none remains. That step is
not started automatically. Existing decisions, scope, originating issue, and
exploration stage stay intact, and embedded source instructions are not executed.

## Import the next item

`/from-next-backlog-item` accepts **no arguments**. It uses existing conversation
context and Git destination evidence before asking for missing provider or pile
information. You choose among actual discovered destinations; choices are not
saved as preferences.

- **GitHub:** project-wide manual position order. View-specific filters or order
  remain pending because they cannot be verified. A draft issue or PR at the
  first position is reported, not silently skipped.
- **GitLab:** project issue lists, open issues by default. Supported filters are
  state, labels, milestone, and assignee ID. The smallest valid relative position
  wins; ties return all equally eligible candidates. If no positions are valid,
  all matching members are candidates. The agent chooses one returned candidate
  without another question. Board/list/view-specific selection is unsupported.
- **Azure:** a selected team's backlog level and its configured manual rank.
  Missing ranks or a tie at the top stay pending; additional views or filters
  are unsupported.

Empty piles, incomplete reads, access failures, and cancellation cause no import.
An unsupported highest-priority item needs your decision; the selector never
silently chooses another pile or a lower-priority item. After selection, it uses
the same import workflow as `/from-backlog` exactly once, including assessment
and conversational continuation, without duplicating analysis or starting work.

## Capture or update work

`/to-backlog` drafts one outcome-focused title and description from the current
agreement, not the transcript. New descriptions use **Problem**, **Goal**,
**Scope**, **Non-goals**, **Open questions**, and **Maturity**, with optional edge
cases, implementation notes, decisions, and research leads. Unconfirmed proposals
stay in Open questions. Maturity describes agreement, not implementation status.

When the conversation starts from an existing issue/work item—whether imported
or directly referenced—the skill updates that origin rather than creating a
replacement. Later reference links do not change the target. Updates preserve
unrelated description text and existing identifiers; they do not change state,
comments, labels, assignees, or Project membership.

For creation, explicit destination fields take precedence over optional
`.to-backlog.json` in the working directory, then Git remotes. Git hosting does
not override an explicit backlog provider. For example:

```json
{"provider":"github","repository":"owner/repo","project":"https://github.com/orgs/board-owner/projects/1"}
```

GitLab uses its project address as `repository`. Azure can use `provider:
"azuredevops"`, an HTTPS Services `organization` URL, and a team `project` name;
the work-item type is selected per invocation, not stored as a default. Required
project fields that the workflow cannot supply block creation; project rules
are not bypassed.

Before publication, you see the exact destination and full outgoing content and
can confirm, edit, or cancel. Azure Boards converts supported Markdown to HTML
and shows both before approval; unsupported forms block publication. A title-only
update preserves existing HTML. Changed update baselines require a new review
and approval.

Keep the local receipt and item link when publication is partial or uncertain.
Recovery verifies existing outcomes and never recreates an item automatically.
For GitHub, a created issue with failed Project insertion is retained, and only
the pending insertion may be retried. Linux publication uses a private temporary
directory; receipts contain the approved content and should be kept private.
