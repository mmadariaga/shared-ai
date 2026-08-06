**Complexity**: high

## Why

Managed opencode workers currently receive their contract only through coordinator-authored dispatch prompts, and those prompts use an unresolved free-text placeholder that can cause a worker to load the wrong instruction or recurse into another dispatch. Installer-owned registration defaults and binding validation must make contract delivery deterministic while retaining the existing Claude Code and Copilot boundaries.

## What Changes

- Add an explicit `prompt` to every managed opencode agent registration so the worker's own canonical contract is loaded independently of the dispatch prompt.
- Replace the free-text dispatch placeholder in all seven Claude Code and seven opencode worker bindings with a literal normative prompt template that carries the invocation envelope and names the worker contract explicitly.
- Extend opencode census derivation to validate the binding prompt template and to preserve the explicit registration prompt without inferring registration fields from binding content.
- Extend installer census tests and parity coverage to assert prompt declarations, deterministic registration output, failure behavior, and preservation of the Copilot inline path.
- Extend doctor consumption and doctor-test coverage so managed opencode records expose the same prompt-bearing census as installer guidance.
- Leave Claude Code worker definitions, their contract-loading mechanism, coordinator permissions, and Copilot's inline path unchanged apart from the shared binding-template wording.

## Capabilities

### New Capabilities

- `opencode-worker-system-prompt`: Every managed opencode worker registration loads its own canonical worker contract as an installer-owned system prompt before dispatch input is processed.
- `worker-dispatch-prompt-template`: Every Claude Code and opencode worker binding uses a literal, worker-specific dispatch prompt template that carries the invocation envelope and explicitly loads the same worker contract.

### Modified Capabilities

- `opencode-agent-census`: Census derivation validates the binding prompt template alongside the dispatch declaration and exposes each registration's explicit prompt without deriving model, mode, variant, or permissions from binding content.
- `harness-coordination-parity`: Routed Claude Code and opencode workers receive equivalent contract delivery through their harness-native registration/binding mechanisms, while Copilot remains on its inline path without routed worker registration.

## Impact

- `bin/install-flow.js` canonical opencode registration defaults and `deriveOpencodeAgentCensus` validation.
- `bin/doctor.js` managed opencode census consumption and root-aware contract diagnostics.
- `configs/opencode.jsonc` managed worker registration prompt declarations.
- `sai/orchestration/workers/bindings/claude/*.md` and `sai/orchestration/workers/bindings/opencode/*.md` dispatch prompt templates.
- `agents/claude/*.md` contract-loading definitions remain the Claude reference mechanism and are not otherwise changed.
- `test/install-opencode.test.js` census, registration, install, guidance, and preservation assertions.
- `test/install-claude.test.js` Claude binding-template validation and projection safety assertions.
- `test/doctor-opencode-agent-preservation-step-2.test.js` doctor-side managed opencode record coverage.
- `openspec/specs/opencode-agent-census/spec.md` and `openspec/specs/harness-coordination-parity/spec.md` delta requirements.
- No new runtime dependency, API, coordinator permission, Claude registration behavior, or Copilot routed projection.

## Proposal Research Documentation

**Local files**:

- `bin/install-flow.js:110-216`
- `configs/opencode.jsonc:24-97`
- `sai/orchestration/workers/bindings/claude/*.md`
- `sai/orchestration/workers/bindings/opencode/*.md`
- `sai/orchestration/workers/sai-1-spec-proposal-worker.md`, `sai-2-design-worker.md`, `sai-3-implementation-worker.md`, `sai-5-review-worker.md`, `sai-6-security-worker.md`, `sai-7-performance-worker.md`, `sai-8-accessibility-worker.md`
- `agents/claude/sai-1-spec-proposal-worker.md`, `agents/claude/sai-2-design-worker.md`, `agents/claude/sai-3-implementation-worker.md`, `agents/claude/sai-5-review-worker.md`, `agents/claude/sai-6-security-worker.md`, `agents/claude/sai-7-performance-worker.md`, `agents/claude/sai-8-accessibility-worker.md`
- `sai/install-manifest.json:13-28`
- `skills/opencode/fetch/SKILL.md:13-27`
- `INSTALL.opencode.md:239-269`
- `sai/commands/design/coordinator.md:12-21`
- `sai/orchestration/workers/sai-2-design-worker.md:5-22`
- `openspec/specs/opencode-agent-census/spec.md`
- `openspec/specs/harness-coordination-parity/spec.md`
- `test/install-opencode.test.js:55-255,474-658,1093-1115`
- `test/install-claude.test.js`
- `test/doctor-opencode-agent-preservation-step-2.test.js:188-215`
- `AGENTS.md:119-125`
- `GLOSSARY.md`

**External URLs**: None

## Additional Notes

- The current census contains seven managed worker names: spec, design, implementation, review, security, performance, and accessibility.
- The registration prompt is a validation target and an explicit default value, not a membership source; binding declarations continue to supply membership only.
- The literal template is intentionally retained in both routed binding families as defense in depth, even though opencode registration now loads the contract independently.
- The template passes the existing two-string `InvocationEnvelope` opaquely; serialization and phase-specific interpretation remain outside this change.
- Opencode registration prompts use the existing `Fetch @sai/...` resolver rather than a static `{file:...}` path, so project-local contract overrides retain precedence over user-global installed contracts.
- The change depends on `restore-coordinator-instruction-loading` having removed the obsolete worker proxy path; it does not reopen that change's coordinator tool or proxy-retirement decisions.
