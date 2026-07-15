## Why

The two Copilot surfaces (CLI vs VS Code) use divergent tool vocabularies. To wire `vscode/askQuestions` across the 14 Copilot prompt files, three runtime unknowns must be resolved by empirical probe, not by further documentation research: (1) whether the model invokes the picker autonomously when enabled, (2) whether `tools:` replaces or augments the default agent toolset, and (3) the correct VS Code prompt-file identifier for the terminal tool. A single self-revealing run on `sai-explore` — which exercises read, terminal (`openspec`), and the picker at once — resolves all three cheaper than more doc research.

## What Changes

- Add a `tools:` frontmatter block listing only `vscode/askQuestions` to `commands/copilot/sai-explore.prompt.md` (additive — no other field changes).
- Run `/sai-explore` in VS Code Copilot with the modified file in place, observing three signals: (a) the picker appears without a typed `#askUser`, (b) file reads still work, (c) `openspec list --json` still runs.
- Record the three observed signals and what they reveal about (1) picker-invocation modality (autonomous / user-triggered-only / absent), (2) replace-vs-augment semantics, (3) the terminal tool identifier (only resolvable if replace semantics show). The picker-invocation modality is recorded orthogonally to replace-vs-augment — a `user-triggered-only` or `absent` picker modality is a fatal outcome for the wired feature regardless of which semantics the file-read and terminal signals reveal.
- No spec change to `closed-choice-prompts`; the probe outcome informs a later real change to `sai/instructions/remember.md` and the `closed-choice-prompts` spec.

## Capabilities

### New Capabilities

- `copilot-prompt-tools-probe`: Empirical contract for probing `tools:` frontmatter semantics in Copilot prompt files — single-file, additive-only, three-signal observation protocol, with the picker-invocation modality classification, the replace-vs-augment discrimination, and the terminal-tool identifier as the three empirical outputs.

### Modified Capabilities

- (none — the probe outcome will inform a later change to `closed-choice-prompts`)

## Impact

- **Files modified**: `commands/copilot/sai-explore.prompt.md` — additive change to YAML frontmatter only; the existing `description`, `argument-hint`, `agent`, and `model` fields are preserved verbatim.
- **Files added**: `openspec/changes/probe-copilot-askquestions/specs/copilot-prompt-tools-probe/spec.md` — new experimental-contract capability spec.
- **No effect on the other 13 Copilot prompt files** — generalization is deferred to a later change after the probe outcome is recorded.
- **Reversible** — removing the `tools:` line from `sai-explore.prompt.md` fully reverts the probe.

## Proposal Research Documentation

**Local files**:

- `commands/copilot/sai-explore.prompt.md` — target file; current frontmatter fields: `description`, `argument-hint`, `agent`, `model`.
- `agents/copilot/budget-executor.agent.md` — precedent: `tools:` frontmatter uses CLI-style names `search/listDirectory`, `execute/runInTerminal`, `read/terminalLastCommand`.
- `agents/copilot/budget-explorer.agent.md` — precedent: `tools:` frontmatter uses CLI-style names `search/codebase`, `search/usages`, `search/listDirectory`, `web/fetch`, `read/readFile`.
- `agents/copilot/budget-subagent.agent.md` — precedent: similar `tools:` block.
- `openspec/specs/closed-choice-prompts/spec.md` — existing per-harness option-picker mapping; the probe outcome will eventually inform a MODIFIED requirement on this spec (deferred to a later change).
- `openspec/specs/spec-quality/spec.md` — Completion-phase decision summary and self-consistency contract applied to this proposal.

**External URLs**: (none — the remaining three unknowns are runtime-only and cannot be resolved by documentation)

## Additional Notes

- **Tool-name vocabulary**: The `tools:` block in this probe uses the VS Code-specific name `vscode/askQuestions`. The agent files use the CLI-style vocabulary (`execute/runInTerminal`, `search/codebase`, etc.) — these are NOT the same namespace. The probe tests the VS Code vocabulary specifically because the change targets VS Code Copilot, not the CLI.
- **Why a single-file probe**: `sai-explore` is read-only by spec contract, yet exercises read (fetch skill), terminal (`openspec list`), and the picker at once — making it the most self-revealing single target. Wiring all 14 prompt files up front would pay the full cost before the blocking unknowns are resolved.
- **Why only `vscode/askQuestions`**: Adding only one tool makes the run discriminate augment-vs-replace by observation — if file reads and the terminal still work, augment semantics are in play; if either degrades silently, replace semantics are in play.
- **Hypothesis about the terminal tool identifier**: If replace semantics show, the terminal tool is the flat `terminal` (not the CLI's `execute/runInTerminal`) — because the agent's CLI-style vocabulary would be wiped.
- **Scope carve-out vs `closed-choice-prompts` centralization**: The `closed-choice-prompts` spec mandates that the per-harness mapping live in exactly one place (`sai/instructions/remember.md`). The `tools:` frontmatter wiring does NOT restate that mapping — it is enablement plumbing, not policy. The probe's eventual real change will modify `remember.md` (and the `closed-choice-prompts` spec) to record that VS Code now has a native option-picker.
- **Not a generalization**: This probe proves nothing about the other 13 prompt files' toolsets; it only unblocks the design. Generalization is deferred to a separate change after the probe outcome is recorded.
- **Capability is throwaway**: The `copilot-prompt-tools-probe` capability is an experimental-procedure spec, not a permanent behavior spec. Its requirements describe a one-shot probe contract — once the probe runs and its outcome is recorded (the three empirical outputs: picker-invocation modality, replace-vs-augment classification, and the conditional terminal-tool identifier), the capability is archived together with the change. The probe's findings inform a later real change, which will modify `closed-choice-prompts` and `sai/instructions/remember.md` based on the recorded outcome. No enduring system behavior is specified by this capability beyond the single probe run.
