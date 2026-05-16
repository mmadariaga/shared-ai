# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>
   ## Communication Mode

   Caveman mode active (instructions loaded already). Default: lite. If `--full-caveman` appears in arguments, use full instead.

   ## Harness Context — GitHub Copilot

   Every reference to "research subagent" in the common rules resolves to the configuration below.

   **Mechanism (read first):** Subagents inherit the main session's tools and model UNLESS routed to a custom agent (`.agent.md` in `.github/agents/` or `~/.copilot/agents/`) whose YAML frontmatter declares its own `model:` list. Without a custom agent, a subagent on Opus is just as expensive as the main agent. Premium-request billing scales with the model multiplier on each user prompt; pinning the explorer to a low-multiplier model is the only durable cost lever.

   **Required setup:** A pre-defined cheap explorer custom agent. Example `.github/agents/explorer.agent.md`:
   ```yaml
   ---
   name: explorer
   model: ['Claude Haiku 4.5 (copilot)', 'Gemini 3 Flash (Preview) (copilot)']
   user-invocable: false
   ---
   ```
   If no cheap explorer custom agent exists in the repository, STOP and ask the user to create one before doing significant research. Note this as a gap in the spec deliverable.

   - **Cheap research subagent:** the `explorer` custom agent (or equivalent low-multiplier custom agent). Route every research call to it. Do NOT use bare `runSubagent` for non-trivial research — it inherits the main (frontier-tier) model.
   - **Escalated/fallback subagent:** a frontier-tier custom agent or bare `runSubagent`. Use ONLY for multi-step reasoning beyond what the explorer can handle. Justify in the prompt.
   - **Tool-call caps** (referenced by Cost Discipline rule 7):
       - explorer custom agent ≤ 30 tool calls
       - frontier-tier subagent ≤ 10 tool calls
   - **Speculative exploration:** Allowed inside the explorer custom agent ONLY. Forbidden in main and in any frontier-tier subagent.
   - **Frontier-tier rule:** Reserved for the main agent.

   ## Common Rules

   Apply rules from @~/.config/opencode/instructions/spec.common.md (fetch the file). When the common rules reference a "research subagent", use the Harness Context above to resolve the concrete subagent type, model routing, and tool-call cap.

   ## Run
   **User feature request:** $ARGUMENTS
</TASK>
