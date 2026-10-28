---
description: Merge, rebase, or squash-rebase a branch — asks only at start (branch, method, autostash) and on escalation, resolves all conflicts by commit intent, repairs ADR/DDR collisions, verifies the result against the suite baseline taken at HEAD, and finalizes locally. Accepts [<branch>] [--rebase|--squash].
argument-hint: "[<branch>] [optional: --rebase | --squash]"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch @skills/fetch/SKILL.md
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch @sai/commands/merge/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: merge
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
