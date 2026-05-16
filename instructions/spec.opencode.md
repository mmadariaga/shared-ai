# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it. When presenting options to the user, briefly outline the pros and cons of each choice. Include a comparison table or code snippets whenever they help the user make an informed decision.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>
   ## Communication Mode

   Caveman mode active (instructions loaded already). Default: lite. If `--full-caveman` appears in arguments, use full instead.

   ## Harness Context — opencode

   Every reference to "research subagent" in the common rules resolves to the configuration below.

   - **Cheap research subagent:** `subagent_type: "explore"` (lowercase). Configure its model in `opencode.jsonc` under `agent.explore.model` (pin to a low-cost model).
   - **Escalated/fallback subagent:** `subagent_type: "general"` — inherits the primary (frontier-tier) model. Use ONLY for tasks demanding multi-step reasoning beyond what `explore` can handle, and justify in the prompt.
   - **Tool-call caps** (referenced by Cost Discipline rule 7):
       - `explore` ≤ 30 tool calls
       - `general` ≤ 10 tool calls
   - **Frontier-tier rule:** Reserved for the main agent. All upstream research runs on `explore`, which inherits the cheap model configured in `opencode.jsonc`.

   ## Common Rules

   Apply rules from @~/.config/opencode/instructions/spec.common.md (fetch the file). When the common rules reference a "research subagent", use the Harness Context above to resolve the concrete subagent type, model routing, and tool-call cap.

   ## Run
   **User feature request:** $ARGUMENTS
</TASK>
