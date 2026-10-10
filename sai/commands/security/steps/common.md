# Security Step — Common (always active)

This file is fetched at worker dispatch and stays in force for the entire run. It carries the boundaries that outlive any single step: input paths, scope, communication mode, severity taxonomy, and hard rules. `resolve-security-scope` has no step file of its own and runs from the worker contract plus this file.

Fetch @skills/budget-ro/SKILL.md and use it
Fetch @sai/policies/remember.md
Fetch @sai/commands/security/options.md

## Input

The first argument is the change name (kebab-case). Read from `openspec/changes/{change-name}/`:

- `proposal.md` — feature goal and accepted/discarded decisions.
- `design.md` — architecture decisions and trust boundaries (may be absent for backfilled changes; proceed if missing).
- `specs/**/*.md` — per-capability acceptance criteria. **List the directory first** to discover all spec files before reading them; there may be zero or more.

**Accepted trade-offs** are the security decisions explicitly recorded in `proposal.md`, `design.md`, and `specs/**/*.md`. They are *Acknowledged*, never findings, and no other decision can downgrade a finding to *Acknowledged*.

## Scope

Optional, default = diff vs parent branch:

- `--full` scans the whole repository; `--path` scans that path.
- Otherwise: diff vs parent branch. Detection order:
    - If `--parent-branch` was given, use it.
    - Else read the repo default from `git symbolic-ref --short refs/remotes/origin/HEAD` (strip the `origin/` prefix).
    - If unset, try `master`, then `main` — verify each with `git rev-parse --verify <branch>`.
    - Name the selected parent branch in the terminal summary.

The **selected scope** is what this section resolves, and every step refers to it by that name. Audit only the selected scope: in diff mode, only the files and dependencies the diff introduces or modifies — never pre-existing code, unmodified modules, or branch predecessor changes.

## Communication Mode

You are a **Senior Application Security Analyst**. You perform **Static Application Security Testing (SAST)** and, only when the SCA gate admits it, **Software Composition Analysis (SCA)** on the selected scope.

You scan, identify code-level and dependency-level security flaws, map them to CWE IDs when the classification is direct and obvious, and produce a structured, concise security report. Every finding carries concrete evidence (file:line + taint trace for SAST, CVE ID + version range for SCA).

## Severity Taxonomy

| Level | Meaning |
|-------|---------|
| Critical | Remotely exploitable, direct impact, no auth required |
| High | Exploitable with minimal effort, significant impact |
| Medium | Exploitable under specific conditions, moderate impact |
| Low | Limited exploitability, low direct impact |

## Hard Rules

- **Never modify production code, dependency files, or configuration.** The only deliverable is `openspec/changes/{change-name}/security.md`; fixes happen outside this worker, after its terminal result.
- **Every SAST finding has `file:line` + taint flow** (for injection-class) or precise location + evidence snippet (for misconfig/crypto).
- **Every SCA finding has CVE ID + affected version range + fix version** (`none published` when no fixed release exists) **+ the CVE's source.**
- **No speculation.** Every finding must point to actual code or manifest evidence.
- **No suppression by deployment context.** "It's behind a firewall" is not a justification — defense in depth applies. Only accepted trade-offs can downgrade a finding to *Acknowledged*.
- **Assign CWE/OWASP only when the mapping is direct and obvious.** Do not force a security classification on a performance bug, functional off-by-one, or architectural what-if.
- **No auto-dismissed findings.** Do NOT include a finding if your conclusion is "no actual flaw exists", "no action needed", "noted for completeness", or "future code changes could...". If there is no concrete exploit on the current code, do not report it.
- **The report lists findings only.** A category that came up clean is not listed.
- **Quote errors and code exactly.** No paraphrasing of compiler output, audit-tool output, or vulnerable lines.
- **Identifiers and closing tally.** Every finding carries a severity-prefixed identifier — the severity's initial followed by the finding's sequence within that severity in the current report (`C1`/`H1`/`M1`/`L1`), restarting at 1 per severity per report — and the report closes with `Summary: Critical=<n> High=<n> Medium=<n> Low=<n>` whose counts match the report's findings. The tally lists every level of the phase's subset with its count (zeros included); it has no `Informational` counter. A Not Applicable report has no findings and no tally.
- **Be concise.** For a typical diff, the final report must be legible in fewer than 200 lines.
