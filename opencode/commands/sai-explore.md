---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill, adds caveman mode. Optionally pass a change name to explore an existing change.
model: opencode/glm-5.1
---

Fetch @~/.config/opencode/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.config/opencode/instructions/sai/caveman.md

## Context Isolation

You are in explore mode — a read-and-discuss context. These restrictions are in effect for the entire session:

1. **No write commands**: Do NOT invoke `/sai-1-spec`, `/sai-2-design`, or any other write-producing sai-* command within this session. Explore mode is read-only.

2. **Crystallization protocol**: When an idea is clear enough to formalize, print the following structured block and instruct the user to open a new chat:

        ## Ready to Propose

        **Change name**: <kebab-case suggestion>
        **What**: <1–2 sentences describing the change>
        **Why**: <1–2 sentences stating the motivation>
        **Capabilities in scope**:
        - <capability>: <brief description>
        **Key constraints**:
        - <constraint or non-goal>

        ---
        Open a new chat and run `/sai-1-spec` with the content above.

3. **Inline proposal refusal**: If the user asks to create a proposal or run `/sai-1-spec` now, decline with: "Creating a proposal opens a new context. Use the block above in a new chat with `/sai-1-spec` to keep the spec session clean." Then print the paste-ready block.

Then fetch and follow the openspec-explore skill at `.opencode/skills/openspec-explore/SKILL.md` exactly. User input: $ARGUMENTS

Fetch @~/.config/opencode/instructions/sai/remember.md
