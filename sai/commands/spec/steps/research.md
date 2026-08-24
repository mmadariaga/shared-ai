# Spec Step — Research

Active step: research. Complete structured research for every resolved request before proposal generation, then report the `research` progress event per the worker contract.

Rules originating here: Research Guide, Budget-explorer delegation specifics.

## Structured research guide

1. **Codebase Context** — identify related features, affected files/services, existing architectural and implementation patterns.
2. **Internal Documentation** — read relevant docs, READMEs, ADRs/DDRs. Read `GLOSSARY.md` if present; use its terms during planning and challenge ambiguous language. Append new resolved terms immediately (do not batch). Bootstrap if absent. Format per the `<glossary_format>` block pre-loaded in context.
3. **External Dependencies** — investigate required APIs/SDKs/platform tools. Official documentation only. All web fetching via the research subagent with a distilled output contract.
4. **Design Patterns** — review similar features; reuse proven patterns.
5. **Never speculate about code you have not read.** If a specific file is referenced and its content is already in context (returned by a prior subagent), answer from that. If not, either open it directly when it's a single known path (inline read budget applies), or delegate to a budget-explorer subagent for broader retrieval. Never make claims about code without grounded evidence.

Stop research once ~80% confident in how to break the request into testable steps, identify the correct expertise profile, and list the exact docs needed for code generation.

### Handoff research input consumption

When the pasted `Ready to Propose` handoff carries `file:line` evidence-provenance in its **Why** or **Decisions & Rationale** fields, or carries entries in **Research Leads**, treat those sources as **premises to confirm and extend**: validate them first, then build on them. This framing is mandatory and additive - it does NOT replace independent research. The existing rules above (never speculate about unread code, stop at ~80% confidence, structured research) remain unchanged.

- For each Research Lead, validate the current path or path range. When it resolves, inspect the relevant source, follow related code and documentation, and continue open-ended independent research beyond the listed leads. Research Leads are suggested starting points, not a closed inspection list, authoritative scope, or target-file selection.
- If a cited source or Research Lead contradicts or under-supports the attributed hypothesis, including a resolving line range that now points at unrelated content, reject the unsupported premise, extend research beyond it, and write specs from what current sources support. Disconfirming input must not propagate unexamined.
- If a cited path or Research Lead no longer resolves because it was deleted or renamed, fall back to normal from-scratch research for that item without erroring or halting.
- If Research Leads are absent, contain `- None`, or are insufficient, proceed with or expand normal independent research until the existing confidence threshold is met.
- This instruction does not mandate whether reclaimed effort is banked as speed or reinvested as quality; that trade-off remains open.
- Provenance remains a citation for intent and Research Leads remain investigative guidance. Neither introduces a target-file, files-to-modify, or "where to modify" field; implementation targeting remains downstream.

## Budget-explorer delegation specifics

How to spawn subagents, which model tier to use, task classification (lookup / synthesis / audit), tool-call caps, and output contract format are all defined by the budget skill (loaded at dispatch via common.md). Follow it.

Rules for you specifically:

1. **Do not do I/O yourself.** Never call a web fetch tool directly or run broad `Grep`/`Glob` searches. Delegate all of that to a **`budget-explorer`** subagent.
    - Exception: you may open a single known file at a known path to confirm a specific fact, or run a targeted search for a known symbol.
   - Exception (audit tasks): you may read target artifacts directly up to ≤15 reads + ≤30 `Grep`/`Glob` per pass. Beyond that, delegate.

   **Note:** This command's read budget deliberately diverges from the other six commands (spec uses ≤15 reads for audit tasks; design/implement/apply use the three-file ceiling). Unification of these budgets across all commands is pending.

2. **Own the scope for audit tasks.** Break the task into ≥3 concrete categories. Spawn one **`budget-explorer`** subagent per category in parallel. Require complete results — not "top N". If you can't define ≥3 categories, the task is not audit-class.
3. **Run independent research calls in parallel**, not sequentially.
4. **Open-ended exploration goes to a `budget-explorer`** subagent, not the main agent.
5. **Do not re-fetch what you already have.** Cheap redundancy is fine; spawning a higher-tier subagent to re-fetch the same source is not.
6. **Reasoning and synthesis stay with you.** Never delegate a decision to a subagent.
