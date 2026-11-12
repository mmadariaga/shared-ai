---
description: Build a change from a Ready to Propose block file in one unattended run — implement, review, reconstruct specs, archive, and make one local commit. Accepts --block-file <path> --block-hash <sha256>.
argument-hint: "--block-file <path> --block-hash <sha256>"
model: opus
effort: medium
allowed-tools: {{capabilityAllowedTools}}
---
Fetch `@skills/fetch/SKILL.md`
This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.
Required capability profile: {{capabilityProfile}}.
Fetch `@sai/commands/direct-build/coordinator.md` and follow it exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: direct-build
  arguments_value: $ARGUMENTS

<!-- User customizations below this line -->
