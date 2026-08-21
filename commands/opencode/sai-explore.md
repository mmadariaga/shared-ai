---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill. Optionally pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic] [--overview-lang <language>] [--fast-track]"
model: opencode-go/deepseek-v4-flash
variant: max
---
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/adapters/opencode/idea-list-render.md and use it.
Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.
Fetch @sai/commands/explore/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: explore
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
