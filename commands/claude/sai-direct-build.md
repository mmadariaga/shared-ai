---
description: Build a change from a change document file in one unattended run — implement, review, reconstruct specs, archive, and make one local commit. Accepts --document-file <path> --document-hash <sha256>.
argument-hint: "--document-file <path> --document-hash <sha256>"
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
