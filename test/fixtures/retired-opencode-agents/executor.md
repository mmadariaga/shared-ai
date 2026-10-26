---
description: Execute-only command runner. Runs the named commands, or the narrowest one for a stated goal (tests, builds, linters), and returns a low-output report of exit codes and failures. Fixes stay with the caller.
mode: subagent
model: opencode/muse-spark-1.3-contributor-free
variant: xhigh
permissions:
  - action: "*"
    resource: "*"
    effect: deny
  - action: "read"
    resource: "*"
    effect: allow
  - action: "skill"
    resource: "fetch"
    effect: allow
  - action: "shell"
    resource: "*"
    effect: allow
  - action: "external_directory"
    resource: "*"
    effect: ask
  - action: "external_directory"
    resource: "~/.config/opencode/*"
    effect: allow
  - action: "external_directory"
    resource: "/tmp/opencode/*"
    effect: allow
  - action: "external_directory"
    resource: "~/.local/share/opencode/tool-output/*"
    effect: allow
  - action: "external_directory"
    resource: "~/.local/share/opencode/shell/*"
    effect: allow
  - action: "read"
    resource: "*.env"
    effect: ask
  - action: "read"
    resource: "*.env.*"
    effect: ask
  - action: "read"
    resource: "*.env.example"
    effect: allow
---

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Required capability profile: executor.
Fetch @sai/policies/tool-access.md; check access after task disclosure.
Fetch @sai/policies/executor-agent.md
