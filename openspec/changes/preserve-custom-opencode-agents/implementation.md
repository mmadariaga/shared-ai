# Preserve Custom Opencode Agents

## Goal

Preserve every existing opencode agent definition by name, bootstrap only missing repository defaults, validate managed workers by presence, and align the accepted policy documentation without weakening non-opencode collision safeguards.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD`. If the command returns empty, use `detached HEAD`.
- Resolve the repository default branch in this order: `git symbolic-ref --quiet refs/remotes/origin/HEAD`; otherwise use an existing local `main` or `master` (prefer `main` when both exist); otherwise use the current branch.
- Present these branch choices in order:
  1. `Suggest branch "preserve-custom-opencode-agents"`
  2. `Stay on current branch "{detected current branch}"`
  3. `Enter branch name manually`
- When the selected branch does not exist and the current branch differs from the resolved default branch, ask whether to base it on the default branch or current branch, in that order. Skip the base prompt when staying on the current branch, selecting an existing branch, or already on the default branch.
- Create a selected new branch from the chosen base before applying Step 1. Never assume the default branch is named `main`.

### Step-by-Step Instructions

#### Step 1: Preserve existing agents and bootstrap only missing names

*(Testable step - use RED -> GREEN)*

##### RED phase

- **Rule:** RED contains only tests that exercise the existing public installer surfaces. Do not change `bin/install-flow.js` before RED is verified.

- [x] Extend `test/install-opencode.test.js` with scenarios for customized helper and numbered-worker definitions, mixed present/missing names, and a fully populated customized JSONC file. Use temporary directories and invoke `copyOpencodeConfig` or `installOpencode` exactly as existing tests do.

  Because `interfaces.md` is authoritative, cover these scenarios without duplicating its concrete assertions here:
  - Customized installer-provisioned names are retained while omitted names are bootstrapped.
  - Customized `sai-2-design-worker` and `sai-3-implementation-worker` definitions do not cause collision failures.
  - A fully populated customized configuration remains byte-identical.
  - `opencode.json` precedence, malformed roots/maps, and ordinary managed-file replacement remain unchanged.

- [x] Update the opencode portion of `test/implementation-harness-bindings-step-3.test.js` so its collision regression continues to require blocking for the incompatible Claude destination while expecting a customized opencode worker entry to survive installation unchanged.

- [x] Add runtime-selection regressions to `test/design-coordinator-worker.test.js` and `test/implementation-harness-bindings-step-3.test.js` that use customized numbered-worker definitions and verify the installed configuration remains the source selected by the existing dispatch fixtures. Keep the tests scoped to the current numbered workers; do not introduce a coordinator profile.

- [x] Verify RED: run `node --test test/install-opencode.test.js test/design-coordinator-worker.test.js test/implementation-harness-bindings-step-3.test.js` - expected: **assertion failure** because the current exact-definition collision pass rejects customized numbered-worker entries.
- [x] **GATE - DO NOT PROCEED to GREEN until RED is verified.** If the tests pass, or fail because of setup, import, compilation, or syntax errors, STOP and report the invalid RED result.

##### GREEN phase (only after RED is verified)

- [x] In `bin/install-flow.js`, remove the now-unused import below:

```js
const { isDeepStrictEqual } = require('util');
```

- [x] Replace `mergeOpencodeAgents` in `bin/install-flow.js` with this add-only implementation. It retains all parse guards and surgical `jsonc-parser` edits, but treats every existing own name as user-owned without inspecting its value:

```js
function mergeOpencodeAgents(text) {
  if (!jsoncParser) {
    return null;
  }
  const { parse, modify, applyEdits } = jsoncParser;
  const errors = [];
  const root = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    return null;
  }
  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    return null;
  }
  if (Object.keys(root).length === 0) {
    return null;
  }
  const hasAgent = Object.prototype.hasOwnProperty.call(root, 'agent');
  if (hasAgent && (root.agent === null || typeof root.agent !== 'object' || Array.isArray(root.agent))) {
    return null;
  }
  const existing = hasAgent ? root.agent : {};
  const formattingOptions = { insertSpaces: true, tabSize: 2 };
  let out = text;
  const added = [];
  const shapes = {
    explore: { mode: 'subagent', model: OPENCODE_PLACEHOLDER_MODEL },
    executor: { mode: 'subagent', model: OPENCODE_PLACEHOLDER_MODEL },
    budget: { mode: 'subagent', model: OPENCODE_PLACEHOLDER_MODEL },
    ...OPENCODE_MANAGED_AGENTS,
  };

  for (const [key, shape] of Object.entries(shapes)) {
    if (Object.prototype.hasOwnProperty.call(existing, key)) {
      continue;
    }
    const edits = modify(
      out,
      ['agent', key],
      shape,
      { formattingOptions }
    );
    out = applyEdits(out, edits);
    added.push(key);
  }
  return { text: out, added };
}
```

- [x] Verify GREEN: run `node --test test/install-opencode.test.js test/design-coordinator-worker.test.js test/implementation-harness-bindings-step-3.test.js` - expected: PASS.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified - the focused command fails with an assertion attributable to customized numbered-worker rejection.
- [x] GREEN verified - `node --test test/install-opencode.test.js test/design-coordinator-worker.test.js test/implementation-harness-bindings-step-3.test.js` passes.
- [x] `node --test test/install-manifest.test.js` - all projection and ordinary collision invariants pass unchanged.

*(No Human checks - installer merge behavior is fully observable through temporary-directory tests and byte comparisons.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required.

#### Step 2: Validate managed agents by name presence

*(Testable step - use RED -> GREEN)*

##### RED phase

- **Rule:** RED contains only doctor tests. Do not change `bin/doctor.js` before RED is verified.

- [x] Extend `test/doctor-harness-inventory.test.js` with temporary opencode configurations covering the authoritative `interfaces.md` scenarios:
  - Every expected managed name is present with customized definitions.
  - One managed name is absent while another customized name remains present.
  - The configuration is absent, unparsable, has a non-object root, or has a non-object `agent` value.

- [x] Assert through the existing JSON doctor output that customized present names are `ok`, missing names are errors identifying the missing name, malformed configurations remain errors, and aggregate exit codes retain their existing semantics.

- [x] Verify RED: run `node --test test/doctor-harness-inventory.test.js` - expected: **assertion failure** because doctor currently deep-compares each present definition with the repository default.
- [x] **GATE - DO NOT PROCEED to GREEN until RED is verified.** If the test passes, or fails because of setup, import, compilation, or syntax errors, STOP and report the invalid RED result.

##### GREEN phase (only after RED is verified)

- [x] In `bin/doctor.js`, remove the now-unused import below:

```js
const { isDeepStrictEqual } = require('util');
```

- [x] Replace `managedOpencodeAgentRecords` in `bin/doctor.js` with the following implementation. Preserve the existing record shape and error severity while making own-name presence the only success predicate:

```js
function managedOpencodeAgentRecords(harness) {
  const section = `[${harness.id}]`;
  const configPath = fs.existsSync(path.join(harness.base, 'opencode.json'))
    ? path.join(harness.base, 'opencode.json')
    : path.join(harness.base, 'opencode.jsonc');
  let root = null;
  let parseFailed = false;
  if (fs.existsSync(configPath)) {
    const errors = [];
    root = jsoncParser.parse(fs.readFileSync(configPath, 'utf8'), errors, { allowTrailingComma: true });
    parseFailed = errors.length > 0 || root === null || typeof root !== 'object' || Array.isArray(root);
  } else {
    parseFailed = true;
  }

  const hasAgentMap = !parseFailed
    && root.agent !== null
    && typeof root.agent === 'object'
    && !Array.isArray(root.agent);

  return Object.keys(flow.OPENCODE_MANAGED_AGENTS).map((key) => {
    if (hasAgentMap && Object.prototype.hasOwnProperty.call(root.agent, key)) {
      return { section, name: key, severity: 'ok', message: `managed opencode agent "${key}" is present` };
    }
    return {
      section,
      name: key,
      severity: 'error',
      message: !hasAgentMap
        ? `missing or malformed opencode agent "${key}"`
        : `missing opencode agent "${key}"`,
      recommendation: 'Re-run the installer to restore the worker',
    };
  });
}
```

- [x] Verify GREEN: run `node --test test/doctor-harness-inventory.test.js` - expected: PASS.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified - the focused doctor suite rejects customized present definitions under the old equality predicate.
- [x] GREEN verified - `node --test test/doctor-harness-inventory.test.js` passes.
- [x] `node --test test/doctor-cli.test.js` - project-health, JSON output, and exit-code behavior remain unchanged.

*(No Human checks - doctor records and exit semantics are covered by deterministic CLI fixtures.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required.

#### Step 3: Align accepted policy and operator guidance

*(Non-testable documentation step - standard format; existing structural tests provide automated verification.)*

- [ ] In `docs/adr/0077-harness-specific-worker-bindings.md`, retain the title, status, structured relationship line, Claude ownership text, alternatives, and related links. Replace the stale opencode paragraphs in `## Decision` with:

```markdown
Opencode declares the logical coordinator runtime in each routed wrapper and uses only the current numbered worker entries: `sai-2-design-worker` and `sai-3-implementation-worker`. The repository definitions are bootstrap defaults for missing names. An existing opencode agent name is user-owned: installation preserves its complete definition without comparison or mutation, doctor accepts its own-name presence in a valid agent map, and runtime dispatch uses its configured model, variant, mode, and permissions.

Claude Code continues to block incompatible worker-file collisions. Opencode adds only absent agent names and never removes configuration entries on uninstall. Copilot receives no routed worker binding and keeps the inline route selected by its wrapper.
```

- [ ] In `docs/adr/0088-implementation-harness-projection-boundaries.md`, keep the manifest and harness projection boundaries unchanged. Replace the final paragraph in `## Decision` with:

```markdown
Installer, doctor, and uninstall consume the same expanded projection graph. Exact-compatible unowned Claude agents remain user-owned, incompatible non-opencode destinations stop without overwrite, and unrelated opencode JSONC content remains unchanged. For opencode agent configuration specifically, an existing own name is preserved without definition comparison and a repository default is inserted only when that name is absent; doctor validates managed workers by name presence in a valid agent map.
```

- [ ] In `docs/adr/0088-implementation-harness-projection-boundaries.md`, replace the opencode consequence that implies exact-compatible collision handling with:

```markdown
- Opencode worker defaults bootstrap missing names, while existing user-owned definitions control runtime behavior.
```

- [ ] In both the Unix and PowerShell manual-install branches of `INSTALL.opencode.md`, add one sentence immediately before the emitted `agent` examples: `Existing agent names are user-owned; keep their definitions unchanged and add repository defaults only for names that are absent.`

- [ ] Replace the second paragraph under `### Managed implementation agents` in `INSTALL.opencode.md` with:

```markdown
Installation preserves every existing agent definition by name and adds the repository default only when a name is absent. Existing `sai-3-implementation-worker` values, including model, variant, mode, and permissions, govern runtime dispatch; Kimi K2.6 is only the bootstrap default for a missing entry. A fully populated configuration is not rewritten. Parseable JSON/JSONC files retain comments, formatting, unrelated entries, and `opencode.json` precedence; malformed roots or agent maps remain unchanged and receive the existing manual-guidance fallback. Claude worker files and ordinary managed destinations retain their collision protection. Uninstall preserves opencode configuration under the existing config-merge exclusion. The opencode routed phases run under the active primary agent, which must permit native question and numbered-worker task dispatch; no separate coordinator profile is installed. Restart opencode after configuration changes.
```

- [ ] Replace the second paragraph under `### Managed design agents` in `INSTALL.opencode.md` with:

```markdown
Installation preserves an existing `sai-2-design-worker` definition by name and adds the GLM 5.2 high-reasoning repository default only when the name is absent. Existing configured model, variant, mode, and permissions govern runtime dispatch. Doctor accepts the present name in a valid agent map and still reports missing names or malformed configuration as errors. Configuration exclusion means uninstall leaves both reused and bootstrapped entries intact. Restart opencode after configuration changes; reinstall after updates to refresh command, instruction, and both design/implementation binding skill files.
```

- [ ] Update the documentation assertions in `test/design-coordinator-worker.test.js` and the final collision-policy assertions in `test/implementation-harness-bindings-step-3.test.js` so they require all of these invariants: both numbered workers are named, existing opencode names are preserved, missing names receive defaults, customized runtime values govern dispatch, no coordinator profile is restored, and Claude/non-opencode collision protection remains documented.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `node --test test/design-coordinator-worker.test.js test/implementation-harness-bindings-step-3.test.js` - documentation and harness-boundary assertions pass.
- [ ] `node --test test/install-opencode.test.js test/doctor-harness-inventory.test.js` - documented ownership behavior matches installer and doctor behavior.
- [ ] `npm test` - full repository suite passes.

*(No Human checks - accepted-policy wording, operator guidance, and cross-harness safeguards are covered by structural and behavioral tests.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required.

## Appendix: Plan vs Final Implementation

This section documents deviations between the original plan and the code that was actually merged.

### Step 1 — Focused test expectations aligned with ownership behavior

**Plan:** Update focused tests for customized opencode workers while retaining Claude and non-opencode collision protection.

**Final:** Updated stale permission and opencode documentation assertions, preserved Claude collision blocking, and populated the byte-identity fixture with all helper and numbered worker names.

**Reason:** The focused suite exposed stale expectations and an incomplete fully populated configuration fixture after the add-only implementation was applied.

### Step 2 — Dedicated doctor fixture and isolated malformed cases

**Plan:** Extend `test/doctor-harness-inventory.test.js` with the managed-agent presence and malformed-configuration scenarios.

**Final:** Added `test/doctor-opencode-agent-preservation-step-2.test.js` for the focused scenarios and cleared both opencode configuration filenames before writing each malformed fixture.

**Reason:** The installer-generated configuration masked test input, and the dedicated fixture kept each malformed case isolated while preserving the existing inventory suite.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | writer | red | 1 | assertion | |
| 1 | implementation | green | 1 | assertion | |
| 1 | writer | green | 3 | assertion | Two focused runs exposed stale assertions; the third passed all 88 tests. |
| 2 | writer | red | 3 | assertion | |
| 2 | implementation | green | 1 | n/a | |
| 2 | writer | green | 1 | n/a | |
