# cyclic-post-setup-menu

## Goal

Make post-setup model customization repeatable, diagnosable, navigable, and non-zero on persistence failure while preserving installer defaults and independent Claude Code/OpenCode adapter behavior.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository default branch dynamically — do not assume `main`. Apply this chain in order:
  1. Run `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` becomes `main`).
  2. Otherwise check which of `main` or `master` exists locally with `git show-ref --verify --quiet refs/heads/<name>`.
  3. If both local branches exist and no remote head resolved, prefer `main`.
  4. If neither exists, or there is no `origin`, treat the current branch as the resolved default branch; skip the base prompt because no distinct default exists.
- Present exactly three options in the user's input language, with English fallback, in this order:
  1. `Suggest branch "cyclic-post-setup-menu"` — the change-name-derived branch (default).
  2. `Stay on current branch "<current-branch>"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- When the selected branch does not already exist — option 1, or an option-3 name that is absent — present this two-option base choice before creating it:
  1. `Base on default branch "<default-branch>"` — pre-selected.
  2. `Base on current branch "<current-branch>"` — use `detached HEAD` when applicable.
- Skip the base choice when option 2 is selected, the selected branch already exists, or the current branch already equals the resolved default branch. In the last case create the new branch directly from the default branch.
- If a new branch is selected, create it from the chosen base branch before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Extend the shared navigator with default single-select legends and an opt-in empty-confirm guard

*(Testable step — use RED → GREEN.)*

##### RED phase

- [x] Add focused failing tests to `test/install-flow-navigator.test.js` for the enabled multi-select empty-confirm guard, the omitted/false legacy behavior, the default `promptSelect` legend, and explicit `null` footer suppression. Use the injected input/output seams so the failures are assertion failures rather than TTY or setup failures.
- [x] Add focused source-contract tests to `test/model-customization-menu.test.js` covering exactly seven production `promptChoice` invocations, exactly three `promptChoice = promptSelect` default bindings, the sole enabled model-checklist guard, the installer call with the guard omitted, and the explicit no-footer post-setup menu binding. The new test scenarios must follow `interfaces.md` Step 1.
- [x] Verify RED: run `node --test test/install-flow-navigator.test.js test/model-customization-menu.test.js` — expected: assertion failures attributable to missing footer forwarding, missing empty-confirm protection, or missing production bindings, with no setup/import/compilation failure.
- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the tests pass or fail for an unrelated setup/import/compilation reason, stop and report the RED result instead of applying the production code.

##### GREEN phase (only after RED is verified)

- [x] Add the default single-select legend constant immediately beside the navigator constants in `bin/install-flow.js`:

```javascript
const DEFAULT_SINGLE_SELECT_LEGEND = 'Up/Down move · Space/Enter confirm · ←/Esc back · q/Ctrl-C cancel';
```

- [x] Replace `runNavigator` in `bin/install-flow.js` with this implementation. It preserves the existing raw-input, redraw, cursor, cancellation, and back behavior; the new guard only refuses an empty multi-select confirmation when explicitly enabled.

```javascript
async function runNavigator({
  mode,
  question,
  options,
  defaultSelected,
  input = process.stdin,
  output = process.stdout,
  footer,
  preventEmptyConfirm = false,
}) {
  if (!input.isTTY) {
    return { status: 'non-interactive' };
  }

  return new Promise((resolve) => {
    const selected = options.map(option => defaultSelected.includes(option));
    let cursor = 0;
    let previousRows = 0;

    function frameLines() {
      const lines = [];
      if (question) lines.push(question);
      options.forEach((option, i) => {
        const marker = mode === 'multi' ? (selected[i] ? '[x]' : '[ ]') : '  ';
        const arrow = i === cursor ? '>' : ' ';
        lines.push(`${arrow} ${marker} ${option}`);
      });
      if (footer) lines.push(footer);
      return lines;
    }

    function render() {
      const lines = frameLines();
      const width = terminalWidth(output);
      let frame = '';
      if (previousRows > 0) {
        frame += `\x1B[${previousRows}A`;
      }
      frame += '\x1B[0J';
      frame += `${lines.join('\n')}\n`;
      output.write(frame);
      previousRows = lines.reduce((total, line) => total + rowsFor(line, width), 0);
    }

    function cleanup() {
      output.write('\x1B[?25h');
      input.removeListener('keypress', onKey);
      releaseRawInput(input);
    }

    function onKey(str, key) {
      if (!key) return;
      if (key.sequence === '\x03' || str === 'q') {
        cleanup();
        resolve({ status: 'cancelled' });
        return;
      }
      if (key.name === 'left' || key.name === 'backspace' || key.name === 'escape') {
        cleanup();
        resolve({ status: 'back' });
        return;
      }
      if (key.name === 'up') {
        cursor = Math.max(0, cursor - 1);
        render();
      } else if (key.name === 'down') {
        cursor = Math.min(options.length - 1, cursor + 1);
        render();
      } else if (str === ' ') {
        if (mode === 'multi') {
          selected[cursor] = !selected[cursor];
          render();
        } else {
          cleanup();
          resolve({ status: 'confirmed', items: [options[cursor]] });
        }
      } else if (key.name === 'return') {
        if (mode === 'multi' && preventEmptyConfirm && !selected.some(Boolean)) {
          return;
        }
        cleanup();
        if (mode === 'multi') {
          resolve({ status: 'confirmed', items: options.filter((_, i) => selected[i]) });
        } else {
          resolve({ status: 'confirmed', items: [options[cursor]] });
        }
      }
    }

    acquireRawInput(input);
    input.on('keypress', onKey);

    output.write('\x1B[?25l');
    render();
  });
}
```

- [x] Replace the two prompt wrappers in `bin/install-flow.js` with these complete signatures and forwarding rules. The installer remains unchanged when it omits both optional arguments; `promptSelect` distinguishes an omitted footer from an explicit `null` footer through its default parameter.

```javascript
function promptChecklist(items, defaultSelected, input, footer, navigatorOptions) {
  return runNavigator({
    mode: 'multi',
    options: items,
    defaultSelected,
    input,
    footer,
    preventEmptyConfirm: navigatorOptions?.preventEmptyConfirm === true,
  });
}

async function promptSelect(
  question,
  options,
  input,
  footer = DEFAULT_SINGLE_SELECT_LEGEND,
) {
  const outcome = await runNavigator({
    mode: 'single',
    question,
    options,
    defaultSelected: [],
    input,
    footer,
  });
  if (outcome.status === 'back') return BACK;
  return outcome.status === 'confirmed' ? outcome.items[0] : null;
}
```

- [x] In `bin/model-customization.js`, change only the post-setup menu binding so the first screen explicitly suppresses its footer while every other existing `promptChoice` call remains on the default single-select legend:

```javascript
const action = await promptChoice(
  'Post-setup customization:',
  MENU_OPTIONS,
  undefined,
  null,
);
```

- [x] Keep the installer `main()` call in `bin/install-flow.js` as `promptChecklist(['Claude Code', 'Opencode'], defaults)` with no navigator-options argument, and keep the model checklist's existing `MODEL_CHECKLIST_LEGEND` positional footer unchanged until Step 2 adds the opt-in guard.
- [x] Verify GREEN: run `node --test test/install-flow-navigator.test.js test/model-customization-menu.test.js` — expected: PASS, including default single-select legend forwarding, explicit footer suppression, enabled empty-confirm refusal, disabled legacy confirmation, installer parity, and the static production-surface counts.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**

- [x] RED verified — `node --test test/install-flow-navigator.test.js test/model-customization-menu.test.js` fails with assertion failures attributable to the missing Step 1 behavior.
- [x] GREEN verified — `node --test test/install-flow-navigator.test.js test/model-customization-menu.test.js` passes.
- [x] `node --test test/navigator-back-navigation.test.js test/navigator-raw-input-session.test.js` — the existing back sentinel, redraw, raw-input reuse, and cleanup behavior remains passing.
- [x] Read the changed production sections and confirm there is exactly one enabled `preventEmptyConfirm` production call, exactly three default `promptSelect` bindings, exactly seven production `promptChoice` invocations, and one explicit `null` menu footer.

**Human (verify in an interactive terminal before committing):**

- [x] Render a single-select model-customization screen and confirm the default legend names Space/Enter confirmation, left-arrow/Esc back, and q/Ctrl-C cancellation; render the first post-setup menu and confirm it has no misleading back footer.
- [x] Deselect every item in the model target checklist and press Enter; confirm the checklist remains open, then select an item and confirm normally. Run the installer first screen separately and confirm its empty selection still reaches `Nothing selected. Exiting.`.

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all terminal checks above, then stage and commit the Step 1 changes before continuing.

#### Step 2: Integrate fresh-state cyclic passes, ordered diagnostics, exhaustive outcomes, and setup exit mapping

*(Testable step — use RED → GREEN.)*

##### RED phase

- [ ] Update `test/model-customization-menu.test.js` with failing assertion-based coverage for fresh later-pass state, successful re-entry, later cancellation without rollback, empty target enumeration, one settings selection per non-empty pass, all selected-target attempts after a persistence failure, skipped/failed outcome-array invariants, mixed diagnostic order, exactly-once diagnostic rendering, persisted-only zero output, settings unavailability, non-TTY early return, and unexpected exception propagation. Update the existing successful-pass fixtures so they explicitly select `Exit` on the fresh menu after the pass.
- [ ] Update `test/navigator-back-navigation.test.js` with failing cycle-aware coverage for menu re-entry, back from each predecessor chain, cancellation from every navigable screen, fresh cursor/selection state, and no materialization on abandoned paths. Keep the input seam and raw-mode lifecycle assertions intact.
- [ ] Update the setup assertions in `test/model-customization-menu.test.js` so injected `persistence-failed` outcomes are non-success and diagnostics are rendered by `runPostSetupMenu`, not by `bin/setup.js`; preserve the existing `post-setup-failure` assertion for unexpected exceptions.
- [ ] Verify RED: run `node --test test/model-customization-menu.test.js test/navigator-back-navigation.test.js` — expected: assertion failures attributable to missing re-entry, missing diagnostic ownership, missing empty-target recovery, or incorrect persistence-failure exit mapping, with no setup/import/compilation failure.
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the tests pass or fail for an unrelated setup/import/compilation reason, stop and report the RED result instead of applying the production code.

##### GREEN phase (only after RED is verified)

- [ ] Replace `buildChecklistTargets` in `bin/model-customization.js` so single-family and combined inventories are sorted at the checklist boundary while preserving worker/command prefixes and family grouping:

```javascript
function buildChecklistTargets(scope, workers, commands) {
  if (scope === 'Workers') return workers.slice().sort();
  if (scope === 'Commands') return commands.slice().sort();
  return [
    ...workers.slice().sort().map(name => `${WORKER_PREFIX}${name}`),
    ...commands.slice().sort().map(name => `${COMMAND_PREFIX}${name}`),
  ];
}
```

- [ ] Replace `materializeLocalOverride` in `bin/model-customization.js` with this complete implementation. It preserves the independent harness roots, atomic replacement, frontmatter validation, and existing `missing-source` reason while attaching the required ordered skip diagnostic:

```javascript
function materializeLocalOverride({
  agentName,
  settings,
  projectPath,
  globalAgentRoot,
  globalCommandRoot,
  harness,
  family = 'worker',
}) {
  const familyDirectory = family === 'command' ? 'commands' : 'agents';
  const localDirectory = harness === 'claude'
    ? path.join(projectPath, '.claude', familyDirectory)
    : path.join(projectPath, '.opencode', familyDirectory);
  const destination = path.join(localDirectory, `${agentName}.md`);
  const tunableKeys = harness === 'claude' ? ['model', 'effort'] : ['model', 'variant'];
  const destinationExists = fs.existsSync(destination);

  let currentText;
  try {
    if (destinationExists) {
      currentText = fs.readFileSync(destination, 'utf8');
    } else {
      const sourceRoot = family === 'command' ? globalCommandRoot : globalAgentRoot;
      const source = path.join(sourceRoot, `${agentName}.md`);
      if (!fs.existsSync(source)) {
        return {
          status: 'skipped',
          agent: agentName,
          reason: 'missing-source',
          diagnostic: `Skipped ${agentName}: installed source is unavailable.`,
        };
      }
      currentText = fs.readFileSync(source, 'utf8');
    }
  } catch (error) {
    return materializationFailure(
      agentName,
      `Unable to read the ${destinationExists ? 'project-local target' : 'installed target'} for ${agentName}: ${error.message}`
    );
  }

  const patchedText = patchFrontmatter(currentText, tunableKeys, settings);
  if (patchedText === null) {
    return materializationFailure(agentName, `Target ${agentName} has no valid frontmatter block.`);
  }

  const writeError = atomicReplace(destination, patchedText);
  if (writeError !== null) {
    return materializationFailure(
      agentName,
      `Unable to persist ${destination}: ${writeError.message}`
    );
  }

  return { status: 'persisted', agent: agentName, destination };
}
```

- [ ] Replace `runPostSetupMenu` in `bin/model-customization.js` with this complete outer-pass implementation. A new inner navigation record and new result arrays are created on every outer iteration, so a completed pass prints its diagnostics once and then re-enters the menu with no adapter, harness, scope, target, settings, outcome, or diagnostic state carried forward. Back and cancellation remain local to the current unmaterialized path; a persistence failure exhausts the selected targets, prints diagnostics, and terminates the loop.

```javascript
async function runPostSetupMenu({
  projectPath = process.cwd(),
  packageRoot = DEFAULT_PACKAGE_ROOT,
  claudeGlobalAgentRoot = DEFAULT_CLAUDE_GLOBAL_AGENT_ROOT,
  opencodeGlobalAgentRoot = DEFAULT_OPENCODE_GLOBAL_AGENT_ROOT,
  claudeGlobalCommandRoot = DEFAULT_CLAUDE_GLOBAL_COMMAND_ROOT,
  opencodeGlobalCommandRoot = DEFAULT_OPENCODE_GLOBAL_COMMAND_ROOT,
  isTTY = process.stdin.isTTY,
  promptChoice = promptSelect,
  promptChecklist = installFlowPromptChecklist,
} = {}) {
  if (!isTTY) return skippedOutcome('non-tty');

  for (;;) {
    let screen = 'menu';
    let adapter = null;
    let harness = null;
    let scope = null;
    let selectedTargets = null;
    let settings = null;

    for (;;) {
      if (screen === 'menu') {
        const action = await promptChoice(
          'Post-setup customization:',
          MENU_OPTIONS,
          undefined,
          null,
        );
        if (action === BACK) continue;
        if (action === null || action === 'Exit') return skippedOutcome('cancelled');
        if (action !== 'Customize models') return skippedOutcome('cancelled');
        screen = 'harness';
        continue;
      }

      if (screen === 'harness') {
        const chosen = await promptChoice('Choose a harness:', HARNESS_OPTIONS);
        if (chosen === BACK) {
          screen = 'menu';
          continue;
        }
        if (chosen === null) return skippedOutcome('cancelled');
        if (chosen !== 'OpenCode' && chosen !== 'Claude Code') return skippedOutcome('cancelled');
        harness = chosen;
        screen = 'scope';
        continue;
      }

      if (screen === 'scope') {
        const chosen = await promptChoice('Choose a customization scope:', SCOPE_OPTIONS);
        if (chosen === BACK) {
          screen = 'harness';
          continue;
        }
        if (chosen === null) return skippedOutcome('cancelled');
        if (!SCOPE_OPTIONS.includes(chosen)) return skippedOutcome('cancelled');
        scope = chosen;
        screen = 'targets';
        continue;
      }

      if (screen === 'targets') {
        adapter = harness === 'OpenCode'
          ? module.exports.createOpencodeAdapter({
            projectPath,
            packageRoot,
            globalAgentRoot: opencodeGlobalAgentRoot,
            globalCommandRoot: opencodeGlobalCommandRoot,
            promptChoice,
          })
          : module.exports.createClaudeAdapter({
            projectPath,
            packageRoot,
            globalAgentRoot: claudeGlobalAgentRoot,
            globalCommandRoot: claudeGlobalCommandRoot,
            promptChoice,
          });
        const workers = adapter.enumerateWorkers();
        const commands = scope === 'Workers' ? [] : adapter.enumerateCommands();
        const targets = buildChecklistTargets(scope, workers, commands);
        if (targets.length === 0) {
          console.log('No customization targets are available for the selected scope.');
          screen = 'scope';
          continue;
        }

        const selection = await promptChecklist(
          targets,
          targets,
          undefined,
          MODEL_CHECKLIST_LEGEND,
          { preventEmptyConfirm: true },
        );
        if (!selection || selection.status === 'cancelled') return skippedOutcome('cancelled');
        if (selection.status === 'non-interactive') return skippedOutcome('non-tty');
        if (selection.status === 'back') {
          screen = 'scope';
          continue;
        }
        if (selection.status !== 'confirmed') return skippedOutcome('cancelled');

        selectedTargets = Array.isArray(selection.items)
          ? selection.items.map(value => parseTarget(value, scope))
          : [];
        if (selectedTargets.length === 0) {
          screen = 'targets';
          continue;
        }
        screen = 'settings';
        continue;
      }

      settings = await adapter.selectSettings(selectedTargets.map(target => target.display).join(', '));
      if (settings === BACK) {
        screen = 'targets';
        continue;
      }
      if (!settings || typeof settings.model !== 'string' || settings.model === '') {
        return skippedOutcome('settings-unavailable');
      }
      break;
    }

    const skippedAgents = [];
    const failedAgents = [];
    const diagnostics = [];
    for (const target of selectedTargets) {
      const result = adapter.createLocalOverride(target, settings);
      if (result.status === 'persisted') continue;
      if (result.status === 'skipped') {
        skippedAgents.push(target.name);
        diagnostics.push(result.diagnostic || `Skipped ${target.name}: installed source is unavailable.`);
        continue;
      }
      if (result.status !== 'persistence-failed') {
        throw new Error(`Unexpected local override outcome for ${target.name}: ${result.status}`);
      }
      if (typeof result.diagnostic !== 'string' || result.diagnostic === '') {
        throw new Error(`Persistence failure for ${target.name} did not include a diagnostic.`);
      }
      failedAgents.push(target.name);
      diagnostics.push(result.diagnostic);
    }

    for (const diagnostic of diagnostics) {
      console.error(`Post-setup customization: ${diagnostic}`);
    }

    if (failedAgents.length > 0) {
      return { status: 'persistence-failed', failedAgents, diagnostics };
    }
  }
}
```

- [ ] Replace `main` in `bin/setup.js` with this complete outcome-mapping implementation. It retains the existing prerequisite/setup workflow and exception path, but removes target-diagnostic rendering and returns `persistence-failed` so the CLI's existing success-only zero-status mapping produces a non-zero process exit.

```javascript
async function main(options = {}) {
  const {
    argv = process.argv,
    createReadline = () => readline.createInterface({ input: process.stdin, output: process.stdout }),
    postSetupWorkflow = async () => {},
    postSetupMenu = modelCustomization.runPostSetupMenu,
  } = options;

  const projectPath = resolvePath(argv);
  const rl = createReadline();

  if (!getPathArg(argv)) {
    const answer = await prompt(rl, `Configure SAI workflow at ${projectPath}? (Y/n) `);
    if (answer.trim().toLowerCase() === 'n') {
      rl.close();
      console.log('Aborted.');
      return 'aborted';
    }
  }

  if (!(await offerOpenspecInstall())) {
    rl.close();
    return 'required-failure';
  }
  await offerCodegraphInstall();
  ensureCodegraphIndex(projectPath);
  const openspecOutcome = await ensureOpenspecDir(projectPath, rl);
  if (openspecOutcome !== 'success') {
    return openspecOutcome;
  }
  const schemaOutcome = await ensureSchemaLine(projectPath, rl);
  if (schemaOutcome !== 'success') {
    return schemaOutcome;
  }

  try {
    copySchemaTemplates(projectPath);
    await postSetupWorkflow({ projectPath, readline: rl });
  } catch (err) {
    rl.close();
    console.error(err);
    return 'post-setup-failure';
  }
  rl.close();

  console.log(`SAI workflow configured at ${projectPath}.`);

  let customizationOutcome;
  try {
    customizationOutcome = await postSetupMenu({ projectPath });
  } catch (err) {
    console.error(err);
    return 'post-setup-failure';
  }

  if (customizationOutcome === undefined) {
    return 'success';
  }

  if (customizationOutcome.status === 'completed'
      || customizationOutcome.status === 'skipped') {
    return 'success';
  }

  if (customizationOutcome.status === 'persistence-failed') {
    return 'persistence-failed';
  }

  console.error(`Unexpected post-setup customization outcome: ${customizationOutcome.status}`);
  return 'post-setup-failure';
}
```

- [ ] Update all cycle-sensitive tests in `test/model-customization-menu.test.js` and `test/navigator-back-navigation.test.js` to use the final `skipped`/`cancelled` result after a scripted `Exit`, while asserting the completed pass through its writes, adapter calls, diagnostics, and next-menu prompt. Do not aggregate a completed pass into the final cancellation result.
- [ ] Verify GREEN: run `node --test test/model-customization-menu.test.js test/navigator-back-navigation.test.js test/install-flow-navigator.test.js test/navigator-raw-input-session.test.js` — expected: PASS, including the fresh outer loop, exact notice, diagnostic ownership, persistence-failure termination, setup status mapping, navigator compatibility, and raw-input behavior.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**

- [ ] RED verified — `node --test test/model-customization-menu.test.js test/navigator-back-navigation.test.js` fails with assertion failures attributable to the missing Step 2 behavior.
- [ ] GREEN verified — `node --test test/model-customization-menu.test.js test/navigator-back-navigation.test.js test/install-flow-navigator.test.js test/navigator-raw-input-session.test.js` passes.
- [ ] `npm test` — the complete Node built-in test suite passes, including `test/canonical-opencode-agent-behavior.test.js` and `test/install-codegraph.test.js`.
- [ ] Inspect `bin/setup.js` and the model-customization tests to confirm `bin/setup.js` contains no `Post-setup customization:` diagnostic renderer and that the only renderer is the per-pass loop in `runPostSetupMenu`.
- [ ] Inspect the durable plan and source contracts to confirm the final outcome uses only `completed`, `skipped` with `cancelled|settings-unavailable|non-tty`, and `persistence-failed`, and that skipped names are omitted from `failedAgents` on a failed pass.

**Human (verify in an interactive terminal before committing):**

- [ ] Complete one customization pass, confirm its diagnostic appears once, confirm the post-setup menu reopens with the first cursor position and all newly enumerated targets selected, then choose `Exit` and confirm process exit code 0 with earlier overrides preserved.
- [ ] Trigger a later persistence failure, confirm remaining selected targets are still attempted, each produced diagnostic appears once in selection order, the menu does not reopen, and the process exits non-zero.
- [ ] Select a scope with no targets and confirm the exact notice appears, the scope selector reopens, no zero-row checklist is rendered, and settings are never requested. Exercise Back and cancellation from harness, scope, target, and settings screens and confirm no abandoned path writes an override.

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Wait for the human to verify all terminal checks above, then stage and commit the Step 2 changes before continuing.
