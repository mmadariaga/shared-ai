'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PHASE_ORDER,
  defineWorkerMatrix,
  renderWorkerTemplate,
  materializeWorkerMatrix,
  assertWorkerIdentity,
} = require('../bin/worker-matrix.js');

const CANONICAL_PHASE_ORDER = [
  'spec',
  'design',
  'security',
  'performance',
  'accessibility',
  'commit',
  'archive',
  'backfill',
  'merge',
];

const WORKER_NAME = {
  spec: 'sai-1-spec-proposal-worker',
  design: 'sai-2-design-worker',
  security: 'sai-5-security-worker',
  performance: 'sai-6-performance-worker',
  accessibility: 'sai-7-accessibility-worker',
  commit: 'sai-commit-worker',
  archive: 'sai-archive-worker',
  backfill: 'sai-backfill-worker',
  merge: 'sai-merge-worker',
};

const WORKER_DIR = {
  spec: 'spec',
  design: 'design',
  security: 'security',
  performance: 'performance',
  accessibility: 'accessibility',
  commit: 'commit',
  archive: 'archive',
  backfill: 'backfill',
  merge: 'merge',
};

const REQUIRED_FIELDS = [
  'phase',
  'workerName',
  'workerContract',
  'bindingStem',
  'claudeAgent',
  'opencodeAgent',
];

const DIRECT_BUILD_ROLE = {
  'sai-direct-build-worker': 'direct-build',
};

const IMPLEMENT_ROLE = {
  'sai-3-red-worker': 'red',
  'sai-3-green-worker': 'green',
  'sai-4-review-worker': 'review',
};

function implementEntry(workerName, overrides = {}) {
  const phase = IMPLEMENT_ROLE[workerName];
  const base = {
    phase,
    workerName,
    workerContract: phase === 'review'
      ? 'sai/commands/review/worker.md'
      : `sai/commands/implement/${phase}-worker.md`,
    bindingStem: phase,
    claudeAgent: { name: workerName, model: 'claude-implement-model', keyword: `claude-${phase}` },
    opencodeAgent: { name: workerName, model: 'opencode-implement-model', keyword: `opencode-${phase}` },
  };
  return { ...base, ...overrides };
}

function directBuildEntry(workerName, overrides = {}) {
  const phase = DIRECT_BUILD_ROLE[workerName];
  const base = {
    phase,
    workerName,
    workerContract: `sai/commands/explore/${phase}-worker.md`,
    bindingStem: phase,
    claudeAgent: { name: workerName, model: 'claude-direct-build-model', keyword: `claude-${phase}` },
    opencodeAgent: { name: workerName, model: 'opencode-direct-build-model', keyword: `opencode-${phase}` },
  };
  return { ...base, ...overrides };
}

function fourteenEntries() {
  return [
    ...fullEntries(),
    directBuildEntry('sai-direct-build-worker'),
    implementEntry('sai-3-red-worker'),
    implementEntry('sai-3-green-worker'),
    implementEntry('sai-4-review-worker'),
  ];
}

const twelveEntries = fourteenEntries;

function defineOrNull(entries) {
  try {
    return defineWorkerMatrix(entries);
  } catch {
    return null;
  }
}

function entry(phase, overrides = {}) {
  const workerName = WORKER_NAME[phase];
  const base = {
    phase,
    workerName,
    workerContract: `sai/commands/${WORKER_DIR[phase]}/worker.md`,
    bindingStem: phase,
    claudeAgent: { name: workerName, model: 'claude-model', keyword: `claude-${phase}` },
    opencodeAgent: { name: workerName, model: 'opencode-model', keyword: `opencode-${phase}` },
  };
  return { ...base, ...overrides };
}

function fullEntries() {
  return CANONICAL_PHASE_ORDER.map(phase => entry(phase));
}

function contractFor(phase) {
  return `sai/commands/${WORKER_DIR[phase]}/worker.md`;
}

function bindingParameters(phase, harness) {
  return { ...entry(phase), harness };
}

const CLAUDE_BINDING_TEMPLATE = [
  'Bind the {{phase}} worker for harness {{harness}}.',
  'Dispatch Agent("{{workerName}}", { prompt: "Execute the {{phase}} worker." })',
  'Fetch @{{workerContract}} and follow it exactly.',
].join('\n');

const OPENCODE_BINDING_TEMPLATE = [
  'Bind the {{phase}} worker for harness {{harness}}.',
  'Dispatch task("{{workerName}}", { prompt: "Execute the {{phase}} worker." })',
  'Fetch @{{workerContract}} and follow it exactly.',
].join('\n');

const CLAUDE_AGENT_TEMPLATE = [
  'Managed {{phase}} agent.',
  '{{canonicalFetch}}',
  'Keyword: {{keyword}}.',
].join('\n');

const OPENCODE_AGENT_TEMPLATE = [
  'Managed {{phase}} agent.',
  '{{canonicalFetch}}',
  'Keyword: {{keyword}}.',
].join('\n');

const TEMPLATES = {
  claudeStandaloneBinding: CLAUDE_BINDING_TEMPLATE,
  opencodeStandaloneBinding: OPENCODE_BINDING_TEMPLATE,
  claudeAgent: CLAUDE_AGENT_TEMPLATE,
  opencodeAgent: OPENCODE_AGENT_TEMPLATE,
};

test('defineWorkerMatrix returns the frozen matrix with the nine canonical phases, one direct-build implementer, and the RED, GREEN, and review roles', () => {
  assert.equal(PHASE_ORDER.length, 9, 'PHASE_ORDER should declare exactly nine phases');
  assert.deepEqual(PHASE_ORDER, CANONICAL_PHASE_ORDER,
    'PHASE_ORDER should be spec, design, security, performance, accessibility, commit, archive, backfill, merge');
  assert.equal(Object.isFrozen(PHASE_ORDER), true, 'PHASE_ORDER should be frozen');

  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'defineWorkerMatrix should accept the thirteen-entry set');
  assert.equal(Object.isFrozen(matrix), true, 'defineWorkerMatrix should return a frozen matrix');
  assert.equal(matrix.phases, PHASE_ORDER, 'the matrix should reference the frozen canonical PHASE_ORDER');
  assert.equal(Object.isFrozen(matrix.entries), true, 'matrix entries should be frozen');
  assert.equal(matrix.entries.length, 13, 'the matrix should carry thirteen entries');
  assert.deepEqual(matrix.entries.slice(0, 9).map(item => item.phase), CANONICAL_PHASE_ORDER,
    'the first nine matrix entries should preserve the canonical phase order');
  for (const item of matrix.entries) {
    assert.equal(Object.isFrozen(item), true, `${item.workerName} entry should be frozen`);
  }
});

test('defineWorkerMatrix yields entries with nine phase identities followed by the direct-build, RED, GREEN, and review identities', () => {
  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'defineWorkerMatrix should accept the nine phase entries plus the four role entries');
  assert.equal(matrix.entries.length, 13, 'the matrix should yield thirteen entries');
  assert.deepEqual(matrix.entries.slice(0, 9).map(item => item.workerName), Object.values(WORKER_NAME),
    'the nine phase identities should be unchanged');
  const [directBuild, red, green, review] = matrix.entries.slice(9);
  assert.equal(directBuild.workerName, 'sai-direct-build-worker', 'the tenth entry should be the direct-build worker');
  assert.equal(red.workerName, 'sai-3-red-worker', 'the eleventh entry should be the RED worker');
  assert.equal(green.workerName, 'sai-3-green-worker', 'the twelfth entry should be the GREEN worker');
  assert.equal(review.workerName, 'sai-4-review-worker', 'the thirteenth entry should be the review worker');
  assert.equal(red.workerContract, 'sai/commands/implement/red-worker.md',
    'RED should pin its role-specific implement contract');
  assert.equal(green.workerContract, 'sai/commands/implement/green-worker.md',
    'GREEN should pin its role-specific implement contract');
  assert.equal(review.workerContract, 'sai/commands/review/worker.md',
    'review should pin its review contract');
  assert.equal(new Set([red.bindingStem, green.bindingStem, review.bindingStem]).size, 3,
    'the three role entries should carry unique binding stems');
});

test('defineWorkerMatrix rejects duplicate phase identities naming the phase', () => {
  const duplicate = twelveEntries().map((item, index) => index === 1 ? entry('spec') : item);
  assert.throws(
    () => defineWorkerMatrix(duplicate),
    error => {
      const message = String(error && error.message || error);
      return /duplicate/i.test(message) && message.includes('spec');
    },
    'a duplicated phase identity should be rejected naming the duplicated phase'
  );
});

test('defineWorkerMatrix rejects missing phase identities', () => {
  assert.throws(
    () => defineWorkerMatrix(twelveEntries().filter(item => item.phase !== 'security')),
    error => String(error && error.message || error).includes('exactly 13'),
    'an entry set missing the security phase should be rejected for its exact entry count'
  );
  const omitReview = twelveEntries().map((item, index) => index === 2 ? entry('spec') : item);
  assert.throws(
    () => defineWorkerMatrix(omitReview),
    error => {
      const message = String(error && error.message || error);
      return /duplicate/i.test(message) && message.includes('spec');
    },
    'a twelve-entry set omitting security by duplicating spec should be rejected naming the phase'
  );
});

test('defineWorkerMatrix rejects a non-array or wrong-size entry set', () => {
  assert.throws(() => defineWorkerMatrix(null),
    error => String(error && error.message || error).includes('exactly 13'),
    'null entries should be rejected for the exact entry count');
  assert.throws(() => defineWorkerMatrix('not-an-array'),
    error => String(error && error.message || error).includes('exactly 13'),
    'non-array entries should be rejected for the exact entry count');
  assert.throws(() => defineWorkerMatrix(twelveEntries().slice(0, 9)),
    error => String(error && error.message || error).includes('exactly 13'),
    'nine entries should be rejected for the exact entry count');
  assert.throws(() => defineWorkerMatrix([...twelveEntries(), entry('spec')]),
    error => String(error && error.message || error).includes('exactly 13'),
    'fourteen entries should be rejected for the exact entry count');
});

test('defineWorkerMatrix rejects unknown phases naming the phase', () => {
  const unknown = twelveEntries().map((item, index) => index === 0 ? { ...item, phase: 'explore' } : item);
  assert.throws(
    () => defineWorkerMatrix(unknown),
    error => String(error && error.message || error).includes('Unknown Worker Matrix phase: explore'),
    'an unknown phase identity should be rejected naming the phase'
  );
});

test('defineWorkerMatrix rejects out-of-order phases naming both phases', () => {
  const outOfOrder = twelveEntries().map((item, index) => index === 1 ? entry('security') : item);
  assert.throws(
    () => defineWorkerMatrix(outOfOrder),
    error => {
      const message = String(error && error.message || error);
      return message.includes('out of order') && message.includes('security') && message.includes('design');
    },
    'an out-of-order phase should be rejected naming the misplaced and expected phases'
  );
});

test('defineWorkerMatrix rejects non-object entries naming the index', () => {
  assert.throws(
    () => defineWorkerMatrix(twelveEntries().map((item, index) => index === 0 ? null : item)),
    error => String(error && error.message || error).includes('entry 0 must be an object'),
    'a null entry should be rejected naming its index'
  );
});

test('defineWorkerMatrix rejects entries with missing required fields naming the field', () => {
  for (const field of REQUIRED_FIELDS) {
    const broken = twelveEntries();
    delete broken[0][field];
    assert.throws(
      () => defineWorkerMatrix(broken),
      error => {
        const message = String(error && error.message || error);
        return message.includes('missing required field') && message.includes(field);
      },
      `an entry missing ${field} should be rejected naming the field`
    );
  }
  for (const field of ['workerContract']) {
    assert.throws(
      () => defineWorkerMatrix(twelveEntries().map((item, index) => index === 0 ? { ...item, [field]: null } : item)),
      error => {
        const message = String(error && error.message || error);
        return message.includes('missing required field') && message.includes(field);
      },
      `a null ${field} should be rejected naming the field`
    );
    assert.throws(
      () => defineWorkerMatrix(twelveEntries().map((item, index) => index === 0 ? { ...item, [field]: '' } : item)),
      error => {
        const message = String(error && error.message || error);
        return message.includes('missing required field') && message.includes(field);
      },
      `an empty ${field} should be rejected naming the field`
    );
  }
});

test('defineWorkerMatrix rejects invalid worker identities and contract paths', () => {
  assert.throws(
    () => defineWorkerMatrix(twelveEntries().map((item, index) => index === 0 ? { ...item, workerName: 'sai-9-watcher' } : item)),
    error => {
      const message = String(error && error.message || error);
      return message.includes('Invalid Worker Matrix worker identity') && message.includes('spec');
    },
    'a worker identity outside the sai-1/2/6/7/8 family should be rejected for its phase'
  );
  assert.throws(
    () => defineWorkerMatrix(twelveEntries().map((item, index) => index === 0 ? { ...item, workerContract: 'sai/orchestration/workers/generic-worker.md' } : item)),
    error => {
      const message = String(error && error.message || error);
      return message.includes('Invalid Worker Matrix contract path') && message.includes('spec');
    },
    'a contract path without the sai- prefix should be rejected for its phase'
  );
});

test('renderWorkerTemplate requires a string template and an object of parameters', () => {
  assert.throws(() => renderWorkerTemplate(null, {}),
    error => String(error && error.message || error).includes('must be a string'),
    'a non-string template should be rejected');
  assert.throws(() => renderWorkerTemplate(CLAUDE_BINDING_TEMPLATE, null),
    error => String(error && error.message || error).includes('parameters must be an object'),
    'null parameters should be rejected');
  assert.equal(renderWorkerTemplate('', {}), '',
    'an empty-string template should render to an empty string without throwing');
});

test('renderWorkerTemplate preserves Claude Agent(...) dispatch syntax', () => {
  const rendered = renderWorkerTemplate(CLAUDE_BINDING_TEMPLATE, bindingParameters('design', 'Claude Code'));
  assert.match(rendered, /Agent\s*\(/,
    'Claude rendering should preserve the Agent(...) dispatch form');
  assert.ok(rendered.includes('Agent("sai-2-design-worker"'),
    'the substituted worker identity should be preserved inside the Claude dispatch');
  assert.ok(rendered.includes('harness Claude Code'),
    'the injected Claude harness label should be substituted');
  assert.doesNotMatch(rendered, /\{\{/,
    'Claude rendering should leave no template token');
});

test('renderWorkerTemplate preserves opencode task(...) dispatch syntax', () => {
  const rendered = renderWorkerTemplate(OPENCODE_BINDING_TEMPLATE, bindingParameters('security', 'opencode'));
  assert.match(rendered, /task\s*\(/,
    'opencode rendering should preserve the task(...) dispatch form');
  assert.ok(rendered.includes('task("sai-5-security-worker"'),
    'the substituted worker identity should be preserved inside the opencode dispatch');
  assert.ok(rendered.includes('harness opencode'),
    'the injected opencode harness label should be substituted');
  assert.doesNotMatch(rendered, /\{\{/,
    'opencode rendering should leave no template token');
});

test('renderWorkerTemplate preserves the canonical worker-contract Fetch targets', () => {
  for (const phase of CANONICAL_PHASE_ORDER) {
    const rendered = renderWorkerTemplate(CLAUDE_BINDING_TEMPLATE, bindingParameters(phase, 'Claude Code'));
    assert.ok(rendered.includes(`Fetch @${contractFor(phase)} and follow it exactly.`),
      `${phase} rendering should preserve its canonical contract Fetch target`);
    assert.ok(rendered.includes(`Bind the ${phase} worker`),
      `${phase} rendering should substitute its phase identity`);
  }
});

test('renderWorkerTemplate rejects missing parameter values naming the token', () => {
  assert.throws(
    () => renderWorkerTemplate('Dispatch the {{missing}} worker.', { phase: 'spec' }),
    error => String(error && error.message || error).includes('Missing Worker Matrix template parameter: missing'),
    'a missing parameter value should throw naming the token'
  );
  assert.throws(
    () => renderWorkerTemplate('{{phase}} worker.', { phase: null }),
    error => String(error && error.message || error).includes('Missing Worker Matrix template parameter: phase'),
    'a null parameter value should throw naming the token'
  );
});

test('renderWorkerTemplate rejects unresolved tokens left after substitution', () => {
  assert.throws(
    () => renderWorkerTemplate('{{phase}}', { phase: '{{unresolved}}' }),
    error => {
      const message = String(error && error.message || error);
      return message.includes('unresolved') && message.includes('token');
    },
    'a value substituted with another token should throw for the unresolved token'
  );
});

test('materializeWorkerMatrix returns one binding and one agent per phase and harness', () => {
  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'materialization requires the thirteen-entry matrix');
  const projections = materializeWorkerMatrix(matrix, TEMPLATES);
  assert.equal(projections.length, 52,
    '13 workers × 2 harnesses × (binding + agent) should yield 52 projections');
  assert.equal(projections.filter(item => item.kind === 'binding').length, 26,
    'there should be 26 binding projections');
  assert.equal(projections.filter(item => item.kind === 'agent').length, 26,
    'there should be 26 agent projections');
  for (const harness of ['claude', 'opencode']) {
    for (const phase of [...CANONICAL_PHASE_ORDER, 'direct-build', ...Object.values(IMPLEMENT_ROLE)]) {
      const bindings = projections.filter(item =>
        item.kind === 'binding' && item.harness === harness && item.phase === phase);
      const agents = projections.filter(item =>
        item.kind === 'agent' && item.harness === harness && item.phase === phase);
      assert.equal(bindings.length, 1, `${harness}/${phase} should have exactly one binding projection`);
      assert.equal(agents.length, 1, `${harness}/${phase} should have exactly one agent projection`);
    }
  }
});

test('materializeWorkerMatrix produces deterministic destinations and template names', () => {
  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'materialization requires the thirteen-entry matrix');
  const first = materializeWorkerMatrix(matrix, TEMPLATES);
  const second = materializeWorkerMatrix(matrix, TEMPLATES);
  assert.deepEqual(first, second, 'materialization should be deterministic across calls');
  assert.equal(new Set(first.map(item => item.destinationName)).size, 26,
    '13 binding destinations and 13 agent destinations should be distinct');
  for (const harness of ['claude', 'opencode']) {
    for (const phase of CANONICAL_PHASE_ORDER) {
      const binding = first.find(item =>
        item.kind === 'binding' && item.harness === harness && item.phase === phase);
      assert.equal(binding.destinationName, `${phase}-worker.md`,
        `${harness}/${phase} binding destination should be bindingStem-derived`);
      // Every command runs outside the shared orchestration, so every binding
      // renders from the standalone template.
      assert.equal(binding.templateName, `${harness}StandaloneBinding`,
        `${harness}/${phase} binding should use its harness standalone binding template`);
      assert.equal(binding.harness, harness, `${harness}/${phase} binding should preserve its harness`);
      const agent = first.find(item =>
        item.kind === 'agent' && item.harness === harness && item.phase === phase);
      assert.equal(agent.destinationName, `${WORKER_NAME[phase]}.md`,
        `${harness}/${phase} agent destination should be workerName-derived`);
      assert.equal(agent.templateName, harness === 'claude' ? 'claudeAgent' : 'opencodeAgent',
        `${harness}/${phase} agent should use its harness agent template`);
      assert.equal(agent.harness, harness, `${harness}/${phase} agent should preserve its harness`);
    }
    for (const workerName of Object.keys(IMPLEMENT_ROLE)) {
      const phase = IMPLEMENT_ROLE[workerName];
      const binding = first.find(item =>
        item.kind === 'binding' && item.harness === harness && item.phase === phase);
      assert.equal(binding.destinationName, `${phase}-worker.md`,
        `${harness}/${workerName} binding destination should be bindingStem-derived`);
      assert.equal(binding.templateName, `${harness}StandaloneBinding`,
        `${harness}/${workerName} binding should use its harness standalone binding template`);
      const agent = first.find(item =>
        item.kind === 'agent' && item.harness === harness && item.phase === phase);
      assert.equal(agent.destinationName, `${workerName}.md`,
        `${harness}/${workerName} agent destination should be workerName-derived`);
      assert.equal(agent.templateName, harness === 'claude' ? 'claudeAgent' : 'opencodeAgent',
        `${harness}/${workerName} agent should use its harness agent template`);
      assert.equal(agent.harness, harness, `${harness}/${workerName} agent should preserve its harness`);
    }
  }
});

test('materializeWorkerMatrix renders non-empty content carrying the canonical Fetch target', () => {
  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'materialization requires the thirteen-entry matrix');
  const projections = materializeWorkerMatrix(matrix, TEMPLATES);
  for (const item of projections) {
    assert.equal(typeof item.text, 'string', `${item.destinationName} should carry rendered string text`);
    assert.ok(item.text.length > 0, `${item.destinationName} text should be non-empty`);
    if (PHASE_ORDER.includes(item.phase)) {
      assert.ok(item.text.includes(`Fetch @${contractFor(item.phase)} and follow it exactly.`),
        `${item.destinationName} should carry the canonical Fetch target for ${item.phase}`);
    } else if (item.phase === 'direct-build') {
      assert.match(item.text, /Fetch @sai\/commands\/explore\/direct-build-worker\.md and follow it exactly\./,
        `${item.destinationName} should carry its explore-owned direct-build Fetch target`);
    } else {
      assert.match(item.text, /Fetch @sai\/commands\/(?:implement\/(?:red|green)-worker|review\/worker)\.md and follow it exactly\./,
        `${item.destinationName} should carry its implement or review Fetch target`);
    }
    assert.doesNotMatch(item.text, /\{\{/,
      `${item.destinationName} text should leave no template token`);
  }
  const designClaude = projections.find(item =>
    item.kind === 'binding' && item.harness === 'claude' && item.phase === 'design');
  assert.match(designClaude.text, /Agent\s*\(/,
    'the Claude design binding should preserve Agent(...) dispatch syntax');
  const securityOpencode = projections.find(item =>
    item.kind === 'binding' && item.harness === 'opencode' && item.phase === 'security');
  assert.match(securityOpencode.text, /task\s*\(/,
    'the opencode security binding should preserve task(...) dispatch syntax');
});

test('the RED and GREEN bindings fetch their own contracts and never resolve through the sibling entry', () => {
  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'materialization requires the thirteen-entry matrix');
  const projections = materializeWorkerMatrix(matrix, TEMPLATES);
  for (const harness of ['claude', 'opencode']) {
    const redBindings = projections.filter(item =>
      item.kind === 'binding' && item.harness === harness &&
      item.text.includes('Fetch @sai/commands/implement/red-worker.md and follow it exactly.'));
    const greenBindings = projections.filter(item =>
      item.kind === 'binding' && item.harness === harness &&
      item.text.includes('Fetch @sai/commands/implement/green-worker.md and follow it exactly.'));
    assert.equal(redBindings.length, 1, `${harness} should render exactly one RED binding`);
    assert.equal(greenBindings.length, 1, `${harness} should render exactly one GREEN binding`);
    assert.notEqual(redBindings[0].destinationName, greenBindings[0].destinationName,
      'RED and GREEN bindings must not share a destination');
    assert.equal(redBindings[0].text.includes('sai/commands/implement/green-worker.md'), false,
      'the RED binding must not resolve through the GREEN entry');
    assert.equal(greenBindings[0].text.includes('sai/commands/implement/red-worker.md'), false,
      'the GREEN binding must not resolve through the RED entry');
    for (const workerName of ['sai-3-red-worker', 'sai-3-green-worker']) {
      const role = IMPLEMENT_ROLE[workerName];
      const agent = projections.find(item =>
        item.kind === 'agent' && item.harness === harness && item.phase === role &&
        item.destinationName === `${workerName}.md`);
      assert.ok(agent, `${harness} should render the ${workerName} agent`);
      assert.ok(agent.text.includes(`sai/commands/implement/${role}-worker.md`),
        `${harness} ${workerName} agent should fetch its own role contract`);
      const siblingRole = role === 'red' ? 'green' : 'red';
      assert.equal(agent.text.includes(`sai/commands/implement/${siblingRole}-worker.md`), false,
        `${harness} ${workerName} agent must not resolve through the sibling entry`);
    }
  }
});

test('materializeWorkerMatrix merges the per-harness agent metadata into agent text', () => {
  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'materialization requires the thirteen-entry matrix');
  const projections = materializeWorkerMatrix(matrix, TEMPLATES);
  for (const phase of CANONICAL_PHASE_ORDER) {
    const claudeAgent = projections.find(item =>
      item.kind === 'agent' && item.harness === 'claude' && item.phase === phase);
    assert.ok(claudeAgent.text.includes(`Keyword: claude-${phase}.`),
      `the Claude agent for ${phase} should render its claudeAgent metadata`);
    const opencodeAgent = projections.find(item =>
      item.kind === 'agent' && item.harness === 'opencode' && item.phase === phase);
    assert.ok(opencodeAgent.text.includes(`Keyword: opencode-${phase}.`),
      `the opencode agent for ${phase} should render its opencodeAgent metadata`);
  }
});

test('materializeWorkerMatrix requires a matrix and all four templates', () => {
  assert.throws(() => materializeWorkerMatrix(null, TEMPLATES),
    error => String(error && error.message || error).includes('Worker Matrix and templates are required'),
    'a missing matrix should be rejected');
  const matrix = defineOrNull(twelveEntries());
  assert.ok(matrix, 'materialization requires the thirteen-entry matrix');
  assert.throws(() => materializeWorkerMatrix(matrix, { ...TEMPLATES, claudeAgent: undefined }),
    error => String(error && error.message || error).includes('Missing Worker Matrix template: claudeAgent'),
    'a missing claudeAgent template should be rejected');
  assert.throws(() => materializeWorkerMatrix(matrix, { ...TEMPLATES, opencodeStandaloneBinding: 5 }),
    error => String(error && error.message || error).includes('Missing Worker Matrix template: opencodeStandaloneBinding'),
    'a non-string opencodeStandaloneBinding template should be rejected');
});

test('defineWorkerMatrix rejects unknown role worker identities naming the role', () => {
  const unknown = twelveEntries().map((item, index) =>
    index === 12 ? implementEntry('sai-4-review-worker', { workerName: 'sai-4-amber-worker' }) : item);
  assert.throws(
    () => defineWorkerMatrix(unknown),
    error => {
      const message = String(error && error.message || error);
      return message.includes('sai-4-amber-worker') && /invalid|unknown|unsupported/i.test(message);
    },
    'an unknown role worker identity should be rejected naming the role'
  );
});

test('defineWorkerMatrix rejects generic implement worker-contract variants', () => {
  const generic = twelveEntries().map((item, index) =>
    index === 10 ? implementEntry('sai-3-red-worker', { workerContract: 'sai/commands/implement/worker.md' }) : item);
  assert.throws(
    () => defineWorkerMatrix(generic),
    error => String(error && error.message || error).includes('sai/commands/implement/worker.md'),
    'an implement entry with a generic non-role contract path should be rejected naming the path'
  );
  const genericRole = twelveEntries().map((item, index) =>
    index === 11 ? implementEntry('sai-3-green-worker', { workerContract: 'sai/commands/implement/worker.md' }) : item);
  assert.throws(
    () => defineWorkerMatrix(genericRole),
    error => String(error && error.message || error).includes('sai/commands/implement/worker.md'),
    'an implement entry reusing a shared worker contract should be rejected naming the path'
  );
});

test('defineWorkerMatrix rejects duplicate worker names', () => {
  const duplicated = twelveEntries().map((item, index) =>
    index === 11 ? implementEntry('sai-3-red-worker') : item);
  assert.throws(
    () => defineWorkerMatrix(duplicated),
    error => {
      const message = String(error && error.message || error);
      return /duplicate/i.test(message) && message.includes('sai-3-red-worker');
    },
    'a duplicated worker name should be rejected naming the worker'
  );
});

test('defineWorkerMatrix rejects reversed RED and GREEN role order', () => {
  const reversed = [
    ...fullEntries(),
    directBuildEntry('sai-direct-build-worker'),
    implementEntry('sai-3-green-worker'),
    implementEntry('sai-3-red-worker'),
    implementEntry('sai-4-review-worker'),
  ];
  assert.throws(
    () => defineWorkerMatrix(reversed),
    error => {
      const message = String(error && error.message || error);
      return /order/i.test(message) && message.includes('green');
    },
    'the GREEN role preceding the RED role should be rejected naming the misplaced role'
  );
});

test('defineWorkerMatrix rejects duplicate canonical phases beside the role entries', () => {
  const duplicatedPhase = twelveEntries().map((item, index) => index === 1 ? entry('spec') : item);
  assert.throws(
    () => defineWorkerMatrix(duplicatedPhase),
    error => {
      const message = String(error && error.message || error);
      return /duplicate/i.test(message) && message.includes('spec');
    },
    'a duplicated canonical phase should be rejected naming the phase'
  );
});

test('the existing phase checks retain their outcomes beside the role entries', () => {
  assert.throws(
    () => defineWorkerMatrix(twelveEntries().map((item, index) =>
      index === 0 ? { ...item, workerName: 'sai-9-watcher' } : item)),
    error => String(error && error.message || error).includes('Invalid Worker Matrix worker identity'),
    'the phase identity check should still reject an out-of-family identity'
  );
  assert.throws(
    () => defineWorkerMatrix(twelveEntries().map((item, index) =>
      index === 0 ? { ...item, workerContract: 'sai/orchestration/workers/generic-worker.md' } : item)),
    error => String(error && error.message || error).includes('Invalid Worker Matrix contract path'),
    'the phase contract check should still reject a non-command contract path'
  );
});

test('assertWorkerIdentity preserves the existing phase pins and adds the role pins', () => {
  assert.equal(typeof assertWorkerIdentity, 'function',
    'assertWorkerIdentity should be exported');
  for (const phase of CANONICAL_PHASE_ORDER) {
    assert.doesNotThrow(() => assertWorkerIdentity(entry(phase)),
      `assertWorkerIdentity should preserve the ${phase} phase pin`);
  }
  for (const workerName of Object.keys(DIRECT_BUILD_ROLE)) {
    assert.doesNotThrow(() => assertWorkerIdentity(directBuildEntry(workerName)),
      `${workerName} should be accepted with its explore-owned direct-build contract`);
  }
  for (const workerName of Object.keys(IMPLEMENT_ROLE)) {
    assert.doesNotThrow(() => assertWorkerIdentity(implementEntry(workerName)),
      `${workerName} should be accepted with its implement or review contract`);
  }
  assert.throws(
    () => assertWorkerIdentity(implementEntry('sai-3-red-worker', { workerContract: 'sai/commands/implement/green-worker.md' })),
    error => String(error && error.message || error).includes('sai-3-red-worker'),
    'the implement RED worker must not resolve through the GREEN contract'
  );
});

test('assertWorkerIdentity never resolves a role worker through the sibling contract', () => {
  assert.throws(
    () => assertWorkerIdentity(implementEntry('sai-3-red-worker', { workerContract: 'sai/commands/implement/green-worker.md' })),
    error => String(error && error.message || error).includes('sai-3-red-worker'),
    'the RED worker must not resolve through the GREEN contract'
  );
  assert.throws(
    () => assertWorkerIdentity(implementEntry('sai-3-green-worker', { workerContract: 'sai/commands/implement/red-worker.md' })),
    error => String(error && error.message || error).includes('sai-3-green-worker'),
    'the GREEN worker must not resolve through the RED contract'
  );
});

