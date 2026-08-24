'use strict';

const PHASE_ORDER = Object.freeze([
  'spec',
  'design',
  'implementation',
  'review',
  'security',
  'performance',
  'accessibility',
  'commit',
  'archive',
  'backfill',
  'merge',
]);

// Closed RED/GREEN apply role identities appended after the nine canonical
// phase entries. Each role pins its workerName to a role-specific apply worker
// contract and a unique binding stem so the shared apply phase never resolves
// through a sibling entry.
const APPLY_ROLES = Object.freeze([
  Object.freeze({
    phase: 'apply',
    workerName: 'sai-4-red-worker',
    workerContract: 'sai/commands/apply/red-worker.md',
    bindingStem: 'red',
    tier: 'budget',
  }),
  Object.freeze({
    phase: 'apply',
    workerName: 'sai-4-green-worker',
    workerContract: 'sai/commands/apply/green-worker.md',
    bindingStem: 'green',
    tier: 'budget',
  }),
]);

// Closed auto-fast role identities appended after the apply roles. The
// implementer remains an explore-owned fast-lane worker; Auto-fast mutation
// execution is deliberately routed through the existing backfill and archive
// phase workers rather than a third role.
const AUTOFAST_ROLES = Object.freeze([
  Object.freeze({
    phase: 'autofast-implement',
    workerName: 'sai-autofast-implement-worker',
    workerContract: 'sai/commands/explore/autofast-implement-worker.md',
    bindingStem: 'autofast-implement',
    tier: 'budget',
  }),
]);

const APPLY_PHASE = 'apply';
const AUTOFAST_ROLE_BY_WORKER = Object.freeze(Object.fromEntries(
  AUTOFAST_ROLES.map(role => [role.workerName, role]),
));
const AUTOFAST_ROLE_BY_PHASE = Object.freeze(Object.fromEntries(
  AUTOFAST_ROLES.map(role => [role.phase, role]),
));
const EXPECTED_ENTRY_COUNT = PHASE_ORDER.length + APPLY_ROLES.length + AUTOFAST_ROLES.length;

const REQUIRED_FIELDS = Object.freeze([
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
]);

const TOKEN = /\{\{([A-Za-z0-9_.-]+)\}\}/g;

const PHASE_WORKER_NAME = Object.freeze({
  spec: 'sai-1-spec-proposal-worker',
  design: 'sai-2-design-worker',
  implementation: 'sai-3-implementation-worker',
  review: 'sai-5-review-worker',
  security: 'sai-6-security-worker',
  performance: 'sai-7-performance-worker',
  accessibility: 'sai-8-accessibility-worker',
  commit: 'sai-commit-worker',
  archive: 'sai-archive-worker',
  backfill: 'sai-backfill-worker',
  merge: 'sai-merge-worker',
});

const PHASE_CONTRACT_DIR = Object.freeze({
  spec: 'spec',
  design: 'design',
  implementation: 'implement',
  review: 'review',
  security: 'security',
  performance: 'performance',
  accessibility: 'accessibility',
  commit: 'commit',
  archive: 'archive',
  backfill: 'backfill',
  merge: 'merge',
});

const PHASE_WORKER_IDENTITY = /^sai-[1278]-[a-z-]+-worker$|^sai-3-implementation-worker$|^sai-5-review-worker$|^sai-6-security-worker$|^sai-commit-worker$|^sai-archive-worker$|^sai-backfill-worker$|^sai-merge-worker$/;
const INVOCATION_ENVELOPE_FIELD = 'arguments_value';
const RETIRED_INVOCATION_ENVELOPE_FIELD = ['wrapper', 'echo', 'value'].join('_');

const APPLY_CONTRACT_BY_WORKER = Object.freeze(Object.fromEntries(
  APPLY_ROLES.map(role => [role.workerName, role.workerContract]),
));

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
  const autoRole = AUTOFAST_ROLE_BY_PHASE[entry.phase];
  if (entry.phase === APPLY_PHASE && APPLY_CONTRACT_BY_WORKER[entry.workerName] === undefined) {
    throw new Error(`Invalid Worker Matrix worker identity for ${entry.phase}: ${entry.workerName}`);
  }
  if (autoRole && (!AUTOFAST_ROLE_BY_WORKER[entry.workerName] || AUTOFAST_ROLE_BY_WORKER[entry.workerName].phase !== entry.phase)) {
    throw new Error(`Invalid Worker Matrix worker identity for ${entry.phase}: ${entry.workerName}`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') invalidEntry(index, field);
  }
  if (entry.phase === APPLY_PHASE) {
    if (!/^sai\/commands\/apply\/(?:red|green)-worker\.md$/.test(entry.workerContract)) {
      throw new Error(`Invalid Worker Matrix contract path for ${entry.phase}: ${entry.workerContract}`);
    }
  } else if (autoRole) {
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
  if (!['Agent', 'task'].includes(entry.dispatchPrimitive)) {
    throw new Error(`Invalid Worker Matrix dispatch primitive for ${entry.phase}: ${entry.dispatchPrimitive}`);
  }
  if (!Array.isArray(entry.replacementFields) || entry.replacementFields.length === 0) {
    throw new Error(`Worker Matrix replacement fields must be non-empty for ${entry.phase}`);
  }
  if (!Array.isArray(entry.helperPermissions)) {
    throw new Error(`Worker Matrix helper permissions must be an array for ${entry.phase}`);
  }
  if (entry.phase !== 'design' && (entry.overviewGeneration || entry.noticeContinuation)) {
    throw new Error(`Design-only Worker Matrix options leaked into ${entry.phase}`);
  }
  if (entry.phase === 'design' && (!entry.overviewGeneration || !entry.noticeContinuation)) {
    throw new Error('Design Worker Matrix entry must declare overview and notice options');
  }
}

function defineWorkerMatrix(entries) {
  if (!Array.isArray(entries) || entries.length !== EXPECTED_ENTRY_COUNT) {
    throw new Error(`Worker Matrix requires exactly ${EXPECTED_ENTRY_COUNT} entries`);
  }
  const seenPhases = new Set();
  const seenWorkers = new Set();
  let applySeen = 0;
  let autofastSeen = 0;
  entries.forEach((entry, index) => {
    validateEntry(entry, index);
    if (seenWorkers.has(entry.workerName)) {
      throw new Error(`Duplicate Worker Matrix worker name: ${entry.workerName}`);
    }
    seenWorkers.add(entry.workerName);
    if (entry.phase === APPLY_PHASE) {
      applySeen += 1;
      if (applySeen > APPLY_ROLES.length) {
        throw new Error(`Duplicate Worker Matrix phase: ${entry.phase}`);
      }
      const expected = APPLY_ROLES[applySeen - 1];
      if (entry.workerName !== expected.workerName) {
        throw new Error(
          `Worker Matrix apply role out of order; expected ${expected.workerName} before ${APPLY_ROLES[applySeen].workerName}`
        );
      }
    } else if (AUTOFAST_ROLE_BY_PHASE[entry.phase]) {
      autofastSeen += 1;
      if (autofastSeen > AUTOFAST_ROLES.length) {
        throw new Error(`Duplicate Worker Matrix phase: ${entry.phase}`);
      }
      const expected = AUTOFAST_ROLES[autofastSeen - 1];
      if (entry.workerName !== expected.workerName) {
        throw new Error(
          `Worker Matrix auto-fast role out of order; expected ${expected.workerName} before ${AUTOFAST_ROLES[autofastSeen].workerName}`
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
    entries: Object.freeze(entries.map(entry => Object.freeze(clone(entry)))),
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
    const panelRenderBinding = harness => entry.phase === APPLY_PHASE
      ? ''
      : [
        'When the coordinator adapter declares a `progress_plan`,',
        `Fetch @sai/adapters/${harness}/panel-render.md and use it for coordinator-owned routed progress task-list rendering.`,
        'Render actions and deterministic state derivation come from @sai/policies/todo-structure.md; the worker never emits panel tool calls.',
        'When no `progress_plan` is declared, no plan-based list is rendered; a declared `step_pointer_map` still routes active-step continuation pointers.',
      ].join('\n') + '\n\n';
    return [
      {
        kind: 'binding',
        harness: 'claude',
        phase: entry.phase,
        workerName: entry.workerName,
        destinationName: `${entry.bindingStem}-worker.md`,
        templateName: 'claudeBinding',
        text: renderWorkerTemplate(templates.claudeBinding, {
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
        templateName: 'opencodeBinding',
        text: renderWorkerTemplate(templates.opencodeBinding, {
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
        text: renderWorkerTemplate(templates.opencodeAgent, { ...common, ...entry.opencodeAgent }),
      },
    ];
  });
}

function assertWorkerIdentity(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Worker Matrix identity requires an entry object');
  }
  if (entry.phase === APPLY_PHASE) {
    const expectedContract = APPLY_CONTRACT_BY_WORKER[entry.workerName];
    if (expectedContract === undefined) {
      throw new Error(`Unknown apply worker identity: ${entry.workerName}`);
    }
    if (entry.workerContract !== expectedContract) {
      throw new Error(
        `Apply worker ${entry.workerName} must pin its role-specific contract ${expectedContract}; found ${entry.workerContract}`
      );
    }
    return;
  }
  const autoRole = AUTOFAST_ROLE_BY_WORKER[entry.workerName];
  if (autoRole) {
    if (entry.phase !== autoRole.phase) {
      throw new Error(`Auto-fast worker ${entry.workerName} must declare its role phase ${autoRole.phase}; found ${entry.phase}`);
    }
    if (entry.workerContract !== autoRole.workerContract) {
      throw new Error(
        `Auto-fast worker ${entry.workerName} must pin its explore-owned contract ${autoRole.workerContract}; found ${entry.workerContract}`
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
  APPLY_ROLES,
  AUTOFAST_ROLES,
  defineWorkerMatrix,
  renderWorkerTemplate,
  materializeWorkerMatrix,
  assertWorkerIdentity,
};
