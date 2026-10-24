'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PassThrough } = require('stream');

const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');
const { enumerateClaude, enumerateOpencode, runDeletion } = require('../bin/uninstall-flow.js');
const { main: doctorMain } = require('../bin/doctor.js');

const repoRoot = path.join(__dirname, '..');

const matrixManifest = loadInstallManifest(path.join(__dirname, '..'));
function matrixBinding(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'binding' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix binding should exist`);
  return item.text;
}

function matrixAgent(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'agent' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix agent should exist`);
  return item.text;
}

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function destinationRoots(base) {
  return {
    commands: path.join(base, 'commands'),
    sai: path.join(base, 'sai'),
    skills: path.join(base, 'skills'),
    agents: path.join(base, 'agents'),
    config: base,
    root: base,
  };
}

function sourcePath(repoRoot, projection) {
  return path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
}

function accessibilityProjections(harness, base) {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  return expandInstallManifest(manifest, {
    harness,
    repoRoot,
    destinationRoot: destinationRoots(base),
  }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker') || /accessibility[\\/]worker\.md$/.test(sourcePath(repoRoot, projection)));
}

function collectOutput() {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  return { out, text: () => Buffer.concat(chunks).toString('utf8') };
}

test('Step 1 accessibility worker card loads the shared audit rules and no shared-orchestration protocol', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');
  assert.match(worker, /Fetch @sai\/commands\/audit\/worker-common\.md/);
  assert.doesNotMatch(worker, /worker-core\.md|bounded-dispatch-retry|verified-precondition-handback/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-7-accessibility-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('accessibility scope, runtime, url, and parent arguments reach the worker as the options of the run', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');
  const claudeWrapper = artifact('commands/claude/sai-7-accessibility.md');
  const opencodeWrapper = artifact('commands/opencode/sai-7-accessibility.md');

  assert.match(coordinator, /one string, `arguments_value`/);
  assert.doesNotMatch(coordinator, /wrapper_echo_value/,
    'the audit coordinator must not construct or forward wrapper_echo_value');
  assert.match(coordinator, /the options of the run exactly as given \(the `--url` value included when one was collected\)/);
  assert.match(claudeWrapper, /command_name:\s*accessibility/);
  assert.match(claudeWrapper, /arguments_value:\s*\$ARGUMENTS/);
  assert.match(opencodeWrapper, /command_name:\s*accessibility/);
  assert.doesNotMatch(opencodeWrapper, /wrapper_echo_value/,
    'the opencode accessibility wrapper must not construct or forward wrapper_echo_value');
  assert.match(opencodeWrapper, /arguments_value:\s*\$ARGUMENTS/);
  for (const wrapper of [claudeWrapper, opencodeWrapper]) {
    assert.match(wrapper.match(/^description:.*$/m)[0], /--url <url>/, 'the wrapper announces --url');
  }
});

test('accessibility review defaults to static-only without a runtime scanner', () => {
  const common = artifact('sai/commands/accessibility/steps/common.md');
  const runtimeStep = artifact('sai/commands/accessibility/steps/resolve-runtime-audit.md');

  assert.match(common, /`--runtime` authorizes the browser-based[\s\S]{0,200}Default:\s*static-only/i);
  assert.match(runtimeStep, /Without `--runtime`, resolve the gate with no scanner/);
});

// ─── Step 2: routed accessibility lifecycle ─────────────────────────────────

test('Step 2 the audit coordinator creates one worker per cycle and never audits itself', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');

  assert.match(coordinator, /Create the audit's worker once for the run/);
  assert.match(coordinator, /The command only audits: it fixes no finding/);
  assert.match(coordinator, /The cycle holds no state outside its own `sai-state` session/);
  assert.match(coordinator, /key: `\{audit\}-\{name\}`/);
  assert.match(coordinator, /commit nothing but this one file/);
  for (const loaded of ['public-chat', 'remember', 'safe-operations', 'tool-resolution', 'finding-state']) {
    assert.match(coordinator, new RegExp(`Fetch @(?:sai/policies|skills)/${loaded}`), `the coordinator loads ${loaded}`);
  }
  for (const forbidden of ['command-runner', 'worker-core', 'bounded-recovery', 'stop-options', 'unattended-runtime-recovery', 'no-commit-guard', 'bounded-dispatch-retry', 'composition']) {
    assert.doesNotMatch(coordinator, new RegExp(`Fetch @[^\\n]*${forbidden}`), `the coordinator must not load ${forbidden}`);
  }
});

test('Step 2 accessibility options, change resolution, and scope ownership', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');
  const options = artifact('sai/commands/accessibility/options.md');
  const common = artifact('sai/commands/accessibility/steps/common.md');

  for (const flag of ['--full', '--path', '--runtime', '--url', '--parent-branch']) {
    assert.ok(options.includes(`\`${flag}`), `options.md declares ${flag}`);
  }
  assert.match(coordinator, /An empty change name takes the only change directory under `openspec\/changes\/`/);
  assert.match(common, /^## Scope$/m);
  assert.match(common, /`--full` audits all UI files in the repo; `--path` audits that path/);
});

test('Step 2 accessibility findings use the closed severity set', () => {
  const common = artifact('sai/commands/accessibility/steps/common.md');
  const worker = artifact('sai/commands/accessibility/worker.md');

  for (const severity of ['Critical', 'High', 'Medium', 'Low', 'Informational']) {
    assert.match(common, new RegExp(`^\\| ${severity} \\|`, 'm'));
  }
  assert.doesNotMatch(common + worker, /\bMajor\b/,
    'the audit carries only the closed Critical/High/Medium/Low/Informational taxonomy');
});

test('Step 2 accessibility worker owns small-scope inspection without mandatory explorer delegation', () => {
  const mapping = artifact('sai/commands/accessibility/steps/map-ui-framework.md');

  assert.match(mapping, /With five or fewer UI files, inspect them directly; delegating is not mandatory/);
});

test('Step 2 accessibility worker delegates large-scope inspection in bounded parallel areas', () => {
  const mapping = artifact('sai/commands/accessibility/steps/map-ui-framework.md');

  assert.match(mapping, /With more than five, delegate per-component scan to \*\*`budget-explorer`\*\* subagents/);
  assert.match(mapping, /in parallel when independent component areas need codebase context/);
  assert.match(mapping, /≤8 per audit/);
});

test('Step 2 runtime mode takes the dev-server URL as an input and asks no server question', () => {
  const runtimeStep = artifact('sai/commands/accessibility/steps/resolve-runtime-audit.md');
  const coordinator = artifact('sai/commands/audit/coordinator.md');
  const options = artifact('sai/commands/accessibility/options.md');

  assert.match(runtimeStep, /against the dev server at `--url`/);
  assert.match(runtimeStep, /Without a `--url` value, or when the URL does not respond, no scanner can run: record the runtime part as unavailable/);
  assert.match(coordinator, /the run has `--runtime` without `--url`, ask the user for the dev-server URL in one question that also lets them decline/);
  assert.match(coordinator, /The URL is an input, not an authorization/);
  assert.match(options, /with `--runtime` and no `--url`, the command asks for it before the audit starts/);
  assert.doesNotMatch(runtimeStep, /server[- ]confirmation/i);
});

test('Step 2 --runtime authorizes every scanner and an unavailable scanner never blocks', () => {
  const runtimeStep = artifact('sai/commands/accessibility/steps/resolve-runtime-audit.md');

  assert.match(runtimeStep, /`--runtime` is the whole authorization: ask no question, and never wait for an answer/);
  for (const command of ['npx @axe-core/cli {url} --exit', 'npx pa11y {url} --reporter cli', 'npx lhci autorun --only-categories=accessibility']) {
    assert.ok(runtimeStep.includes(`\`${command}\``), `${command} is a runtime scanner`);
  }
  assert.match(runtimeStep, /A scanner that is not installed or fails to start is not an obstacle: record it as unavailable/);
  assert.match(runtimeStep, /Never retry a failed command/);
  assert.doesNotMatch(runtimeStep, /authorize-or-skip|needs_input/);
});

test('Step 2 Claude and opencode bindings continue the same worker with the coordinator message', () => {
  for (const [harness, continuation] of [['claude', 'SendMessage(to: "<captured agent ID>"'], ['opencode', 'task(task_id: "<captured task ID>"']]) {
    const binding = matrixBinding(harness, 'accessibility');
    assert.ok(binding.includes(continuation), 'the binding should continue the same worker');
    assert.match(binding, /message: "<message>"|prompt: "<message>"/,
      'the binding should forward the coordinator message');
    assert.doesNotMatch(binding, /sai\/orchestration\/inline-invocation\.md/);
  }
});

test('Step 2 a replacement worker starts from a hand-over note, never from the old worker or its report', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');

  assert.match(coordinator, /a new worker, created the same way as the first/);
  assert.match(coordinator, /It never receives the old worker's history, and it audits from the first step/);
  assert.match(coordinator, /an interrupted run is not resumed/);
  assert.match(coordinator, /no earlier report is read/);
});

test('Step 2 completion writes only accessibility.md and prints the exact completion line', () => {
  const shared = artifact('sai/commands/audit/worker-common.md');
  const close = artifact('sai/commands/accessibility/steps/close-accessibility-outcome.md');
  const coordinator = artifact('sai/commands/audit/coordinator.md');

  assert.match(shared, /Write only the report, `openspec\/changes\/\{change-name\}\/\{audit\}\.md`/);
  assert.match(shared, /`changed_files` holds only the report path when you wrote it/);
  assert.match(close, /`report_path` and `changed_files` name `openspec\/changes\/\{change-name\}\/accessibility\.md`/);
  assert.match(coordinator, /Then end the run with exactly `\{Audit\} audit done\.`/);
  assert.match(coordinator, /`\{Audit\}` is the audit name with a capital initial/);
});

// ─── Step 3: installation and inventory projections ─────────────────────────

test('Step 3 Claude Code and opencode wrappers fetch the shared audit coordinator, which fetches the worker binding', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');
  assert.match(coordinator, /Fetch @sai\/orchestration\/workers\/bindings\/\{audit\}-worker\.md and use it/,
    'the coordinator should load the neutral audit binding');

  const wrappers = [
    ['claude', 'commands/claude/sai-7-accessibility.md', 'claude'],
    ['opencode', 'commands/opencode/sai-7-accessibility.md', 'opencode'],
  ];

  for (const [harness, wrapperPath, bindingHarness] of wrappers) {
    const wrapper = artifact(wrapperPath);
    assert.match(wrapper, /Fetch @sai\/commands\/audit\/coordinator\.md and follow it exactly/,
      `${harness} should fetch the shared audit coordinator`);
    assert.doesNotMatch(wrapper, /command-bootstrap\.md|@sai\/adapters\//,
      `${harness} should load no bootstrap and no boot adapter`);
    assert.match(wrapper, /\$ARGUMENTS/, `${harness} should preserve complete arguments`);
    assert.doesNotMatch(wrapper, /Fetch @skills\/sai-7-accessibility-worker\/SKILL\.md/,
      `${harness} should not load the worker forwarding skill`);
    assert.match(
      matrixBinding(bindingHarness, 'accessibility'),
      /sai-7-accessibility-worker/,
      `${harness} should have the matching accessibility binding`
    );
  }
});

test('Step 3 accessibility manifest projections are deterministic, unique, and harness-specific', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const expected = {
    claude: [
      'sai/commands/accessibility/worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/claude/accessibility-worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/claude/sai-7-accessibility-worker.md',
    ],
    opencode: [
      'sai/commands/accessibility/worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/opencode/accessibility-worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/opencode/sai-7-accessibility-worker.md',
    ],
  };

  for (const [harness, requiredSources] of Object.entries(expected)) {
    const base = tempDir(`sai-accessibility-projections-${harness}-`);
    try {
      const first = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: destinationRoots(base),
      }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker') || /accessibility[\\/]worker\.md$/.test(sourcePath(repoRoot, projection)));
      const second = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: destinationRoots(base),
      }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker') || /accessibility[\\/]worker\.md$/.test(sourcePath(repoRoot, projection)));

      assert.deepEqual(first.map(projection => ({
        source: sourcePath(repoRoot, projection),
        destination: projection.destinationPath,
        strategy: projection.strategy,
      })), second.map(projection => ({
        source: sourcePath(repoRoot, projection),
        destination: projection.destinationPath,
        strategy: projection.strategy,
      })));
       const sources = new Set(first.map(projection => sourcePath(repoRoot, projection)));
       for (const source of requiredSources) assert.ok(sources.has(source), `${harness} should project ${source}`);
       assert.equal(first.some(projection => sourcePath(repoRoot, projection).startsWith('skills/')), false,
         `${harness} should not project an accessibility worker proxy skill`);
      assert.equal(new Set(first.map(projection => projection.destinationPath)).size, first.length,
        `${harness} accessibility destinations should be unique`);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }

});

test('Step 3 accessibility installation overwrites a conflicting Claude destination with notice', () => {
  const base = tempDir('sai-accessibility-collision-');
  const agentPath = path.join(base, 'agents', 'sai-7-accessibility-worker.md');
  const ownerPath = path.join(base, 'agents', '.sai-7-accessibility-worker.owner.json');
  const sentinel = 'unrelated user-owned accessibility agent\n';
  const notices = [];
  const originalLog = console.log;
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, sentinel);
    console.log = message => notices.push(String(message));
    assert.doesNotThrow(() => installClaude(base),
      'installClaude should not throw on a conflicting agent destination');
  } finally {
    console.log = originalLog;
  }
  assert.deepEqual(
    fs.readFileSync(agentPath),
    Buffer.from(matrixAgent('claude', 'accessibility')),
    'the conflicting content should be overwritten with the managed source bytes');
  assert.equal(fs.existsSync(ownerPath), false, 'install must not create ownership metadata');
  assert.ok(notices.some(message => message.includes(agentPath)),
    'the overwrite should be announced with a stdout notice naming the file');
  fs.rmSync(base, { recursive: true, force: true });
});

test('Step 3 doctor and uninstall enumerate accessibility assets from the manifest inventory', () => {
  for (const [harness, install, enumerate] of [
    ['claude', installClaude, enumerateClaude],
    ['opencode', installOpencode, enumerateOpencode],
  ]) {
    const base = tempDir(`sai-accessibility-inventory-${harness}-`);
    try {
      install(base);
      const expected = accessibilityProjections(harness, base).map(projection => projection.destinationPath);
      const actual = enumerate(base)
        .filter(entry => entry.assetType !== 'retired-managed-file' &&
          (entry.dest.includes('accessibility-worker') ||
            /[\\/]commands[\\/]accessibility[\\/]worker\.md$/.test(entry.dest)))
        .map(entry => entry.dest)
        .sort();
      assert.deepEqual(actual, expected.sort(), `${harness} inventory should match manifest projections`);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('Step 3 divergent accessibility agents are overwritten, doctor-clean, and uninstalled', async () => {
  const base = tempDir('sai-accessibility-owned-');
  const projectRoot = tempDir('sai-accessibility-doctor-');
  const agentPath = path.join(base, 'agents', 'sai-7-accessibility-worker.md');
  const ownerPath = path.join(base, 'agents', '.sai-7-accessibility-worker.owner.json');
  const sentinel = 'custom user accessibility agent\n';
  const captured = collectOutput();
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, sentinel);
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');

    assert.doesNotThrow(() => installClaude(base),
      'installClaude should not throw on a divergent agent destination');
    assert.deepEqual(
      fs.readFileSync(agentPath),
      Buffer.from(matrixAgent('claude', 'accessibility')),
      'the divergent agent should be overwritten with the managed source bytes');
    assert.equal(fs.existsSync(ownerPath), false, 'no owner sidecar should exist after install');

    const code = await doctorMain({
      argv: ['--json'],
      projectRoot,
      claudeBase: base,
      opencodeBase: path.join(projectRoot, 'missing-opencode'),
      execOpenspec: () => ({ status: 0, stdout: '1.4.1\n', stderr: '', error: null }),
      out: captured.out,
    });
    assert.equal(code, 0, 'doctor should accept the restored managed agent');
    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(agentPath), false,
      'the body-matching agent should be removed by uninstall');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('Step 3 audit worker results accept only the closed fields', () => {
  const shared = artifact('sai/commands/audit/worker-common.md');
  const worker = artifact('sai/commands/accessibility/worker.md');
  assert.match(worker, /Accessibility Worker/);
  for (const field of ['event: step-done', 'step_ids', 'event: question', 'status: completed', 'status: failed', 'changed_files', 'summary', 'report_path', 'counts']) {
    assert.ok(shared.includes(field), `the worker result should expose ${field}`);
  }
  assert.match(shared, /A result carries no time field and no artifact contents/);
  assert.doesNotMatch(shared, /needs_input|cancelled|continuation identifier/);
});

// ─── Step 5: accessibility-phase progress surfaces ──────────────────────────

test('accessibility worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(
    worker,
    /resolve-accessibility-scope[\s\S]{0,800}map-ui-framework[\s\S]{0,800}resolve-static-audit[\s\S]{0,800}resolve-runtime-audit[\s\S]{0,800}close-accessibility-outcome/,
    'the accessibility worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /`resolve-accessibility-scope` — no file; run inline from the brief and `common\.md`/);
  assert.match(worker, /It reports together with `map-ui-framework`/);
  assert.match(worker, /Without `--runtime`, the batch also carries `resolve-runtime-audit`/);
  assert.match(worker, /When the scope holds no UI file, the audit does not apply, even with `--runtime`: the first batch also carries `resolve-static-audit` and `resolve-runtime-audit`, no scanner runs, and `close-accessibility-outcome` writes the Not Applicable report/);
  assert.match(worker, /pending manual checks/);
  assert.doesNotMatch(worker, /progress event|needs_input/i);
});

// ─── audit-step-gated-instructions (step-gated delivery replicated onto the audit family) ──

const ACCESSIBILITY_STEP_MAP = {
  'resolve-accessibility-scope': null,
  'map-ui-framework': 'sai/commands/accessibility/steps/map-ui-framework.md',
  'resolve-static-audit': 'sai/commands/accessibility/steps/resolve-static-audit.md',
  'resolve-runtime-audit': 'sai/commands/accessibility/steps/resolve-runtime-audit.md',
  'close-accessibility-outcome': 'sai/commands/accessibility/steps/close-accessibility-outcome.md',
};

test('step-gated: the accessibility worker loads steps/common.md at dispatch and executes only the active step', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');
  const shared = artifact('sai/commands/audit/worker-common.md');

  assert.match(worker, /Fetch @sai\/commands\/accessibility\/steps\/common\.md and keep it in force for the entire run/,
    'common.md should load at dispatch as part of the sealed initial surface');
  assert.match(worker, /^## Steps$/m, 'the worker contract should own the plan in one Steps section');
  assert.match(shared, /Fetch the file the pointer names, and skip the fetch when you already loaded it in this session/,
    'the worker executes only the coordinator-named step');
  assert.match(shared, /Run the audit's scope step inline: it has no file/,
    'the fileless first step should run before the first pointer');
  assert.doesNotMatch(worker, /Fetch @sai\/commands\/accessibility\/invocation\.md/,
    'the wholesale invocation fetch chain must be replaced by active-step execution');
  assert.match(shared, /A step you decided to skip because it does not apply is complete: report it in the same batch/,
    'a legitimately skipped stage still advances the pointer past it');
});

test('step-gated: the step library is the only accessibility instruction surface', () => {
  for (const retired of ['instructions.md', 'invocation.md']) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/accessibility', retired)), false,
      `the monolithic accessibility ${retired} is retired`);
  }
  const manifest = JSON.parse(artifact('sai/install-manifest.json'));
  for (const [id, destination] of [
    ['retired-sai-8-accessibility-instructions', 'commands/accessibility/instructions.md'],
    ['retired-sai-8-accessibility-invocation', 'commands/accessibility/invocation.md'],
  ]) {
    const retirement = manifest.retirements.find(record => record.id === id);
    assert.ok(retirement, `the manifest should retire installed copies of ${destination}`);
    assert.equal(retirement.destination.path, destination);
  }
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/accessibility/steps/common.md')),
    'steps/common.md should exist');
  for (const [id, relativePath] of Object.entries(ACCESSIBILITY_STEP_MAP)) {
    if (!relativePath) continue;
    const source = artifact(relativePath);
    assert.notEqual(source, '', `${relativePath} should exist`);
    assert.match(source, new RegExp(`Active step: ${id}\\.`),
      `${relativePath} should name its active step id`);
  }
  assert.match(artifact('sai/commands/accessibility/steps/common.md'), /`resolve-accessibility-scope` has no step file of its own/,
    'common.md should record that resolve-accessibility-scope is fileless');
});

test('accessibility defects: triggers, mapping criterion, markdown definition, no-active-changes literal', () => {
  const mapping = artifact('sai/commands/accessibility/steps/map-ui-framework.md');
  const audit = artifact('sai/commands/accessibility/steps/resolve-static-audit.md');
  const common = artifact('sai/commands/accessibility/steps/common.md');
  assert.match(mapping, /`UI files in scope`, `frameworks detected`, `component types`, `design tokens`, and `accepted trade-offs`, each as a list or `none`/);
  const triggers = [...audit.matchAll(/^Trigger: component types include ([a-z ]+)\.$/gm)].map(m => m[1]);
  assert.deepEqual(triggers, ['forms', 'media', 'dynamic content']);
  for (const type of triggers) {
    assert.ok(mapping.includes('`' + type + '`'), `mapping lists ${type}`);
  }
  assert.match(audit, /every triggered checklist/);
  assert.match(common, /Component-bearing markdown is `\.mdx` files, plus `\.md` files containing an HTML element or a capitalized component tag/);
  assert.match(common, /prefixed `Inferred:`/);
  assert.ok(artifact('sai/commands/audit/coordinator.md').includes('Cannot start {command}: name the change ({candidates, or none}).'));
});
