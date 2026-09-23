---
name: sai-commands
description: >
  Resolves a /sai-* invocation to its command file. The LLM MUST load this skill before executing any /sai-* command that reached it as text rather than as an expanded command.
license: MIT
compatibility: opencode, claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Resolving a /sai-* command

A `/sai-<name>` invocation runs only through its command file, `@commands/sai-<name>.md`. Everything the command does (prerequisite checks, budget routing, phase instructions, gates) comes from the chain that file loads, so a task run without it skips all of them.

1. Take the command name from the invocation: `/sai-3-implement` → `sai-3-implement`.
2. When the harness has already expanded the command into your context, follow that content. Otherwise fetch `@commands/sai-<name>.md`.
3. Follow the file exactly, from its first directive, before acting on the task itself.

The installed command files are the registry: `commands/sai-*.md` under the harness root. A name with no file there is not a SAI command; say so and stop.
