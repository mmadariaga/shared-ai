---
agent: 'agent'
description: "Structured Code Review Prompt — diffs current branch against parent, contrasts with spec.md, and produces plans/{feature-name}/review.md"
model: Claude Sonnet 4.6 (copilot)
---
Fetch @~/AppData/Roaming/Code/User/instructions/caveman.md
Fetch @~/AppData/Roaming/Code/User/instructions/glossary-format.md

Also fetch @~/AppData/Roaming/Code/User/instructions/review.md and follow those instructions exactly. 

Also fetch @~/AppData/Roaming/Code/User/instructions/remember.md