---
name: sai-commands
description: >
  Lists all /sai-* commands and their locations. The LLM MUST load this skill before executing any sai-* command to prevent skipping command files and interpreting tasks freely.
license: MIT
compatibility: opencode, claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## SAI Command Resolution Rule

When the user invokes a command starting with `/sai-`, you MUST resolve it by reading the corresponding file from `@commands/sai-<name>`. Never interpret or execute a sai-* task directly — always fetch and follow the command file exactly.

This prevents the LLM from skipping command loading and making free interpretations of the task.

### Command Registry

| Command | File | Description |
|---------|------|-------------|
| `/sai-explore` | `@commands/sai-explore.md` | Explore mode — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill, adds caveman mode. |
| `/sai-1-spec` | `@commands/sai-1-spec.md` | Propose a new change — generates proposal.md and specs/ only. Stops before design. |
| `/sai-2-design` | `@commands/sai-2-design.md` | Generate design.md and tasks.md for an approved change — gated on specs approval. |
| `/sai-3-implement` | `@commands/sai-3-implement.md` | Granular implementation plan — reads OpenSpec change artifacts, writes implementation.md with code, RED→GREEN, STOP & COMMIT markers. |
| `/sai-4-apply` | `@commands/sai-4-apply.md` | Apply the granular implementation plan mechanically — reads implementation.md and executes step-by-step with a cheap model. |
| `/sai-5-review` | `@commands/sai-5-review.md` | Structured Code Review — diffs current branch against parent, contrasts with OpenSpec change artifacts, produces review.md. |
| `/sai-6-security` | `@commands/sai-6-security.md` | Structured Security Audit — SAST + SCA on the diff vs parent branch, produces security.md. |
| `/sai-7-performance` | `@commands/sai-7-performance.md` | Structured Performance Audit — backend/frontend/database/queue tiers, produces performance.md. |
| `/sai-8-accessibility` | `@commands/sai-8-accessibility.md` | Structured Accessibility Audit — WCAG 2.2 AA static review, produces accessibility.md. |
| `/sai-archive` | `@commands/sai-archive.md` | Archive a completed change — moves openspec/changes/{name}/ into the archive folder. |
| `/sai-pr` | `@commands/sai-pr.md` | Pull Request Author — synthesizes PR title and body from change artifacts and git diff, opens PR via gh. |
| `/sai-commit` | `@commands/sai-commit.md` | Conventional Commits message author from staged changes — generates subject and body, gates commit behind explicit authorization. |
| `/sai-backfill` | `@commands/sai-backfill.md` | Post-hoc backfill — reconstructs proposal.md and capability specs for changes that skipped the SAI workflow. |
| `/budget` | `@commands/budget.md` | Load all three budget skills (explorer + executor + token-efficient-languages) simultaneously. |

### Resolution Steps

1. Identify the command name from the user's input (e.g., `/sai-3-implement` → `sai-3-implement.md`)
2. Fetch the corresponding file from `@commands/sai-<name>.md`
3. Follow the instructions in that file exactly
4. Do NOT skip to implementation or interpretation — the command file contains all necessary behavior

### Why This Matters

The sai-* commands are wrappers that:
- Load prerequisite checks
- Apply caveman communication mode
- Enforce cost discipline via budget skills
- Load phase-specific instructions
- Chain OpenSpec skills in the correct order

Skipping the command file means skipping all of these quality layers.
