'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PHASE_ORDER,
  defineWorkerMatrix,
  renderWorkerTemplate,
  materializeWorkerMatrix,
} = require('../bin/worker-matrix.js');

const CANONICAL_PHASE_ORDER = [
  'spec',
  'design',
  'implementation',
  'review',
  'security',
  'performance',
  'accessibility',
];

const WORKER_NAME = {
  spec: 'sai-1-spec-proposal-worker',
  design: 'sai-2-design-worker',
  implementation: 'sai-3-implementation-worker',
  review: 'sai-5-review-worker',
  security: 'sai-6-security-worker',
  performance: 'sai-7-performance-worker',
  accessibility: 'sai-8-accessibility-worker',
};

const WORKER_DIR = {
  spec: 'spec',
  design: 'design',
  implementation: 'implement',
  review: 'review',
  security: 'security',
  performance: 'performance',
  accessibility: 'accessibility',
};

const REQUIRED_FIELDS = [
  'phase',
  'workerName',
  'workerContract',
  'bindingStem',
  'dispatchPrimitive',
  'initialDispatch',
  'continuationLiteral',
  'replacementFields',
  'helperPermissions',
  'progressDeclaration',
  'claudeAgent',
  'opencodeAgent',
];

function entry(phase, overrides = {}) {
  const workerName = WORKER_NAME[phase];
  const base = {
    phase,
    workerName,
    workerContract: `sai/commands/${WORKER_DIR[phase]}/worker.md`,
    bindingStem: phase,
    dispatchPrimitive: phase === 'design' ? 'Agent' : 'task',
    initialDispatch: `dispatch ${workerName}`,
    continuationLiteral: `continue ${workerName}`,
    replacementFields: ['model', 'effort'],
    helperPermissions: ['read', 'write'],
    progressDeclaration: `${phase} milestones`,
    claudeAgent: { name: workerName, model: 'claude-model', keyword: `claude-${phase}` },
    opencodeAgent: { name: workerName, model: 'opencode-model', keyword: `opencode-${phase}` },
  };
  if (phase === 'design') {
    base.overviewGeneration = true;
    base.noticeContinuation = true;
  }
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
  claudeBinding: CLAUDE_BINDING_TEMPLATE,
  opencodeBinding: OPENCODE_BINDING_TEMPLATE,
  claudeAgent: CLAUDE_AGENT_TEMPLATE,
  opencodeAgent: OPENCODE_AGENT_TEMPLATE,
};

test('defineWorkerMatrix returns the frozen matrix with the seven canonical phases in order', () => {
  assert.equal(PHASE_ORDER.length, 7, 'PHASE_ORDER should declare exactly seven phases');
  assert.deepEqual(PHASE_ORDER, CANONICAL_PHASE_ORDER,
    'PHASE_ORDER should be spec, design, implementation, review, security, performance, accessibility');
  assert.equal(Object.isFrozen(PHASE_ORDER), true, 'PHASE_ORDER should be frozen');

  const matrix = defineWorkerMatrix(fullEntries());
  assert.equal(Object.isFrozen(matrix), true, 'defineWorkerMatrix should return a frozen matrix');
  assert.equal(matrix.phases, PHASE_ORDER, 'the matrix should reference the frozen canonical PHASE_ORDER');
  assert.equal(Object.isFrozen(matrix.entries), true, 'matrix entries should be frozen');
  assert.equal(matrix.entries.length, 7, 'the matrix should carry one entry per phase');
  assert.deepEqual(matrix.entries.map(item => item.phase), CANONICAL_PHASE_ORDER,
    'the matrix entries should preserve the canonical phase order');
  for (const item of matrix.entries) {
    assert.equal(Object.isFrozen(item), true, `${item.phase} entry should be frozen`);
  }
});

test('defineWorkerMatrix rejects duplicate phase identities naming the phase', () => {
  const duplicate = fullEntries().map((item, index) => index === 1 ? entry('spec') : item);
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
    () => defineWorkerMatrix(fullEntries().filter(item => item.phase !== 'review')),
    error => String(error && error.message || error).includes('exactly 7 phase entries'),
    'an entry set missing the review phase should be rejected for its exact phase count'
  );
  const omitReview = fullEntries().map((item, index) => index === 4 ? entry('spec') : item);
  assert.throws(
    () => defineWorkerMatrix(omitReview),
    error => {
      const message = String(error && error.message || error);
      return /duplicate/i.test(message) && message.includes('spec');
    },
    'a seven-entry set omitting review by duplicating spec should be rejected naming the phase'
  );
});

test('defineWorkerMatrix rejects a non-array or wrong-size entry set', () => {
  assert.throws(() => defineWorkerMatrix(null),
    error => String(error && error.message || error).includes('exactly 7 phase entries'),
    'null entries should be rejected for the exact phase count');
  assert.throws(() => defineWorkerMatrix('not-an-array'),
    error => String(error && error.message || error).includes('exactly 7 phase entries'),
    'non-array entries should be rejected for the exact phase count');
  assert.throws(() => defineWorkerMatrix(fullEntries().slice(0, 6)),
    error => String(error && error.message || error).includes('exactly 7 phase entries'),
    'six entries should be rejected for the exact phase count');
  assert.throws(() => defineWorkerMatrix([...fullEntries(), entry('spec')]),
    error => String(error && error.message || error).includes('exactly 7 phase entries'),
    'eight entries should be rejected for the exact phase count');
});

test('defineWorkerMatrix rejects unknown phases naming the phase', () => {
  const unknown = fullEntries().map((item, index) => index === 0 ? { ...item, phase: 'explore' } : item);
  assert.throws(
    () => defineWorkerMatrix(unknown),
    error => String(error && error.message || error).includes('Unknown Worker Matrix phase: explore'),
    'an unknown phase identity should be rejected naming the phase'
  );
});

test('defineWorkerMatrix rejects out-of-order phases naming both phases', () => {
  const outOfOrder = fullEntries().map((item, index) => index === 1 ? entry('implementation') : item);
  assert.throws(
    () => defineWorkerMatrix(outOfOrder),
    error => {
      const message = String(error && error.message || error);
      return message.includes('out of order') && message.includes('implementation') && message.includes('design');
    },
    'an out-of-order phase should be rejected naming the misplaced and expected phases'
  );
});

test('defineWorkerMatrix rejects non-object entries naming the index', () => {
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? null : item)),
    error => String(error && error.message || error).includes('entry 0 must be an object'),
    'a null entry should be rejected naming its index'
  );
});

test('defineWorkerMatrix rejects entries with missing required fields naming the field', () => {
  for (const field of REQUIRED_FIELDS) {
    const broken = fullEntries();
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
  for (const field of ['workerContract', 'initialDispatch', 'progressDeclaration']) {
    assert.throws(
      () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? { ...item, [field]: null } : item)),
      error => {
        const message = String(error && error.message || error);
        return message.includes('missing required field') && message.includes(field);
      },
      `a null ${field} should be rejected naming the field`
    );
    assert.throws(
      () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? { ...item, [field]: '' } : item)),
      error => {
        const message = String(error && error.message || error);
        return message.includes('missing required field') && message.includes(field);
      },
      `an empty ${field} should be rejected naming the field`
    );
  }
});

test('defineWorkerMatrix rejects invalid worker identities, contract paths, and dispatch primitives', () => {
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? { ...item, workerName: 'sai-9-watcher' } : item)),
    error => {
      const message = String(error && error.message || error);
      return message.includes('Invalid Worker Matrix worker identity') && message.includes('spec');
    },
    'a worker identity outside the sai-1/2/3/5/6/7/8 family should be rejected for its phase'
  );
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? { ...item, workerContract: 'sai/orchestration/workers/generic-worker.md' } : item)),
    error => {
      const message = String(error && error.message || error);
      return message.includes('Invalid Worker Matrix contract path') && message.includes('spec');
    },
    'a contract path without the sai- prefix should be rejected for its phase'
  );
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? { ...item, dispatchPrimitive: 'tool' } : item)),
    error => {
      const message = String(error && error.message || error);
      return message.includes('Invalid Worker Matrix dispatch primitive') && message.includes('spec');
    },
    'a dispatch primitive outside Agent/task should be rejected for its phase'
  );
});

test('defineWorkerMatrix rejects invalid collection fields', () => {
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? { ...item, replacementFields: [] } : item)),
    error => String(error && error.message || error).includes('must be non-empty'),
    'an empty replacementFields array should be rejected'
  );
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map((item, index) => index === 0 ? { ...item, helperPermissions: 'read' } : item)),
    error => String(error && error.message || error).includes('must be an array'),
    'a non-array helperPermissions should be rejected'
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
  const rendered = renderWorkerTemplate(OPENCODE_BINDING_TEMPLATE, bindingParameters('implementation', 'opencode'));
  assert.match(rendered, /task\s*\(/,
    'opencode rendering should preserve the task(...) dispatch form');
  assert.ok(rendered.includes('task("sai-3-implementation-worker"'),
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
  const matrix = defineWorkerMatrix(fullEntries());
  const projections = materializeWorkerMatrix(matrix, TEMPLATES);
  assert.equal(projections.length, 28,
    '7 phases × 2 harnesses × (binding + agent) should yield 28 projections');
  assert.equal(projections.filter(item => item.kind === 'binding').length, 14,
    'there should be 14 binding projections');
  assert.equal(projections.filter(item => item.kind === 'agent').length, 14,
    'there should be 14 agent projections');
  for (const harness of ['claude', 'opencode']) {
    for (const phase of CANONICAL_PHASE_ORDER) {
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
  const matrix = defineWorkerMatrix(fullEntries());
  const first = materializeWorkerMatrix(matrix, TEMPLATES);
  const second = materializeWorkerMatrix(matrix, TEMPLATES);
  assert.deepEqual(first, second, 'materialization should be deterministic across calls');
  assert.equal(new Set(first.map(item => item.destinationName)).size, 14,
    '7 binding destinations and 7 agent destinations should be distinct');
  for (const harness of ['claude', 'opencode']) {
    for (const phase of CANONICAL_PHASE_ORDER) {
      const binding = first.find(item =>
        item.kind === 'binding' && item.harness === harness && item.phase === phase);
      assert.equal(binding.destinationName, `${phase}-worker.md`,
        `${harness}/${phase} binding destination should be bindingStem-derived`);
      assert.equal(binding.templateName, harness === 'claude' ? 'claudeBinding' : 'opencodeBinding',
        `${harness}/${phase} binding should use its harness binding template`);
      assert.equal(binding.harness, harness, `${harness}/${phase} binding should preserve its harness`);
      const agent = first.find(item =>
        item.kind === 'agent' && item.harness === harness && item.phase === phase);
      assert.equal(agent.destinationName, `${WORKER_NAME[phase]}.md`,
        `${harness}/${phase} agent destination should be workerName-derived`);
      assert.equal(agent.templateName, harness === 'claude' ? 'claudeAgent' : 'opencodeAgent',
        `${harness}/${phase} agent should use its harness agent template`);
      assert.equal(agent.harness, harness, `${harness}/${phase} agent should preserve its harness`);
    }
  }
});

test('materializeWorkerMatrix renders non-empty content carrying the canonical Fetch target', () => {
  const matrix = defineWorkerMatrix(fullEntries());
  const projections = materializeWorkerMatrix(matrix, TEMPLATES);
  for (const item of projections) {
    assert.equal(typeof item.text, 'string', `${item.destinationName} should carry rendered string text`);
    assert.ok(item.text.length > 0, `${item.destinationName} text should be non-empty`);
    assert.ok(item.text.includes(`Fetch @${contractFor(item.phase)} and follow it exactly.`),
      `${item.destinationName} should carry the canonical Fetch target for ${item.phase}`);
    assert.doesNotMatch(item.text, /\{\{/,
      `${item.destinationName} text should leave no template token`);
  }
  const designClaude = projections.find(item =>
    item.kind === 'binding' && item.harness === 'claude' && item.phase === 'design');
  assert.match(designClaude.text, /Agent\s*\(/,
    'the Claude design binding should preserve Agent(...) dispatch syntax');
  const implementationOpencode = projections.find(item =>
    item.kind === 'binding' && item.harness === 'opencode' && item.phase === 'implementation');
  assert.match(implementationOpencode.text, /task\s*\(/,
    'the opencode implementation binding should preserve task(...) dispatch syntax');
});

test('materializeWorkerMatrix merges the per-harness agent metadata into agent text', () => {
  const matrix = defineWorkerMatrix(fullEntries());
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
  const matrix = defineWorkerMatrix(fullEntries());
  assert.throws(() => materializeWorkerMatrix(matrix, { ...TEMPLATES, claudeAgent: undefined }),
    error => String(error && error.message || error).includes('Missing Worker Matrix template: claudeAgent'),
    'a missing claudeAgent template should be rejected');
  assert.throws(() => materializeWorkerMatrix(matrix, { ...TEMPLATES, opencodeBinding: 5 }),
    error => String(error && error.message || error).includes('Missing Worker Matrix template: opencodeBinding'),
    'a non-string opencodeBinding template should be rejected');
});

test('defineWorkerMatrix keeps overview and notice options only on the design entry', () => {
  const matrix = defineWorkerMatrix(fullEntries());
  for (const item of matrix.entries) {
    if (item.phase === 'design') {
      assert.equal(item.overviewGeneration, true, 'design should carry overviewGeneration');
      assert.equal(item.noticeContinuation, true, 'design should carry noticeContinuation');
    } else {
      assert.equal(Object.hasOwn(item, 'overviewGeneration'), false,
        `${item.phase} should omit overviewGeneration`);
      assert.equal(Object.hasOwn(item, 'noticeContinuation'), false,
        `${item.phase} should omit noticeContinuation`);
    }
  }
});

test('defineWorkerMatrix rejects design-only options on non-design phases', () => {
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map(item => item.phase === 'spec' ? { ...item, overviewGeneration: true } : item)),
    error => {
      const message = String(error && error.message || error);
      return message.includes('Design-only Worker Matrix options leaked into') && message.includes('spec');
    },
    'a non-design phase carrying overviewGeneration should be rejected naming the phase'
  );
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map(item => item.phase === 'review' ? { ...item, noticeContinuation: true } : item)),
    error => {
      const message = String(error && error.message || error);
      return message.includes('Design-only Worker Matrix options leaked into') && message.includes('review');
    },
    'a non-design phase carrying noticeContinuation should be rejected naming the phase'
  );
});

test('defineWorkerMatrix requires the design entry to declare both design-only options', () => {
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map(item =>
      item.phase === 'design' ? { ...item, overviewGeneration: undefined } : item)),
    error => String(error && error.message || error).includes('must declare overview and notice options'),
    'design missing overviewGeneration should be rejected'
  );
  assert.throws(
    () => defineWorkerMatrix(fullEntries().map(item =>
      item.phase === 'design' ? { ...item, noticeContinuation: undefined } : item)),
    error => String(error && error.message || error).includes('must declare overview and notice options'),
    'design missing noticeContinuation should be rejected'
  );
});

test('renderWorkerTemplate renders the design-only options only for design', () => {
  const designTemplate = 'Overview: {{overviewGeneration}}; Notice: {{noticeContinuation}}; worker: {{workerName}}.';
  const designRendered = renderWorkerTemplate(designTemplate, entry('design'));
  assert.equal(designRendered, 'Overview: true; Notice: true; worker: sai-2-design-worker.',
    'design should render its overview and notice options');
  assert.throws(
    () => renderWorkerTemplate(designTemplate, entry('spec')),
    error => String(error && error.message || error).includes('Missing Worker Matrix template parameter: overviewGeneration'),
    'a non-design entry should not resolve the design-only overview token'
  );
});
