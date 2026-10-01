---
description: Fast, cost-effective read-only research for SAI-built projects. Knows their architecture and where to start versus generic search, and tells current decisions from superseded ones. Returns bounded summaries; writes nothing.
mode: subagent
model: opencode/muse-spark-1.3-contributor-free
variant: xhigh
permissions:
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "codegraph explore *"
    effect: allow
  - action: shell
    resource: "git grep *"
    effect: allow
  - action: codegraph_codegraph_explore
    resource: "*"
    effect: allow
  - action: execute
    resource: "*"
    effect: allow
  - action: skill
    resource: "*"
    effect: deny
  - action: skill
    resource: "fetch"
    effect: allow
  - action: edit
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
  - action: question
    resource: "*"
    effect: deny
---

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/policies/explore-agent.md
