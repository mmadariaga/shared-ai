**Complexity**: high

## Why

The six routed Claude Code coordinators cannot resolve their own non-skill `Fetch @` instruction chain after installation because their tool scopes omit the `Read` and `Glob` tools required by the fetch resolver. Restore the narrowly required read capability and remove the proxy skills that became unnecessary workarounds, so installed coordinators behave the same as the repository-local control case without weakening the no-write boundary.

## What Changes

- Add `Read` and `Glob` to the allowed-tools list of the six routed Claude Code coordinator commands: design, implementation, review, security, performance, and accessibility.
- Keep `Edit`, `Write`, and bare `Bash` absent from every routed coordinator tool scope; leave `sai-explore` and `sai-status` behavior unchanged.
- Update the Claude Code and opencode fetch resolver instructions to name `Glob` explicitly for non-skill candidate selection, removing the unresolved `glob/LS` alternative from both routed harnesses; leave Copilot's inline resolver unchanged.
- Replace the 17 active Claude Code and opencode wrapper references that load one-line worker proxy skills, including the spec and explore wrappers, with direct references to the installed binding paths under `sai/orchestration/workers/bindings/`.
- Retire the 14 one-line Claude Code and opencode worker proxy skill projections through the existing manifest retirement mechanism, preserving modified or unknown user-owned files.
- Delete the 14 obsolete one-line worker proxy skill source files from the repository.
- Preserve the existing routed worker contracts, binding prompt text, opencode agent registrations, and Copilot inline boundary.

## Capabilities

### New Capabilities

- `coordinator-instruction-loading`: Routed coordinators can resolve their own fetched coordinator contracts and worker bindings in an installed project while retaining their no-write tool boundary.
- `worker-binding-proxy-retirement`: Worker binding proxy skills are removed from the managed projection and command loading uses the surviving direct binding paths.

### Modified Capabilities

- `per-command-tool-scoping`: Routed coordinator scopes permit the read/search tools required for instruction resolution without permitting project mutation tools.
- `managed-worker-registry`: The managed-worker projection and retirement inventory no longer register the obsolete proxy skill identities, eliminating their collision with opencode worker agent identities.
- `accessibility-worker-installation`: Accessibility routing projects and loads direct worker bindings without forwarding skills.
- `design-coordinator`: The numbered design worker identity uses direct binding fetch references rather than forwarding-skill directories.
- `implementation-coordinator`: The numbered implementation worker identity uses direct binding fetch references rather than forwarding-skill directories.
- `implementation-harness-bindings`: Routed implementation projections retain bindings, agents, and registration metadata while omitting forwarding skills.
- `review-worker-installation`: Review wrappers load direct bindings and installation no longer projects forwarding skills.
- `security-worker-installation`: Security wrappers load direct bindings and installation no longer projects forwarding skills.
- `worker-skill-path-update`: The forwarding-skill requirements are retired because wrappers now fetch the neutral binding paths directly.

## Impact

- Claude Code coordinator wrappers: `commands/claude/sai-{2-design,3-implement,5-review,6-security,7-performance,8-accessibility}.md`.
- The active wrapper files under `commands/claude/` and `commands/opencode/` that currently reference worker proxy skills.
- The 14 proxy skill files under `skills/claude/sai-*-worker/SKILL.md` and `skills/opencode/sai-*-worker/SKILL.md`.
- Routed fetch resolution instructions: `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md`; Copilot's inline resolver remains unchanged.
- Installer projection, retirement, and fetch-reference validation: `sai/install-manifest.json`, `bin/install-manifest.js`, `bin/install-flow.js`, `bin/doctor.js`, and retirement helpers.
- Coordinator, installer, manifest, doctor, and retirement tests covering exact tool scopes, fresh installs, stale projections, and user-owned-file preservation.
- Existing OpenSpec capability specifications for per-command tool scoping, managed-worker registration, design navigation, and harness bindings. `design-phase-navigation` remains unchanged because the restored list is a superset of its required coordinator tools and this change does not alter navigation behavior.
- No new runtime dependency, API, worker contract, binding prompt, or opencode agent registration.
- opencode tool-scoping has no equivalent Claude `allowed-tools` frontmatter and remains unchanged; its wrapper references and proxy projections are updated by this change. Copilot is N/A because it uses the inline adapter and projects no routed worker binding.

## Proposal Research Documentation

**Local files**:

- `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`, `commands/claude/sai-5-review.md`, `commands/claude/sai-6-security.md`, `commands/claude/sai-7-performance.md`, `commands/claude/sai-8-accessibility.md`, and `commands/claude/sai-explore.md`
- `skills/claude/fetch/SKILL.md`
- `skills/claude/sai-*-worker/SKILL.md` and `skills/opencode/sai-*-worker/SKILL.md`
- `sai/install-manifest.json`, `bin/install-manifest-retirement.js`, `bin/install-manifest.js`, and `bin/install-flow.js`
- `test/design-coordinator-worker.test.js`, `test/install-claude.test.js`, `test/install-manifest.test.js`, `test/install-retirement-step-3.test.js`, and `test/doctor-retirement-step-5.test.js`
- `openspec/specs/per-command-tool-scoping/spec.md`, `openspec/specs/design-phase-navigation/spec.md`, `openspec/specs/managed-worker-registry/spec.md`, `openspec/specs/design-harness-bindings/spec.md`, `openspec/specs/implementation-harness-bindings/spec.md`, and `openspec/specs/transitional-guard-retirement/spec.md`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The 17 references are active wrapper occurrences across Claude Code and opencode, including the spec, six routed phase, and explore wrappers; archived artifacts are not part of the count.
- The coordinator prohibition on reading project content remains in force; reading the coordinator's own contract and binding is an instruction-loading operation, not artifact research.
- The existing retirement path must remain fail-safe: managed historical bytes may be removed, while modified or unknown destination files are preserved.
- The exact non-writing tool scope applies only to the six routed Claude phase coordinators. `sai-1-spec` remains on its existing unrestricted wrapper surface, and opencode has no equivalent per-command tool-scope frontmatter; neither asymmetry is expanded by this change.
