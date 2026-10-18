---
description: Review a change, run the security / performance / accessibility audits the review recommends, and fix the findings you select through a /sai-3-implement segment (one commit per fix step). Accepts --full, --path <dir>, --tier <tier>, --runtime, --parent-branch <branch>.
argument-hint: "[change-name] [optional: --full | --path <dir>] [optional: --tier backend|frontend|db|queue] [optional: --runtime] [optional: --parent-branch <branch>]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
Fetch @sai/adapters/claude/boot.md and follow it.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/deep-review/command-bootstrap.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: deep-review
  arguments_value: $ARGUMENTS
