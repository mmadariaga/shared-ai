---
description: Review a change, run the security / performance / accessibility audits the review recommends, and fix the findings an Assessment pass keeps through a /sai-3-implement segment, with no human in the loop (one commit per fix step). Accepts --full, --path <dir>, --tier <tier>, --runtime, --url <url>, --parent-branch <branch>.
argument-hint: "[change-name] [optional: --full | --path <dir>] [optional: --tier backend|frontend|db|queue] [optional: --runtime] [optional: --url <url>] [optional: --parent-branch <branch>]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/deep-review/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: deep-review
  arguments_value: $ARGUMENTS
