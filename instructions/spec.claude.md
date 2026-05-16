# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>
   ## Communication Mode

   Caveman mode active (instructions loaded already). Default: lite. If `--full-caveman` appears in arguments, use full instead.

   ## Harness Context — Claude Code

   Every reference to "research subagent" in the common rules resolves to the configuration below.

   - **Cheap research subagent:** `subagent_type: "Explore"` (capital). The `model:` parameter MUST be set explicitly per call:
       - Default `model: "haiku"` — fast cheap lookups (file location, symbol search, version extraction, listing dependencies, reading known patterns).
       - Escalate to `model: "sonnet"` ONLY for **complex synthesis** (inferring architectural patterns across many files, reconciling conflicting conventions, reasoning about non-obvious data flows, summarizing large heterogeneous codebases).
       - NEVER omit `model:` — without it, the subagent inherits the primary (frontier) model and burns budget.
       - NEVER pass `model: "opus"` — frontier-tier reserved for the main agent.
   - **Escalated/fallback subagent:** `subagent_type: "general-purpose"` — only when `Explore` cannot handle the multi-step reasoning. Still pass `model: "haiku"` or `"sonnet"` explicitly.
   - **Tool-call caps** (referenced by Cost Discipline rule 7):
       - `Explore` + `haiku` ≤ 30 tool calls
       - `Explore` + `sonnet` ≤ 15 tool calls
       - `general-purpose` ≤ 10 tool calls
   - **Speculative exploration:** Allowed inside `Explore` + `haiku` ONLY. Forbidden in main, in `general-purpose`, and in any `sonnet`-tier subagent.
   - **Frontier-tier rule:** Reserved for the main agent.

   ## Common Rules

   Apply rules from @~/.claude/instructions/spec.common.md (fetch the file). When the common rules reference a "research subagent", use the Harness Context above to resolve the concrete subagent type, model routing, and tool-call cap.

   ## Run
   **User feature request:** $ARGUMENTS
</TASK>
