'use strict';

const { assignment, translate, permissionYaml } = require('./capabilities');

const PHASE_ORDER = Object.freeze([
  'spec',
  'design',
  'security',
  'performance',
  'accessibility',
  'commit',
  'archive',
  'backfill',
  'merge',
]);

// Closed direct-build role identity appended after the canonical phase
// entries. The implementer remains an explore-owned fast-lane worker;
// Direct-build mutation execution is deliberately routed through the existing
// backfill and archive phase workers rather than a second role.
const DIRECT_BUILD_ROLES = Object.freeze([
  Object.freeze({
    phase: 'direct-build',
    workerName: 'sai-direct-build-worker',
    workerContract: 'sai/commands/explore/direct-build-worker.md',
    bindingStem: 'direct-build',
    tier: 'budget',
  }),
]);

// Closed RED, GREEN, and review role identities of the implement and review
// commands, appended after the direct-build role. Each role pins its own
// contract and binding stem; the commands live outside the shared
// orchestration, so these roles render from the standalone binding templates.
const IMPLEMENT_ROLES = Object.freeze([
  Object.freeze({
    phase: 'red',
    workerName: 'sai-3-red-worker',
    workerContract: 'sai/commands/implement/red-worker.md',
    bindingStem: 'red',
    tier: 'budget',
  }),
  Object.freeze({
    phase: 'green',
    workerName: 'sai-3-green-worker',
    workerContract: 'sai/commands/implement/green-worker.md',
    bindingStem: 'green',
    tier: 'budget',
  }),
  Object.freeze({
    phase: 'review',
    workerName: 'sai-4-review-worker',
    workerContract: 'sai/commands/review/worker.md',
    bindingStem: 'review',
  }),
]);

// The implement, review, spec, design, audit, merge, and commit roles render from
// their own binding templates, which carry only the create and continue calls:
// their coordinator owns the lifecycle. The spec, design, audit, merge, and
// commit phases keep their positions and names in PHASE_ORDER; only their binding
// template differs from the other phases.
const STANDALONE_PHASES = new Set([
  ...IMPLEMENT_ROLES.map(role => role.phase),
  'spec',
  'design',
  'security',
  'performance',
  'accessibility',
  'merge',
  'commit',
]);
// Every role that pins its own contract and is validated by position after the
// canonical phases.
const PINNED_ROLES = Object.freeze([...DIRECT_BUILD_ROLES, ...IMPLEMENT_ROLES]);
const PINNED_ROLE_BY_WORKER = Object.freeze(Object.fromEntries(
  PINNED_ROLES.map(role => [role.workerName, role]),
));
const PINNED_ROLE_BY_PHASE = Object.freeze(Object.fromEntries(
  PINNED_ROLES.map(role => [role.phase, role]),
));
const EXPECTED_ENTRY_COUNT = PHASE_ORDER.length + PINNED_ROLES.length;

const REQUIRED_FIELDS = Object.freeze([
  'phase',
  'workerName',
  'workerContract',
  'bindingStem',
  'claudeAgent',
  'opencodeAgent',
]);

const TOKEN = /\{\{([A-Za-z0-9_.-]+)\}\}/g;

const PHASE_WORKER_NAME = Object.freeze({
  spec: 'sai-1-spec-proposal-worker',
  design: 'sai-2-design-worker',
  security: 'sai-5-security-worker',
  performance: 'sai-6-performance-worker',
  accessibility: 'sai-7-accessibility-worker',
  commit: 'sai-commit-worker',
  archive: 'sai-archive-worker',
  backfill: 'sai-backfill-worker',
  merge: 'sai-merge-worker',
});

const PHASE_CONTRACT_DIR = Object.freeze({
  spec: 'spec',
  design: 'design',
  security: 'security',
  performance: 'performance',
  accessibility: 'accessibility',
  commit: 'commit',
  archive: 'archive',
  backfill: 'backfill',
  merge: 'merge',
});

const PHASE_WORKER_IDENTITY = /^sai-[12567]-[a-z-]+-worker$|^sai-commit-worker$|^sai-archive-worker$|^sai-backfill-worker$|^sai-merge-worker$/;
const INVOCATION_ENVELOPE_FIELD = 'arguments_value';
const RETIRED_INVOCATION_ENVELOPE_FIELD = ['wrapper', 'echo', 'value'].join('_');


function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

function invalidEntry(index, field) {
  throw new Error(`Worker Matrix entry ${index} is missing required field: ${field}`);
}

function assertOneStringInvocationEnvelope(entry, index) {
  const serialized = JSON.stringify(entry);
  if (serialized.includes(RETIRED_INVOCATION_ENVELOPE_FIELD)) {
    throw new Error(
      `Worker Matrix entry ${index} declares retired ${RETIRED_INVOCATION_ENVELOPE_FIELD}; `
      + `the InvocationEnvelope contains only ${INVOCATION_ENVELOPE_FIELD}`
    );
  }
}

function validateEntry(entry, index) {
  if (!entry || typeof entry !== 'object') throw new Error(`Worker Matrix entry ${index} must be an object`);
  assertOneStringInvocationEnvelope(entry, index);
  const autoRole = PINNED_ROLE_BY_PHASE[entry.phase];
  if (autoRole && (!PINNED_ROLE_BY_WORKER[entry.workerName] || PINNED_ROLE_BY_WORKER[entry.workerName].phase !== entry.phase)) {
    throw new Error(`Invalid Worker Matrix worker identity for ${entry.phase}: ${entry.workerName}`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') invalidEntry(index, field);
  }
  if (autoRole) {
    if (entry.workerContract !== autoRole.workerContract) {
      throw new Error(`Invalid Worker Matrix contract path for ${entry.phase}: ${entry.workerContract}`);
    }
  } else {
    if (!PHASE_ORDER.includes(entry.phase)) throw new Error(`Unknown Worker Matrix phase: ${entry.phase}`);
    if (!PHASE_WORKER_IDENTITY.test(entry.workerName)) {
      throw new Error(`Invalid Worker Matrix worker identity for ${entry.phase}: ${entry.workerName}`);
    }
    if (entry.workerContract !== `sai/commands/${PHASE_CONTRACT_DIR[entry.phase]}/worker.md`) {
      throw new Error(`Invalid Worker Matrix contract path for ${entry.phase}: ${entry.workerContract}`);
    }
  }
}

function defineWorkerMatrix(entries, capabilities = require('../sai/install-manifest.json').capabilities) {
  if (!Array.isArray(entries) || entries.length !== EXPECTED_ENTRY_COUNT) {
    throw new Error(`Worker Matrix requires exactly ${EXPECTED_ENTRY_COUNT} entries`);
  }
  const seenPhases = new Set();
  const seenWorkers = new Set();
  let pinnedSeen = 0;
  entries.forEach((entry, index) => {
    validateEntry(entry, index);
    if (seenWorkers.has(entry.workerName)) {
      throw new Error(`Duplicate Worker Matrix worker name: ${entry.workerName}`);
    }
    seenWorkers.add(entry.workerName);
    if (PINNED_ROLE_BY_PHASE[entry.phase]) {
      pinnedSeen += 1;
      if (pinnedSeen > PINNED_ROLES.length) {
        throw new Error(`Duplicate Worker Matrix phase: ${entry.phase}`);
      }
      const expected = PINNED_ROLES[pinnedSeen - 1];
      if (entry.workerName !== expected.workerName) {
        throw new Error(
          `Worker Matrix pinned role out of order; expected ${expected.workerName} before ${PINNED_ROLES[pinnedSeen].workerName}`
        );
      }
    } else {
      if (seenPhases.has(entry.phase)) {
        throw new Error(`Duplicate Worker Matrix phase: ${entry.phase}`);
      }
      seenPhases.add(entry.phase);
      if (entry.phase !== PHASE_ORDER[index]) {
        throw new Error(`Worker Matrix phase ${entry.phase} is out of order; expected ${PHASE_ORDER[index]}`);
      }
    }
  });
  return Object.freeze({
    phases: PHASE_ORDER,
    entries: Object.freeze(entries.map(entry => {
      const profileName = assignment(capabilities, 'agents', entry.workerName);
      const claude = translate(capabilities, profileName, 'claude');
      const opencode = translate(capabilities, profileName, 'opencode');
      return Object.freeze({ ...clone(entry),
        capabilityProfile: profileName,
        claudeAgent: { ...clone(entry.claudeAgent), tools: claude.tools },
        opencodeAgent: { ...clone(entry.opencodeAgent), permissionBlock: permissionYaml(opencode.permissions) },
      });
    })),
  });
}

function lookup(parameters, token) {
  const value = token.split('.').reduce((current, key) => current && current[key], parameters);
  if (value === undefined || value === null) throw new Error(`Missing Worker Matrix template parameter: ${token}`);
  return Array.isArray(value) ? value.join('\n') : String(value);
}

function renderWorkerTemplate(template, parameters) {
  if (typeof template !== 'string') throw new Error('Worker Matrix template must be a string');
  if (!parameters || typeof parameters !== 'object') throw new Error('Worker Matrix template parameters must be an object');
  const rendered = template.replace(TOKEN, (_, token) => lookup(parameters, token));
  if (TOKEN.test(rendered)) throw new Error('Worker Matrix rendering left an unresolved template token');
  TOKEN.lastIndex = 0;
  if (rendered.includes(RETIRED_INVOCATION_ENVELOPE_FIELD)) {
    throw new Error(
      `Worker Matrix rendering declares retired ${RETIRED_INVOCATION_ENVELOPE_FIELD}; `
      + `the InvocationEnvelope contains only ${INVOCATION_ENVELOPE_FIELD}`
    );
  }
  return rendered;
}

function materializeWorkerMatrix(matrix, templates) {
  if (!matrix || !Array.isArray(matrix.entries) || !templates) throw new Error('Worker Matrix and templates are required');
  const requiredTemplates = ['claudeBinding', 'opencodeBinding', 'claudeAgent', 'opencodeAgent'];
  for (const name of requiredTemplates) {
    if (typeof templates[name] !== 'string') throw new Error(`Missing Worker Matrix template: ${name}`);
  }
  return matrix.entries.flatMap(entry => {
    const common = { ...entry, canonicalFetch: `Fetch @${entry.workerContract} and follow it exactly.` };
    const standalone = STANDALONE_PHASES.has(entry.phase);
    const bindingTemplate = harness => {
      if (!standalone) return `${harness}Binding`;
      const name = `${harness}StandaloneBinding`;
      if (typeof templates[name] !== 'string') throw new Error(`Missing Worker Matrix template: ${name}`);
      return name;
    };
    const panelRenderBinding = harness => [
      'When the coordinator adapter declares a `progress_plan`,',
      `Fetch @sai/adapters/${harness}/panel-render.md for coordinator-owned task-list rendering;`,
      'render actions come from @sai/policies/todo-structure.md, and the worker never emits panel tool calls.',
    ].join('\n') + '\n\n';
    return [
      {
        kind: 'binding',
        harness: 'claude',
        phase: entry.phase,
        workerName: entry.workerName,
        destinationName: `${entry.bindingStem}-worker.md`,
        templateName: bindingTemplate('claude'),
        text: renderWorkerTemplate(templates[bindingTemplate('claude')], {
          ...common,
          harness: 'Claude Code',
          panelRenderBinding: panelRenderBinding('claude'),
        }),
      },
      {
        kind: 'binding',
        harness: 'opencode',
        phase: entry.phase,
        workerName: entry.workerName,
        destinationName: `${entry.bindingStem}-worker.md`,
        templateName: bindingTemplate('opencode'),
        text: renderWorkerTemplate(templates[bindingTemplate('opencode')], {
          ...common,
          harness: 'opencode',
          panelRenderBinding: panelRenderBinding('opencode'),
        }),
      },
      {
        kind: 'agent',
        harness: 'claude',
        phase: entry.phase,
        workerName: entry.workerName,
        destinationName: `${entry.workerName}.md`,
        templateName: 'claudeAgent',
        text: renderWorkerTemplate(templates.claudeAgent, { ...common, ...entry.claudeAgent }),
      },
      {
        kind: 'agent',
        harness: 'opencode',
        phase: entry.phase,
        workerName: entry.workerName,
        destinationName: `${entry.workerName}.md`,
        templateName: 'opencodeAgent',
        text: renderWorkerTemplate(templates.opencodeAgent, {
          ...common,
          ...entry.opencodeAgent,
          variantLine: entry.opencodeAgent.variant ? `variant: ${entry.opencodeAgent.variant}` : '',
        }),
      },
    ];
  });
}

function assertWorkerIdentity(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Worker Matrix identity requires an entry object');
  }
  const autoRole = PINNED_ROLE_BY_WORKER[entry.workerName];
  if (autoRole) {
    if (entry.phase !== autoRole.phase) {
      throw new Error(`Pinned worker ${entry.workerName} must declare its role phase ${autoRole.phase}; found ${entry.phase}`);
    }
    if (entry.workerContract !== autoRole.workerContract) {
      throw new Error(
        `Pinned worker ${entry.workerName} must pin its role contract ${autoRole.workerContract}; found ${entry.workerContract}`
      );
    }
    return;
  }
  const canonical = PHASE_WORKER_NAME[entry.phase];
  if (canonical !== undefined && entry.workerName !== canonical) {
    throw new Error(`Worker Matrix phase ${entry.phase} has misassigned worker identity ${entry.workerName}`);
  }
  const contractDir = PHASE_CONTRACT_DIR[entry.phase] || entry.phase;
  const expectedContract = `sai/commands/${contractDir}/worker.md`;
  if (entry.workerContract !== expectedContract) {
    throw new Error(`Worker Matrix phase ${entry.phase} has mismatched worker contract ${entry.workerContract}`);
  }
}

module.exports = {
  PHASE_ORDER,
  DIRECT_BUILD_ROLES,
  IMPLEMENT_ROLES,
  defineWorkerMatrix,
  renderWorkerTemplate,
  materializeWorkerMatrix,
  assertWorkerIdentity,
};
