---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill, adds caveman mode. Optionally pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic]"
agent: agent
model: GPT-5.4 (copilot)
---
## Sai Explore

Use the skill tool to load the fetch skill.
Fetch @sai/instructions/harness/copilot.md and follow those instructions exactly.
Fetch @sai/commands/sai-explore.md and follow those instructions exactly.

## No-file-write enforcement
During explore mode, you MUST NOT create or modify any files. If the user asks you to create something, summarize what you would create and tell them to exit explore mode first, then use the appropriate sai-* command in a new chat.
