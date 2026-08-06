'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const childProcess = require('child_process');

const {
  installOpencode,
  copyOpencodeConfig,
  OPENCODE_INSTALL_CMD,
  OPENCODE_MANAGED_AGENTS,
  OPENCODE_REGISTRATION_DEFAULTS,
  getOpencodeManagedAgents,
  __test: { deriveOpencodeAgentCensus },
  probeOpencode,
  runOpencodeInstall,
  promptYesNoReadline,
  offerOpencodeInstall,
} = require('../bin/install-flow.js');
const jsonc = require('jsonc-parser');

const AGENT_PLACEHOLDER = { mode: 'subagent', model: 'opencode-go/deepseek-v4-flash' };
const AGENT_KEYS = ['explore', 'executor', 'budget'];
const CURRENT_CENSUS = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];
const SAI_EXTERNAL_DIRECTORY = '~/.config/opencode/sai/**';
const CENSUS_SCRATCH_DIR = path.join(__dirname, '..', '.tmp', 'derive-opencode-agent-census-from-bindings');
const STEP_2_SCRATCH_DIR = path.join(__dirname, '..', '.tmp', 'deterministic-worker-contract-delivery');
const WORKER_CONTRACT_BY_NAME = {
  'sai-1-spec-proposal-worker': 'spec-worker.md',
  'sai-2-design-worker': 'design-worker.md',
  'sai-3-implementation-worker': 'implementation-worker.md',
  'sai-5-review-worker': 'review-worker.md',
  'sai-6-security-worker': 'security-worker.md',
  'sai-7-performance-worker': 'performance-worker.md',
  'sai-8-accessibility-worker': 'accessibility-worker.md',
};

function expectedWorkerPrompt(workerName) {
  return `Worker contract: Fetch @sai/orchestration/workers/${workerName}.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>`;
}

function expectedRegistrationPrompt(workerName) {
  return `Fetch @sai/orchestration/workers/${workerName}.md and follow it exactly.`;
}

function extractDispatchCalls(source, keyword) {
  return [...source.matchAll(new RegExp(`\\b${keyword}\\s*\\(([\\s\\S]*?)\\)`, 'g'))]
    .map(match => match[1]);
}

function decodePrompt(call) {
  const match = call.match(/\bprompt\s*[:=]\s*"((?:\\.|[^"\\])*)"/);
  assert.ok(match, 'initial dispatch should contain a quoted prompt argument');
  return JSON.parse(`"${match[1]}"`);
}

function writeCensusFixtures(entries) {
  fs.mkdirSync(CENSUS_SCRATCH_DIR, { recursive: true });
  const bindingsDir = fs.mkdtempSync(path.join(CENSUS_SCRATCH_DIR, 'bindings-'));
  for (const [fileName, workerName] of entries) {
    fs.writeFileSync(
      path.join(bindingsDir, fileName),
      `# Direct binding\ntask(subagent_type: "${workerName}", prompt: "${expectedWorkerPrompt(workerName).replaceAll('\n', '\\n')}")\n`,
    );
  }
  return bindingsDir;
}

function censusDefaults(entries) {
  return Object.fromEntries(entries.map(([workerName, registration]) => [workerName, {
    mode: 'subagent',
    prompt: expectedRegistrationPrompt(workerName),
    ...registration,
  }]));
}

test('Step 1 census derives one record per lexically sorted direct binding', () => {
  const bindingsDir = writeCensusFixtures([
    ['02-design.md', 'sai-design-worker'],
    ['01-spec.md', 'sai-spec-worker'],
    ['03-review.md', 'sai-review-worker'],
  ]);
  const defaults = censusDefaults([
    ['sai-spec-worker', { model: 'provider/spec', permission: { task: { '*': 'deny' } } }],
    ['sai-design-worker', { model: 'provider/design', variant: 'high', permission: { task: { explore: 'allow' } } }],
    ['sai-review-worker', { model: 'provider/review', permission: { task: { budget: 'allow' } } }],
  ]);

  assert.deepEqual(deriveOpencodeAgentCensus(bindingsDir, defaults), [
     { name: 'sai-spec-worker', model: 'provider/spec', mode: 'subagent', prompt: expectedRegistrationPrompt('sai-spec-worker'), permission: { task: { '*': 'deny' } } },
     { name: 'sai-design-worker', model: 'provider/design', mode: 'subagent', prompt: expectedRegistrationPrompt('sai-design-worker'), variant: 'high', permission: { task: { explore: 'allow' } } },
     { name: 'sai-review-worker', model: 'provider/review', mode: 'subagent', prompt: expectedRegistrationPrompt('sai-review-worker'), permission: { task: { budget: 'allow' } } },
  ], 'specs/opencode-agent-census/spec.md: direct bindings should produce deterministic records');
});

test('Step 1 census discovers a newly added direct binding with matching defaults', () => {
  const bindingsDir = writeCensusFixtures([['01-existing.md', 'sai-existing-worker']]);
  const defaults = censusDefaults([
    ['sai-existing-worker', { model: 'provider/existing', permission: { task: { '*': 'deny' } } }],
  ]);

  fs.writeFileSync(
    path.join(bindingsDir, '02-added.md'),
    `# Direct binding\ntask(subagent_type: "sai-added-worker", prompt: "${expectedWorkerPrompt('sai-added-worker').replaceAll('\n', '\\n')}")\n`,
  );
  defaults['sai-added-worker'] = {
    mode: 'subagent',
    model: 'provider/added',
    prompt: expectedRegistrationPrompt('sai-added-worker'),
    permission: { task: { explore: 'allow' } },
  };

  assert.deepEqual(
    deriveOpencodeAgentCensus(bindingsDir, defaults).map(record => record.name),
    ['sai-existing-worker', 'sai-added-worker'],
    'specs/opencode-agent-census/spec.md: binding discovery must not require a membership-list edit',
  );
});

test('Step 1 census rejects a binding with zero or multiple declarations', () => {
  const zeroDir = writeCensusFixtures([['zero.md', 'sai-zero-worker']]);
  fs.writeFileSync(path.join(zeroDir, 'zero.md'), '# Direct binding\nno worker declaration\n');
  assert.throws(
    () => deriveOpencodeAgentCensus(zeroDir, {}),
    error => /zero\.md/.test(error.message) && /declaration|dispatch|worker/i.test(error.message),
    'specs/opencode-agent-census/spec.md: zero declarations must identify the binding and declaration problem',
  );

  const multipleDir = writeCensusFixtures([['multiple.md', 'sai-first-worker']]);
  fs.appendFileSync(
    path.join(multipleDir, 'multiple.md'),
    `task(subagent_type: "sai-second-worker", prompt: "${expectedWorkerPrompt('sai-second-worker').replaceAll('\n', '\\n')}")\n`,
  );
  assert.throws(
    () => deriveOpencodeAgentCensus(multipleDir, {}),
    error => /multiple\.md/.test(error.message) && /declaration|multiple/i.test(error.message),
    'specs/opencode-agent-census/spec.md: multiple declarations must identify the binding and declaration problem',
  );
});

test('Step 1 census rejects duplicate worker declarations with both binding paths', () => {
  const bindingsDir = writeCensusFixtures([
    ['01-first.md', 'sai-duplicate-worker'],
    ['02-second.md', 'sai-duplicate-worker'],
  ]);
  assert.throws(
    () => deriveOpencodeAgentCensus(bindingsDir, censusDefaults([
      ['sai-duplicate-worker', { model: 'provider/duplicate', permission: { task: { '*': 'deny' } } }],
    ])),
    error => /sai-duplicate-worker/.test(error.message) && /01-first\.md/.test(error.message) && /02-second\.md/.test(error.message),
    'specs/opencode-agent-census/spec.md: duplicate workers must identify the worker and both binding paths',
  );
});

test('Step 1 census rejects missing registration defaults and orphan defaults', () => {
  const missingDefaultsDir = writeCensusFixtures([['01-derived.md', 'sai-missing-default-worker']]);
  assert.throws(
    () => deriveOpencodeAgentCensus(missingDefaultsDir, {}),
    error => /sai-missing-default-worker/.test(error.message) && /01-derived\.md/.test(error.message),
    'specs/opencode-agent-census/spec.md: a derived worker without defaults must identify the worker and source',
  );

  const orphanDefaultsDir = writeCensusFixtures([['01-bound.md', 'sai-bound-worker']]);
  assert.throws(
    () => deriveOpencodeAgentCensus(orphanDefaultsDir, censusDefaults([
      ['sai-bound-worker', { model: 'provider/bound', permission: { task: { '*': 'deny' } } }],
      ['sai-orphan-worker', { model: 'provider/orphan', permission: { task: { '*': 'deny' } } }],
    ])),
    error => /orphan/i.test(error.message) && /sai-orphan-worker/.test(error.message),
    'specs/opencode-agent-census/spec.md: an unbound default must identify its worker as orphaned',
  );
});

test('Step 2 census rejects malformed quoted prompts with binding-specific diagnostics', () => {
  const bindingsDir = writeCensusFixtures([['malformed-prompt.md', 'sai-malformed-prompt-worker']]);
  fs.writeFileSync(
    path.join(bindingsDir, 'malformed-prompt.md'),
    'task(subagent_type: "sai-malformed-prompt-worker", prompt: "unterminated)\n',
  );
  assert.throws(
    () => deriveOpencodeAgentCensus(bindingsDir, censusDefaults([
      ['sai-malformed-prompt-worker', {
        model: 'provider/malformed',
         prompt: expectedRegistrationPrompt('sai-malformed-prompt-worker'),
        permission: { task: { '*': 'deny' } },
      }],
    ])),
    error => /malformed-prompt\.md/.test(error.message) && /prompt|quoted|syntax/i.test(error.message),
    'specs/opencode-agent-census/spec.md: malformed quoted prompts must identify the binding and prompt syntax',
  );
});

test('Step 2 census rejects a binding whose prompt names a different worker contract', () => {
  const bindingsDir = writeCensusFixtures([['mismatched-contract.md', 'sai-mismatched-contract-worker']]);
  fs.writeFileSync(
    path.join(bindingsDir, 'mismatched-contract.md'),
     `task(subagent_type: "sai-mismatched-contract-worker", prompt: "${expectedWorkerPrompt('sai-other-worker').replaceAll('\n', '\\n')}")\n`,
  );
  assert.throws(
    () => deriveOpencodeAgentCensus(bindingsDir, censusDefaults([
      ['sai-mismatched-contract-worker', {
        model: 'provider/mismatched',
         prompt: expectedRegistrationPrompt('sai-mismatched-contract-worker'),
        permission: { task: { '*': 'deny' } },
      }],
    ])),
    error => /mismatched-contract\.md/.test(error.message) && /contract|prompt|mismatch/i.test(error.message),
    'specs/opencode-agent-census/spec.md: mismatched contracts must identify the binding and mismatch',
  );
});

test('Step 2 census ignores continuation task_id calls when validating initial declarations', () => {
  const bindingsDir = writeCensusFixtures([['continuation.md', 'sai-continuation-worker']]);
  fs.writeFileSync(
    path.join(bindingsDir, 'continuation.md'),
    [
       `task(subagent_type: "sai-continuation-worker", prompt: "${expectedWorkerPrompt('sai-continuation-worker').replaceAll('\n', '\\n')}")`,
      'task(task_id: "existing-task", prompt: "not an initial dispatch")',
      '',
    ].join('\n'),
  );
  assert.doesNotThrow(() => deriveOpencodeAgentCensus(bindingsDir, censusDefaults([
    ['sai-continuation-worker', {
      model: 'provider/continuation',
       prompt: expectedRegistrationPrompt('sai-continuation-worker'),
      permission: { task: { '*': 'deny' } },
    }],
  ])), 'specs/opencode-agent-census/spec.md: continuation task_id calls must not create a second declaration');
});

test('Step 2 resolves the census lazily and isolates malformed bindings to Opencode installation', () => {
  const destination = path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-destination');
  const script = `
    'use strict';
    const fs = require('fs');
    const path = require('path');
    const bindingsDir = path.join(process.cwd(), 'sai', 'orchestration', 'workers', 'bindings', 'opencode');
    const originalReaddirSync = fs.readdirSync;
    fs.readdirSync = (target, ...args) => typeof target === 'string' && path.resolve(target) === path.resolve(bindingsDir)
      ? []
      : originalReaddirSync(target, ...args);
    let flow = null;
    let requireError = null;
    try { flow = require(${JSON.stringify(path.join(__dirname, '..', 'bin', 'install-flow.js'))}); }
    catch (error) { requireError = error.message; }
    const destination = ${JSON.stringify(destination)};
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(destination, { recursive: true });
    const silence = console.log;
    console.log = () => {};
    let claudeError = null;
    let copilotError = null;
    let opencodeError = null;
    try {
      if (!flow) throw new Error('installer module failed to load');
      try { flow.installClaude(${JSON.stringify(path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-claude'))}); } catch (error) { claudeError = error.message; }
      try { flow.installCopilot(
        ${JSON.stringify(path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-copilot-prompts'))},
        ${JSON.stringify(path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-copilot-skills'))},
        ${JSON.stringify(path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-copilot-agents'))},
        ${JSON.stringify(path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-copilot-sai'))}
      ); } catch (error) { copilotError = error.message; }
      try { flow.installOpencode(destination); } catch (error) { opencodeError = error.message; }
    } finally {
      console.log = silence;
    }
    process.stdout.write(JSON.stringify({ requireError, claudeError, copilotError, opencodeError, entries: fs.readdirSync(destination) }));
  `;
  const result = childProcess.spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || 'lazy census boundary probe should run');
  const observation = JSON.parse(result.stdout);
  assert.equal(observation.requireError, null, 'requiring the shared installer should not derive malformed bindings');
  assert.equal(observation.claudeError, null, 'Claude operations should remain loadable when Opencode bindings are malformed');
  assert.equal(observation.copilotError, null, 'Copilot operations should remain loadable when Opencode bindings are malformed');
  assert.match(observation.opencodeError || '', /default|census|worker|registration/i,
    'Opencode installation should fail with an actionable census/default diagnostic');
  assert.deepEqual(observation.entries, [], 'Opencode installation should fail before destination mutation');
});

test('Step 1 census preserves distinct registration fields without common-default normalization', () => {
  const bindingsDir = writeCensusFixtures([
    ['01-one.md', 'sai-one-worker'],
    ['02-two.md', 'sai-two-worker'],
  ]);
  const defaults = censusDefaults([
    ['sai-one-worker', {
      model: 'provider/one',
      permission: { task: { '*': 'deny', explore: 'allow' } },
    }],
    ['sai-two-worker', {
      model: 'provider/two',
      variant: 'high',
      permission: { task: { '*': 'allow', budget: 'deny' } },
    }],
  ]);

  assert.deepEqual(deriveOpencodeAgentCensus(bindingsDir, defaults), [
     {
       name: 'sai-one-worker',
       model: 'provider/one',
       mode: 'subagent',
       prompt: expectedRegistrationPrompt('sai-one-worker'),
       permission: { task: { '*': 'deny', explore: 'allow' } },
    },
    {
       name: 'sai-two-worker',
       model: 'provider/two',
       mode: 'subagent',
       prompt: expectedRegistrationPrompt('sai-two-worker'),
       variant: 'high',
      permission: { task: { '*': 'allow', budget: 'deny' } },
    },
  ], 'specs/opencode-agent-census/spec.md and specs/managed-worker-registry/spec.md: registration fields must survive the join');
});

test('Step 1 census accessor projects the ordered repository census by worker name', () => {
  assert.ok(Object.keys(OPENCODE_REGISTRATION_DEFAULTS).length > 0,
    'specs/opencode-agent-census/spec.md: repository registration defaults should be populated');
  const agents = getOpencodeManagedAgents();
  assert.deepEqual(Object.keys(agents), [
    'sai-8-accessibility-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-7-performance-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-1-spec-proposal-worker',
  ], 'specs/opencode-agent-census/spec.md: object insertion order must follow binding-path order');
  for (const [name, registration] of Object.entries(agents)) {
    assert.equal(registration.mode, 'subagent', `${name} should use subagent mode`);
    assert.equal(typeof registration.model, 'string', `${name} should preserve its model`);
    assert.ok(registration.permission && registration.permission.task,
      `specs/managed-worker-registry/spec.md: ${name} should preserve task permission values`);
  }
});

test('Step 2 census contains exactly every current worker name', () => {
  assert.deepEqual(Object.keys(getOpencodeManagedAgents()).sort(), [...CURRENT_CENSUS].sort(),
    'specs/opencode-agent-census/spec.md: the derived census must contain exactly the current workers');
});

test('Step 2 registration records expose the exact canonical worker prompts', () => {
  for (const workerName of CURRENT_CENSUS) {
     const prompt = expectedRegistrationPrompt(workerName);
    assert.equal(OPENCODE_REGISTRATION_DEFAULTS[workerName].prompt, prompt,
      `specs/opencode-worker-system-prompt/spec.md: ${workerName} defaults should use the canonical Fetch prompt`);
    assert.equal(OPENCODE_MANAGED_AGENTS[workerName].prompt, prompt,
      `specs/opencode-worker-system-prompt/spec.md: ${workerName} managed registration should use the canonical Fetch prompt`);
     assert.equal(OPENCODE_MANAGED_AGENTS[workerName].prompt.startsWith('Fetch @sai/orchestration/workers/'), true,
       `${workerName} should use the Fetch prompt without a registration preamble`);
  }
});

test('Step 2 initial Opencode task dispatches deliver the matching contract and preserve continuations', () => {
  fs.mkdirSync(STEP_2_SCRATCH_DIR, { recursive: true });
  const scratchDir = fs.mkdtempSync(path.join(STEP_2_SCRATCH_DIR, 'opencode-dispatch-'));
  try {
    const installDir = path.join(scratchDir, 'opencode');
    fs.mkdirSync(installDir, { recursive: true });
    installOpencode(installDir);
    for (const workerName of CURRENT_CENSUS) {
      const bindingName = WORKER_CONTRACT_BY_NAME[workerName];
      const bindingPath = path.join(installDir, 'sai', 'orchestration', 'workers', 'bindings', bindingName);
      const calls = extractDispatchCalls(fs.readFileSync(bindingPath, 'utf8'), 'task');
      const initial = calls.filter(call => !/\btask_id\s*[:=]/.test(call));
      const continuations = calls.filter(call => /\btask_id\s*[:=]/.test(call));

      assert.equal(initial.length, 1, `${workerName} should have one initial task dispatch`);
      assert.equal(decodePrompt(initial[0]), expectedWorkerPrompt(workerName),
        `specs/worker-dispatch-prompt-template/spec.md: ${workerName} should receive its matching worker contract`);
      assert.match(decodePrompt(initial[0]), /InvocationEnvelope:\n<original InvocationEnvelope>$/,
        `${workerName} should preserve the opaque InvocationEnvelope slot`);
      assert.ok(continuations.length > 0, `${workerName} should retain a continuation task dispatch`);
       for (const continuation of continuations) {
         assert.match(continuation, /\bprompt\s*[:=]\s*"<selected value>"/,
           `${workerName} continuation dispatch should retain its existing prompt shape`);
       }
    }
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
});

test('Step 2 config merge adds absent prompts, preserves custom prompts, and is byte-idempotent', () => {
  fs.mkdirSync(STEP_2_SCRATCH_DIR, { recursive: true });
  const scratchDir = fs.mkdtempSync(path.join(STEP_2_SCRATCH_DIR, 'opencode-config-'));
  const configPath = path.join(scratchDir, 'opencode.jsonc');
  const customPrompt = 'User-owned prompt must remain unchanged';
  const fixture = [
    '// preserve this comment',
    JSON.stringify({
      displayName: 'unrelated project',
      plugin: ['unrelated-plugin'],
      agent: {
        'sai-1-spec-proposal-worker': { mode: 'subagent', model: 'user-spec' },
        'sai-2-design-worker': { mode: 'subagent', model: 'user-design', prompt: customPrompt },
      },
    }, null, 2),
    '',
  ].join('\n');
  try {
    fs.writeFileSync(configPath, fixture);
    copyOpencodeConfig(scratchDir);
    const firstRaw = fs.readFileSync(configPath, 'utf8');
    const first = jsonc.parse(firstRaw);
     assert.equal(first.agent['sai-1-spec-proposal-worker'].prompt,
       expectedRegistrationPrompt('sai-1-spec-proposal-worker'));
    assert.equal(first.agent['sai-2-design-worker'].prompt, customPrompt,
      'specs/opencode-worker-system-prompt/spec.md: non-empty custom prompts should remain unchanged');
    assert.equal(first.displayName, 'unrelated project');
    assert.deepEqual(first.plugin, ['unrelated-plugin']);
    assert.match(firstRaw, /preserve this comment/);
     for (const workerName of CURRENT_CENSUS) {
       if (workerName === 'sai-2-design-worker') continue;
       assert.equal(first.agent[workerName].prompt, expectedRegistrationPrompt(workerName),
        `specs/opencode-worker-system-prompt/spec.md: ${workerName} should have its exact prompt after merge`);
    }
    copyOpencodeConfig(scratchDir);
    assert.equal(fs.readFileSync(configPath, 'utf8'), firstRaw,
      'specs/opencode-worker-system-prompt/spec.md: a second install should be byte-identical');
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig preserves a fixed configured output independently of registry values', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-baseline-'));
  const baseline = [
    '{',
    '  "theme": "custom",',
    '  "permission": {',
    '    "bash": "deny",',
    '    "external_directory": {',
    '      "~/.config/opencode/sai/**": "allow"',
    '    }',
    '  },',
    '  "agent": {',
    '    "explore": { "mode": "subagent", "model": "user-explore" },',
    '    "executor": { "mode": "subagent", "model": "user-executor" },',
    '    "budget": { "mode": "subagent", "model": "user-budget" },',
     `    "sai-1-spec-proposal-worker": { "mode": "subagent", "model": "user-spec", "prompt": "${expectedRegistrationPrompt('sai-1-spec-proposal-worker')}" },`,
     `    "sai-3-implementation-worker": { "mode": "subagent", "model": "user-implementation", "prompt": "${expectedRegistrationPrompt('sai-3-implementation-worker')}" },`,
     `    "sai-2-design-worker": { "mode": "subagent", "model": "user-design", "prompt": "${expectedRegistrationPrompt('sai-2-design-worker')}" },`,
     `    "sai-5-review-worker": { "mode": "subagent", "model": "user-review", "prompt": "${expectedRegistrationPrompt('sai-5-review-worker')}" },`,
    '    "sai-6-security-worker": {',
    '      "mode": "subagent",',
    '      "model": "opencode-go/glm-5.2",',
    '      "variant": "high",',
     `      "prompt": "${expectedRegistrationPrompt('sai-6-security-worker')}",`,
    '      "permission": {',
    '        "task": {',
    '          "*": "deny",',
    '          "budget": "allow",',
    '          "explore": "allow"',
    '        }',
    '      }',
    '    },',
    '    "sai-7-performance-worker": {',
    '      "mode": "subagent",',
    '      "model": "opencode-go/glm-5.2",',
    '      "variant": "high",',
     `      "prompt": "${expectedRegistrationPrompt('sai-7-performance-worker')}",`,
    '      "permission": {',
    '        "task": {',
    '          "*": "deny",',
    '          "budget": "allow",',
    '          "explore": "allow"',
    '        }',
    '      }',
    '    },',
    '    "sai-8-accessibility-worker": {',
    '      "mode": "subagent",',
    '      "model": "opencode-go/qwen3.7-plus",',
     `      "prompt": "${expectedRegistrationPrompt('sai-8-accessibility-worker')}",`,
    '      "permission": {',
    '        "task": {',
    '          "*": "deny",',
    '          "budget": "allow",',
    '          "explore": "allow"',
    '        }',
    '      }',
    '    }',
    '  }',
    '}',
  ].join('\n') + '\n';
  const configPath = path.join(tmpDir, 'opencode.json');
  try {
    fs.writeFileSync(configPath, baseline);
    copyOpencodeConfig(tmpDir);
    assert.deepEqual(fs.readFileSync(configPath, 'utf8'), baseline,
      'the known pre-refactor baseline should remain byte-identical');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installOpencode copies commands/opencode/*.md to dest/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  const cmdDir = path.join(tmpDir, 'commands');
  assert.ok(fs.existsSync(cmdDir), 'commands/ dir should exist');
  const files = fs.readdirSync(cmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in commands/');
  const design = fs.readFileSync(path.join(cmdDir, 'sai-2-design.md'), 'utf8');
   assert.match(design, /^model: opencode-go\/glm-5\.2$/m);
   assert.match(design, /^variant: high$/m);
   assert.match(design, /^subtask: false$/m);
   assert.doesNotMatch(design, /^agent:/m);
  assert.ok(design.includes('**Change-name argument and and optional flags:** $ARGUMENTS'));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode projects grouped SAI command assets and excludes former coordinator sources', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  for (const file of [path.join('design', 'coordinator.md'), path.join('design', 'invocation.md'), path.join('implement', 'coordinator.md'), path.join('implement', 'invocation.md')]) {
    assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'commands', file)), `${file} should be projected`);
  }
  for (const file of ['sai-2-design.md', 'sai-3-implement.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'commands', file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode copies all standalone policies to dest/sai/policies/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  for (const file of ['artifact-feedback-gate.md', 'change-picker.md', 'commit-rules.md', 'prereqs.md', 'status-picker.md']) {
    assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'policies', file)), `${file} should be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode projects the canonical ADR template and removes former compatibility destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'instructions', '_templates', 'adr-index.md')));
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', '_templates', 'adr-index.md')), false);
  for (const file of ['sai-2-design-core.md', 'sai-3-implementation-core.md', 'implement-invocation.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode does not project the Copilot inline orchestration adapter', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'inline-invocation.md')), false);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode copies all Opencode-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-subagent', 'SKILL.md')), 'skills/budget-subagent/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Opencode');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Step 3 fresh opencode install omits all routed worker proxy skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-no-proxies-'));
  try {
    installOpencode(tmpDir);
    for (const worker of CURRENT_CENSUS) {
      assert.equal(fs.existsSync(path.join(tmpDir, 'skills', worker, 'SKILL.md')), false,
        `${worker} proxy skill should not be installed`);
      assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', `${worker
        .replace('sai-1-spec-proposal-worker', 'spec-worker')
        .replace('sai-2-design-worker', 'design-worker')
        .replace('sai-3-implementation-worker', 'implementation-worker')
        .replace('sai-5-review-worker', 'review-worker')
        .replace('sai-6-security-worker', 'security-worker')
        .replace('sai-7-performance-worker', 'performance-worker')
        .replace('sai-8-accessibility-worker', 'accessibility-worker')}.md`)));
    }
    const configName = fs.existsSync(path.join(tmpDir, 'opencode.json')) ? 'opencode.json' : 'opencode.jsonc';
    const config = jsonc.parse(fs.readFileSync(path.join(tmpDir, configName), 'utf8'));
    for (const worker of CURRENT_CENSUS) assert.deepEqual(config.agent[worker], OPENCODE_MANAGED_AGENTS[worker]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installOpencode projects the routed spec coordinator and neutral binding', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-spec-'));
  try {
    installOpencode(tmpDir);
    for (const file of [
       path.join('sai', 'commands', 'spec', 'coordinator.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'spec-worker.md'),
    ]) assert.ok(fs.existsSync(path.join(tmpDir, file)), `${file} should be projected`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installOpencode projects every routed binding into neutral destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-neutral-bindings-'));
  const workers = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
  try {
    installOpencode(tmpDir);
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', 'opencode')), false);
    for (const worker of workers) {
      const destination = path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', `${worker}-worker.md`);
      const source = path.join(__dirname, '..', 'sai', 'orchestration', 'workers', 'bindings', 'opencode', `${worker}-worker.md`);
      assert.equal(fs.existsSync(destination), true, `${worker} binding should use a neutral destination`);
      assert.deepEqual(fs.readFileSync(destination), fs.readFileSync(source), `${worker} binding should match opencode source`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('opencode worker registration is preserved and configurable', () => {
  assert.deepEqual(OPENCODE_MANAGED_AGENTS['sai-5-review-worker'], {
    mode: 'subagent',
    model: 'opencode-go/glm-5.2',
    variant: 'high',
    permission: { task: { '*': 'deny', budget: 'allow', explore: 'allow' } },
     prompt: expectedRegistrationPrompt('sai-5-review-worker'),
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-review-worker-'));
  const custom = {
    mode: 'subagent',
    model: 'user-review-model',
    variant: 'low',
    permission: { task: { '*': 'allow' } },
  };
  try {
    fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ agent: {
      'sai-5-review-worker': custom,
    } }, null, 2));
    copyOpencodeConfig(tmpDir);
    const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
     assert.deepEqual(parsed.agent['sai-5-review-worker'], { ...custom, prompt: expectedRegistrationPrompt('sai-5-review-worker') },
      'an existing review worker registration should remain configurable');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('opencode managed agents are derived from registry metadata', () => {
  assert.deepEqual(Object.keys(OPENCODE_MANAGED_AGENTS).sort(), [...CURRENT_CENSUS].sort(),
    'specs/opencode-agent-census/spec.md: the exported managed object must use the complete census');
  assert.deepEqual(OPENCODE_MANAGED_AGENTS, getOpencodeManagedAgents(),
    'specs/opencode-agent-census/spec.md: the export must retain the accessor census');
  for (const name of CURRENT_CENSUS) {
    const registration = OPENCODE_MANAGED_AGENTS[name];
    const defaults = OPENCODE_REGISTRATION_DEFAULTS[name];
    assert.equal(registration.mode, 'subagent', `${name} should use subagent mode`);
    assert.equal(registration.model, defaults.model, `${name} should use canonical model defaults`);
    if (Object.hasOwn(defaults, 'variant')) assert.equal(registration.variant, defaults.variant, `${name} should use canonical variant defaults`);
    else assert.equal(Object.hasOwn(registration, 'variant'), false, `${name} should not invent a variant`);
    assert.deepEqual(registration.permission?.task, defaults.permission?.task, `${name} should use canonical task permissions`);
  }
});

test('Step 2 fresh and repeated installation preserves the fixed registration output', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-derived-'));
  try {
    installOpencode(tmpDir);
    const configName = fs.existsSync(path.join(tmpDir, 'opencode.json')) ? 'opencode.json' : 'opencode.jsonc';
    const configPath = path.join(tmpDir, configName);
    const firstRaw = fs.readFileSync(configPath, 'utf8');
    const first = jsonc.parse(firstRaw);
    assert.deepEqual(Object.keys(first.agent).sort(), [...AGENT_KEYS, ...CURRENT_CENSUS].sort());
    for (const name of CURRENT_CENSUS) {
      assert.equal(Object.hasOwn(first.agent, name), true, `${name} should be seeded`);
      assert.deepEqual(first.agent[name], OPENCODE_MANAGED_AGENTS[name], `${name} should use canonical seed defaults`);
    }
    installOpencode(tmpDir);
    assert.equal(fs.readFileSync(configPath, 'utf8'), firstRaw);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 2 preserves compatible customized registrations and unrelated user configuration', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-derived-custom-'));
  const fixture = [
    '// preserve this comment',
    JSON.stringify({
      theme: 'user-theme',
      permission: {
        bash: 'deny',
        external_directory: { [SAI_EXTERNAL_DIRECTORY]: 'allow', '*.md': 'ask' },
      },
      plugin: ['user-plugin'],
      agent: {
        explore: { mode: 'subagent', model: 'user-explore' },
        executor: { mode: 'subagent', model: 'user-executor' },
        budget: { mode: 'subagent', model: 'user-budget' },
        custom: { mode: 'subagent', model: 'user-custom' },
        'sai-3-implementation-worker': {
          mode: 'subagent',
          model: 'user-implementation',
          permission: { task: { '*': 'allow' } },
        },
        'sai-2-design-worker': {
          mode: 'subagent',
          model: 'user-design',
          variant: 'low',
          description: 'user-owned design runtime',
        },
        'sai-5-review-worker': {
          mode: 'subagent',
          model: 'user-review',
          variant: 'medium',
        },
        'sai-6-security-worker': {
          mode: 'subagent',
          model: 'user-security',
          variant: 'low',
        },
        'sai-7-performance-worker': {
          mode: 'subagent',
          model: 'user-performance',
          variant: 'low',
        },
         'sai-8-accessibility-worker': {
           mode: 'subagent',
           model: 'user-accessibility',
           variant: 'low',
         },
      },
    }, null, 2),
    '',
  ].join('\n');
  const configPath = path.join(tmpDir, 'opencode.jsonc');
  try {
    fs.writeFileSync(configPath, fixture);
    copyOpencodeConfig(tmpDir);
    const parsed = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    assert.deepEqual(parsed.agent['sai-2-design-worker'], {
      mode: 'subagent',
      model: 'user-design',
      variant: 'low',
      description: 'user-owned design runtime',
       prompt: expectedRegistrationPrompt('sai-2-design-worker'),
    });
    assert.equal(Object.hasOwn(parsed.agent, 'sai-1-spec-proposal-worker'), true,
      'specs/installer-config-guidance/spec.md: absent census workers should be added');
    const afterFirst = fs.readFileSync(configPath, 'utf8');
    copyOpencodeConfig(tmpDir);
    assert.equal(fs.readFileSync(configPath, 'utf8'), afterFirst);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Installation verification covers routed review parity', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-review-parity-'));
  try {
    installOpencode(tmpDir);
    const configName = fs.existsSync(path.join(tmpDir, 'opencode.json')) ? 'opencode.json' : 'opencode.jsonc';
    const config = jsonc.parse(fs.readFileSync(path.join(tmpDir, configName), 'utf8'));
    assert.deepEqual(config.agent['sai-5-review-worker']?.permission?.task, {
      '*': 'deny', budget: 'allow', explore: 'allow',
    }, 'missing review permission should identify the review surface');
     assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', 'review-worker.md')),
      'missing review projection should identify the opencode review binding');
     assert.equal(fs.existsSync(path.join(tmpDir, 'skills', 'sai-5-review-worker', 'SKILL.md')), false,
       'review worker proxy skill should not be installed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig copies config when no existing config', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  try {
    copyOpencodeConfig(tmpDir);
    const configPath = path.join(tmpDir, 'opencode.jsonc');
    assert.ok(fs.existsSync(configPath), 'opencode.jsonc should be copied when none exists');
    const config = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    for (const name of CURRENT_CENSUS) assert.equal(Object.hasOwn(config.agent, name), true, `${name} should be seeded`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig skips copy and prints instructions when opencode.jsonc exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), '{}');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg) + '\n'; };
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'), '{}', 'existing config should not be overwritten');
  assert.ok(printed.includes('"agent"'), 'should print manual instructions containing "agent"');
  assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig skips copy and prints instructions when opencode.json exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), '{}');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg) + '\n'; };
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(printed.includes('"agent"'), 'should print manual instructions when opencode.json exists');
  assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Step 2 installer guidance serializes the complete worker-keyed agent map', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-guidance-'));
  const messages = [];
  const originalLog = console.log;
  try {
    fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), '{}');
    console.log = message => messages.push(String(message));
    copyOpencodeConfig(tmpDir);
  } finally {
    console.log = originalLog;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  const guidance = messages.join('\n');
  assert.match(guidance, /"agent"\s*:\s*\{/,
    'specs/installer-config-guidance/spec.md: guidance should show an agent-map object');
  for (const name of CURRENT_CENSUS) {
    assert.match(guidance, new RegExp(`"${name}"\\s*:`),
      `specs/installer-config-guidance/spec.md: guidance should name ${name}`);
  }
});

test('installOpencode overwrites existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old sentinel content');
  installOpencode(tmpDir);
  const expected = fs.readFileSync(path.join(__dirname, '..', 'commands', 'opencode', 'sai-1-spec.md'), 'utf8');
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), expected, 'existing vendor command should be overwritten with repo version');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode overwrites stale command wrappers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  installOpencode(tmpDir);
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing stale file should be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Step 2: Agent key merge tests ---

test('copyOpencodeConfig inserts agent keys into opencode.json when no agent exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.ok(parsed.agent, 'agent block should exist');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be inserted`);
  }
  assert.ok(!fs.existsSync(path.join(tmpDir, 'opencode.jsonc')), 'should not create opencode.jsonc');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig inserts agent keys into opencode.jsonc when no agent exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), JSON.stringify({ theme: 'dark' }));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'));
  assert.ok(parsed.agent, 'agent block should exist in opencode.jsonc');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be inserted into opencode.jsonc`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig merges only opencode.json when both files exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  const jsoncContent = JSON.stringify({ theme: 'light' });
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), jsoncContent);
  const beforeJsoncBytes = Buffer.from(jsoncContent, 'utf8');
  copyOpencodeConfig(tmpDir);
  const jsonParsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.ok(jsonParsed.agent, 'agent should exist in opencode.json after merge');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(jsonParsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be added to opencode.json`);
  }
  const afterJsoncBytes = fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'));
  assert.deepEqual(afterJsoncBytes, beforeJsoncBytes, 'opencode.jsonc should remain untouched');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves comments and unrelated keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const fixture = '{\n  // preserve this comment\n  "theme": "dark"\n}\n';
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), fixture);
  copyOpencodeConfig(tmpDir);
  const raw = fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8');
  assert.ok(raw.includes('// preserve this comment'), 'comment text should survive');
  assert.ok(raw.includes('"theme"'), 'theme key should survive');
  const parsed = jsonc.parse(raw);
  assert.equal(parsed.theme, 'dark', 'theme value should be unchanged');
  assert.deepEqual(Object.keys(parsed).sort(), ['agent', 'permission', 'theme'].sort(), 'only agent, permission, and theme should be top-level keys');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be added`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves non-target agent children', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { custom: { mode: 'subagent', model: 'my-model' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.deepEqual(parsed.agent.custom, { mode: 'subagent', model: 'my-model' }, 'agent.custom should survive');
  for (const key of AGENT_KEYS) {
    assert.ok(key in parsed.agent, `agent.${key} should exist alongside custom`);
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be inserted alongside custom`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig does not overwrite existing target key', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { explore: { mode: 'subagent', model: 'my-custom-model' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.deepEqual(parsed.agent.explore, { mode: 'subagent', model: 'my-custom-model' }, 'existing explore should not be overwritten');
  assert.ok('executor' in parsed.agent, 'executor should be present');
  assert.deepEqual(parsed.agent.executor, AGENT_PLACEHOLDER, 'executor should be inserted');
  assert.ok('budget' in parsed.agent, 'budget should be present');
  assert.deepEqual(parsed.agent.budget, AGENT_PLACEHOLDER, 'budget should be inserted');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig is idempotent when fully configured with all agents', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { permission: { external_directory: { [SAI_EXTERNAL_DIRECTORY]: 'allow' } }, agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  for (const [key, shape] of Object.entries(OPENCODE_MANAGED_AGENTS)) config.agent[key] = JSON.parse(JSON.stringify(shape));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const beforeBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  copyOpencodeConfig(tmpDir);
  const afterBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  assert.deepEqual(afterBytes, beforeBytes, 'file should be unchanged when fully configured');
  copyOpencodeConfig(tmpDir);
  const secondRunBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  assert.deepEqual(secondRunBytes, afterBytes, 'second run should produce identical bytes');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode preserves commented JSONC with compatible namespaced agents', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const configPath = path.join(tmpDir, 'opencode.jsonc');
  const config = {
    displayName: 'unrelated project',
    permission: { external_directory: { [SAI_EXTERNAL_DIRECTORY]: 'allow' } },
    agent: Object.fromEntries([
      ...AGENT_KEYS.map(key => [key, { ...AGENT_PLACEHOLDER }]),
      ...Object.entries(OPENCODE_MANAGED_AGENTS),
    ]),
  };
  const fixture = `// preserve this comment\n${JSON.stringify(config, null, 2)}\n`;
  try {
    fs.writeFileSync(configPath, fixture);
    installOpencode(tmpDir);
    assert.deepEqual(fs.readFileSync(configPath, 'utf8'), fixture, 'compatible namespaced JSONC should remain byte-identical');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig prints add-notice naming only added keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { explore: { mode: 'subagent', model: 'opencode-go/deepseek-v4-flash' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  const addedLines = messages.filter(m => /added/i.test(m));
  assert.ok(addedLines.some(l => l.includes('executor')), 'should name executor as added');
  assert.ok(addedLines.some(l => l.includes('budget')), 'should name budget as added');
  assert.ok(!addedLines.some(l => l.includes('explore')), 'should NOT name explore as added');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig prints no add-notice when nothing added', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  for (const [key, shape] of Object.entries(OPENCODE_MANAGED_AGENTS)) config.agent[key] = JSON.parse(JSON.stringify(shape));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(!messages.some(m => /added/i.test(m)), 'should not print any add-notice');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Step 1 live-probe blocker regression: legacy three-agent placeholder gets managed agents ---

test('copyOpencodeConfig adds managed agents to legacy three-agent placeholder config', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.ok(parsed.agent, 'agent block should exist');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `legacy agent ${key} should be preserved`);
  }
  for (const [key, shape] of Object.entries(OPENCODE_MANAGED_AGENTS)) {
    assert.ok(key in parsed.agent, `managed agent ${key} should be added`);
    assert.deepEqual(parsed.agent[key], shape, `managed agent ${key} should have exact shape`);
  }
  assert.equal(Object.keys(parsed.agent).length, AGENT_KEYS.length + Object.keys(OPENCODE_MANAGED_AGENTS).length,
    'total agent keys should equal legacy + managed');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves comments and unrelated keys during legacy-to-managed migration', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const fixture = '{\n  // user comment\n  "displayName": "my-project",\n  "agent": {\n    "explore": { "mode": "subagent", "model": "opencode-go/deepseek-v4-flash" },\n    "executor": { "mode": "subagent", "model": "opencode-go/deepseek-v4-flash" },\n    "budget": { "mode": "subagent", "model": "opencode-go/deepseek-v4-flash" }\n  }\n}\n';
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), fixture);
  copyOpencodeConfig(tmpDir);
  const raw = fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8');
  assert.ok(raw.includes('// user comment'), 'comment should survive');
  assert.ok(raw.includes('"displayName"'), 'unrelated key should survive');
  const parsed = jsonc.parse(raw);
  assert.equal(parsed.displayName, 'my-project', 'unrelated value should be unchanged');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `legacy agent ${key} should be preserved`);
  }
  for (const [key, shape] of Object.entries(OPENCODE_MANAGED_AGENTS)) {
    assert.ok(key in parsed.agent, `managed agent ${key} should be added during migration`);
    assert.deepEqual(parsed.agent[key], shape, `managed agent ${key} should have exact shape`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig is idempotent after legacy three-agent migration', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const afterFirst = fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8');
  const firstParsed = jsonc.parse(afterFirst);
  const totalKeys = AGENT_KEYS.length + Object.keys(OPENCODE_MANAGED_AGENTS).length;
  assert.equal(Object.keys(firstParsed.agent).length, totalKeys,
    'first run should add all managed agents');
  copyOpencodeConfig(tmpDir);
  const afterSecond = fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8');
  assert.equal(afterSecond, afterFirst, 'second run should produce identical bytes');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig prints add-notice naming legacy and managed agents during migration', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  const addedLines = messages.filter(m => /added/i.test(m));
  assert.ok(addedLines.length > 0, 'should print at least one add-notice');
  assert.ok(!addedLines.some(l => l.includes('explore')), 'should NOT name explore as added');
  assert.ok(!addedLines.some(l => l.includes('executor')), 'should NOT name executor as added');
  assert.ok(!addedLines.some(l => l.includes('budget')), 'should NOT name budget as added');
  for (const key of Object.keys(OPENCODE_MANAGED_AGENTS)) {
    assert.ok(addedLines.some(l => l.includes(key)), `should name ${key} as added`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig falls back gracefully for unparseable JSONC', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const configPath = path.join(tmpDir, 'opencode.jsonc');
  const badContent = '{{{{ not valid jsonc }}}}';
  fs.writeFileSync(configPath, badContent);
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(configPath, 'utf8'), badContent, 'unparseable file should remain unchanged');
  const joined = messages.join('\n');
  assert.ok(joined.includes('Opencode config already exists'), 'should print intro line for fallback');
  assert.ok(joined.includes('// Your trusted low-cost model below'), 'fallback should use the correct comment');
  assert.ok(!joined.includes('// Put your trusted low-cost model here'), 'must not contain the put-model-here string');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig falls back gracefully for non-object root', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const configPath = path.join(tmpDir, 'opencode.json');
  const arrayContent = JSON.stringify(['item1', 'item2']);
  fs.writeFileSync(configPath, arrayContent);
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(configPath, 'utf8'), arrayContent, 'array-root config should remain unchanged');
  const joined = messages.join('\n');
  assert.ok(joined.includes('Opencode config already exists'), 'should print fallback for non-object root');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig suppresses verification message after successful merge', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(!messages.some(m => m.includes('Verify that you have these settings')), 'should not print verification message after merge');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Step 1: Opencode install offer tests ---

test('offerOpencodeInstall (binary present) does nothing', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  let promptYesNoCalled = false;
  await offerOpencodeInstall({
    probe: () => true,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when binary is present');
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called when binary is present');
  assert.equal(messages.length, 0, 'nothing should be printed when binary is present');
});

test('offerOpencodeInstall (absent + TTY + yes) runs install', async () => {
  let runInstallCalled = 0;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled++; return true; },
    promptYesNo: async () => true,
    isTTY: true,
  });
  assert.equal(runInstallCalled, 1, 'runInstall should be called exactly once when user says yes');
});

test('offerOpencodeInstall (absent + TTY + no) prints command', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => false,
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when user declines');
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include install command');
});

test('offerOpencodeInstall (absent + no TTY) prints without prompting', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let promptYesNoCalled = false;
  let runInstallCalled = false;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: false,
  });
  console.log = origLog;
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called in non-TTY mode');
  assert.equal(runInstallCalled, false, 'runInstall should not be called in non-TTY mode');
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include install command');
});

test('offerOpencodeInstall (install failure) does not throw', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => false,
    promptYesNo: async () => true,
    isTTY: true,
  });
  console.log = origLog;
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include manual install command');
});

test('probeOpencode uses spawnSync exit-code semantics', () => {
  const origSpawnSync = childProcess.spawnSync;
  const spawnSyncCalls = [];
  childProcess.spawnSync = (...args) => {
    spawnSyncCalls.push(args);
    const callIndex = spawnSyncCalls.length - 1;
    if (callIndex === 0) return { error: new Error('not found'), status: null, stdout: '', stderr: '' };
    if (callIndex === 1) return { error: null, status: 1, stdout: '', stderr: '' };
    if (callIndex === 2) return { error: null, status: 0, stdout: 'opencode x.y.z\n', stderr: '' };
    return { error: null, status: 0, stdout: '', stderr: '' };
  };
  try {
    assert.equal(probeOpencode(), false, 'error should return false');
    assert.equal(probeOpencode(), false, 'non-zero status should return false');
    assert.equal(probeOpencode(), true, 'zero status should return true');
    assert.ok(spawnSyncCalls.length >= 3, 'spawnSync should be called at least 3 times');
    for (const call of spawnSyncCalls) {
      assert.equal(typeof call[0], 'string', 'should use string command');
      assert.equal(call[0], 'opencode --version', 'should use exact command string');
      assert.equal(call[1]?.shell, true, 'should use shell: true');
    }
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
});

// --- Step 1: preservation-first numbered worker bootstrap tests ---

test('copyOpencodeConfig merges customized and missing numbered workers without replacing the customized value', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-preserve-'));
  const custom = {
    mode: 'subagent',
    model: 'user-design-model',
    variant: 'low',
    permission: { question: 'deny', edit: 'allow' },
    description: 'user-owned design runtime',
  };
  const config = { agent: { 'sai-2-design-worker': custom } };
  try {
    fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
    copyOpencodeConfig(tmpDir);
    const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
    assert.deepEqual(parsed.agent['sai-2-design-worker'], {
      ...custom,
       prompt: expectedRegistrationPrompt('sai-2-design-worker'),
    });
    assert.deepEqual(parsed.agent['sai-3-implementation-worker'], OPENCODE_MANAGED_AGENTS['sai-3-implementation-worker']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installOpencode preserves customized design and implementation runtime entries', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-runtime-'));
  const custom = {
    mode: 'subagent',
    model: 'user-worker-model',
    variant: 'medium',
    permission: { question: 'allow', edit: 'deny', bash: 'deny' },
    prompt: 'custom worker prompt',
  };
  const configPath = path.join(tmpDir, 'opencode.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify({ agent: {
      'sai-2-design-worker': { ...custom, model: 'user-design-model' },
      'sai-3-implementation-worker': { ...custom, model: 'user-implementation-model' },
    } }, null, 2));
    installOpencode(tmpDir);
    const parsed = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    assert.deepEqual(parsed.agent['sai-2-design-worker'], { ...custom, model: 'user-design-model' });
    assert.deepEqual(parsed.agent['sai-3-implementation-worker'], { ...custom, model: 'user-implementation-model' });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig leaves fully populated numbered configuration byte-identical', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-byte-'));
  const config = {
    theme: 'custom',
    permission: { bash: 'deny', external_directory: { [SAI_EXTERNAL_DIRECTORY]: 'allow' } },
    agent: Object.fromEntries([
      ...AGENT_KEYS.map(name => [name, { ...AGENT_PLACEHOLDER, model: `user-${name}` }]),
      ...Object.entries(OPENCODE_MANAGED_AGENTS).map(([name, value]) => [name, {
      ...value,
      model: `user-${name}`,
      variant: 'custom',
      permission: { question: 'allow' },
      }]),
    ]),
  };
  const content = `// preserve user configuration\n${JSON.stringify(config, null, 2)}\n`;
  const configPath = path.join(tmpDir, 'opencode.json');
  try {
    fs.writeFileSync(configPath, content);
    copyOpencodeConfig(tmpDir);
    assert.deepEqual(fs.readFileSync(configPath, 'utf8'), content);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig edits only opencode.json when both config filenames exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-dual-'));
  const jsonContent = JSON.stringify({ agent: { 'sai-2-design-worker': { mode: 'subagent', model: 'custom' } } }, null, 2);
  const jsoncContent = '// untouched\n{ "theme": "light" }\n';
  try {
    fs.writeFileSync(path.join(tmpDir, 'opencode.json'), jsonContent);
    fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), jsoncContent);
    copyOpencodeConfig(tmpDir);
    assert.deepEqual(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'), jsoncContent);
    const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
       assert.deepEqual(parsed.agent['sai-2-design-worker'], {
         mode: 'subagent',
         model: 'custom',
         prompt: expectedRegistrationPrompt('sai-2-design-worker'),
       });
    assert.ok(parsed.agent['sai-3-implementation-worker']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig protects malformed roots and agent maps in both config files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-malformed-'));
  const files = {
    'opencode.json': JSON.stringify({ agent: ['not', 'an', 'object'] }),
    'opencode.jsonc': '{ "agent": 42 }\n',
  };
  const messages = [];
  const originalLog = console.log;
  try {
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(tmpDir, name), content);
    console.log = message => messages.push(String(message));
    copyOpencodeConfig(tmpDir);
    assert.deepEqual(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'), files['opencode.json']);
    assert.deepEqual(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'), files['opencode.jsonc']);
    assert.ok(messages.some(message => /manual|already exists|verify/i.test(message)));
  } finally {
    console.log = originalLog;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// --- Step 1: external-directory permission merge tests ---

function permissionStepTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-permission-step-1-'));
}

function writePermissionConfig(dir, name, value) {
  const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  fs.writeFileSync(path.join(dir, name), content);
  return content;
}

function readPermissionConfig(dir, name) {
  return jsonc.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
}

function capturePermissionOutput(fn) {
  const messages = [];
  const originalLog = console.log;
  console.log = message => messages.push(String(message));
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return messages;
}

test('Step 1 fresh install grants narrow SAI external-directory access and retains managed agents', () => {
  const dir = permissionStepTempDir();
  try {
    installOpencode(dir);
    const name = fs.existsSync(path.join(dir, 'opencode.json')) ? 'opencode.json' : 'opencode.jsonc';
    const config = readPermissionConfig(dir, name);
    assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
    assert.ok(config.permission.read, 'SAI read permissions should remain present');
    assert.ok(config.agent, 'managed agents should remain present');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 JSON-only and JSONC-only object permissions append exactly one narrow rule', () => {
  for (const name of ['opencode.json', 'opencode.jsonc']) {
    const dir = permissionStepTempDir();
    try {
      writePermissionConfig(dir, name, { permission: { read: { [SAI_EXTERNAL_DIRECTORY]: 'allow' }, external_directory: { '*.md': 'ask' } } });
      copyOpencodeConfig(dir);
      const config = readPermissionConfig(dir, name);
      assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
      assert.equal(Object.keys(config.permission.external_directory).length, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 changes only opencode.json when both config files exist', () => {
  const dir = permissionStepTempDir();
  const jsoncContent = '// untouched\n{ "permission": { "external_directory": { "*.md": "ask" } } }\n';
  try {
    writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: { '*.md': 'ask' } } });
    writePermissionConfig(dir, 'opencode.jsonc', jsoncContent);
    copyOpencodeConfig(dir);
    assert.equal(fs.readFileSync(path.join(dir, 'opencode.jsonc'), 'utf8'), jsoncContent);
    assert.equal(readPermissionConfig(dir, 'opencode.json').permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 preserves comments, unrelated values, agents, plugins, MCP entries, and rule order', () => {
  const dir = permissionStepTempDir();
  const fixture = `// keep this comment\n${JSON.stringify({
    permission: { external_directory: { first: 'ask', second: 'deny' } },
    agent: { custom: { model: 'user-model' } },
    plugin: ['user-plugin'],
    mcp: { local: { command: 'user-command' } },
  }, null, 2)}\n`;
  try {
    writePermissionConfig(dir, 'opencode.jsonc', fixture);
    copyOpencodeConfig(dir);
    const raw = fs.readFileSync(path.join(dir, 'opencode.jsonc'), 'utf8');
    const config = jsonc.parse(raw);
    assert.match(raw, /keep this comment/);
    assert.deepEqual(config.agent.custom, { model: 'user-model' });
    assert.deepEqual(config.plugin, ['user-plugin']);
    assert.deepEqual(config.mcp.local, { command: 'user-command' });
    assert.deepEqual(Object.keys(config.permission.external_directory), ['first', 'second', SAI_EXTERNAL_DIRECTORY]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 treats wildcard as broad, and normalized equivalent SAI spellings as existing', () => {
  const absolute = path.join(os.homedir(), '.config', 'opencode', 'sai', '**');
  const variants = [
    '*',
    absolute,
    absolute.replaceAll(path.sep, path.sep === '/' ? '\\' : '/'),
    '~/.config/opencode/./sai/**',
  ];
  for (const existing of variants) {
    const dir = permissionStepTempDir();
    try {
      writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: { [existing]: 'allow' } } });
      copyOpencodeConfig(dir);
      const rules = readPermissionConfig(dir, 'opencode.json').permission.external_directory;
      if (existing === '*') assert.equal(Object.keys(rules).length, 2);
      else assert.equal(Object.keys(rules).length, 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 respects effective rule order for broad deny and narrow allow or deny', () => {
  const cases = [
    { rules: { '*': 'deny', [SAI_EXTERNAL_DIRECTORY]: 'allow' }, expected: 'allow' },
    { rules: { [SAI_EXTERNAL_DIRECTORY]: 'allow', '*': 'deny' }, expected: 'deny' },
  ];
  for (const { rules, expected } of cases) {
    const dir = permissionStepTempDir();
    try {
      writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: rules } });
      copyOpencodeConfig(dir);
      const config = readPermissionConfig(dir, 'opencode.json');
      assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], expected);
      assert.equal(Object.keys(config.permission.external_directory).length, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 preserves valid scalar permissions and reports broad access or restriction', () => {
  for (const [location, action] of [['permission', 'allow'], ['permission', 'ask'], ['permission.external_directory', 'deny'], ['permission.external_directory', 'allow']]) {
    const dir = permissionStepTempDir();
    try {
      const permission = location === 'permission' ? action : { external_directory: action };
      writePermissionConfig(dir, 'opencode.json', { permission });
      const messages = capturePermissionOutput(() => copyOpencodeConfig(dir));
      const config = readPermissionConfig(dir, 'opencode.json');
      if (location === 'permission') assert.equal(config.permission, action);
      else assert.equal(config.permission.external_directory, action);
      if (action === 'allow') assert.ok(messages.some(message => message === `OpenCode SAI permission: preserved allow at ${location}; existing broad user permission allows ${SAI_EXTERNAL_DIRECTORY}.`));
      else assert.ok(messages.some(message => message === `OpenCode SAI permission: preserved ${action} for ${SAI_EXTERNAL_DIRECTORY}; explicit user restriction prevents automatic SAI access.`));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 rejects invalid permission inputs without partial writes', () => {
  const cases = [
    ['permission', ['array'], 'array'],
    ['permission', 'maybe', 'action'],
    ['permission.external_directory', ['array'], 'shape'],
    ['permission.external_directory', { [SAI_EXTERNAL_DIRECTORY]: 'maybe' }, 'action'],
  ];
  for (const [location, value, diagnostic] of cases) {
    const dir = permissionStepTempDir();
    try {
      const config = location === 'permission' ? { permission: value } : { permission: { external_directory: value } };
      writePermissionConfig(dir, 'opencode.json', config);
      const messages = capturePermissionOutput(() => copyOpencodeConfig(dir));
      const after = readPermissionConfig(dir, 'opencode.json');
      assert.deepEqual(after.permission, config.permission);
      assert.ok(messages.some(message => message === `OpenCode SAI permission: no change for ${SAI_EXTERNAL_DIRECTORY}; ${location} has invalid ${diagnostic}; expected allow, ask, deny, or a rule object.`));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 leaves effective configuration and bytes unchanged on a second installation', () => {
  const dir = permissionStepTempDir();
  try {
    writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: { '*.md': 'ask' } } });
    copyOpencodeConfig(dir);
    const firstBytes = fs.readFileSync(path.join(dir, 'opencode.json'));
    const firstConfig = readPermissionConfig(dir, 'opencode.json');
    copyOpencodeConfig(dir);
    assert.deepEqual(readPermissionConfig(dir, 'opencode.json'), firstConfig);
    assert.deepEqual(fs.readFileSync(path.join(dir, 'opencode.json')), firstBytes);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 does not treat permission.read as external-directory access', () => {
  const dir = permissionStepTempDir();
  try {
    writePermissionConfig(dir, 'opencode.json', { permission: { read: { [SAI_EXTERNAL_DIRECTORY]: 'allow' } } });
    copyOpencodeConfig(dir);
    const config = readPermissionConfig(dir, 'opencode.json');
    assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- Step 2: external-directory trust-boundary documentation contracts ---

const OPENCODE_INSTALL_GUIDE = fs.readFileSync(path.join(__dirname, '..', 'INSTALL.opencode.md'), 'utf8');

test('Step 2 installation guide documents the narrow merge boundary and JSON precedence', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /merge(?:s|d)? rather than overwrit(?:e|ing) user settings/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /preserv(?:e|es|ing) user comments/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /~\/\.config\/opencode\/sai\/\*\*/);
  assert.match(OPENCODE_INSTALL_GUIDE, /opencode\.json.*(?:merge target|takes precedence|preferred).*opencode\.jsonc/is);
});

test('Step 2 installation guide documents the post-install smoke procedure and diagnostics', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /restart|reload/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /(?:invoke|run|execute) (?:one )?SAI command/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /no prompt/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /preserv(?:e|es|ed|ing).*\bask\b.*\bdeny\b/is);
  assert.match(OPENCODE_INSTALL_GUIDE, /stdout diagnostic/i);
});

test('Step 2 design guidance distinguishes external-directory authorization from read authorization', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /external[- ]directory authorization/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /read authorization/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /(?:do not|not).*broad external[- ]directory access/i);
});

test('Step 2 installation guide contains the canonical narrow restriction template and effective outcomes', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /"external_directory"\s*:\s*\{[\s\S]*"~\/\.config\/opencode\/sai\/\*\*"\s*:\s*"allow"[\s\S]*\}/);
  assert.match(OPENCODE_INSTALL_GUIDE, /effective.*allow.*without a prompt/is);
  assert.match(OPENCODE_INSTALL_GUIDE, /\bask\b.*matching install notice.*runtime prompt/is);
  assert.match(OPENCODE_INSTALL_GUIDE, /\bdeny\b.*matching install notice.*runtime (?:prompt|block)/is);
});
