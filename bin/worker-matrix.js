'use strict';

const PHASE_ORDER = Object.freeze([
  'spec',
  'design',
  'implementation',
  'review',
  'security',
  'performance',
  'accessibility',
]);

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

function validateEntry(entry, index) {
  if (!entry || typeof entry !== 'object') throw new Error(`Worker Matrix entry ${index} must be an object`);
  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') invalidEntry(index, field);
  }
  if (!PHASE_ORDER.includes(entry.phase)) throw new Error(`Unknown Worker Matrix phase: ${entry.phase}`);
  if (!/^sai-[1278]-[a-z-]+-worker$|^sai-3-implementation-worker$|^sai-5-review-worker$|^sai-6-security-worker$/.test(entry.workerName)) {
    throw new Error(`Invalid Worker Matrix worker identity for ${entry.phase}: ${entry.workerName}`);
  }
  if (!/^sai\/orchestration\/workers\/sai-[^/]+\.md$/.test(entry.workerContract)) {
    throw new Error(`Invalid Worker Matrix contract path for ${entry.phase}: ${entry.workerContract}`);
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
  if (!Array.isArray(entries) || entries.length !== PHASE_ORDER.length) {
    throw new Error(`Worker Matrix requires exactly ${PHASE_ORDER.length} phase entries`);
  }
  const seen = new Set();
  entries.forEach((entry, index) => {
    validateEntry(entry, index);
    if (seen.has(entry.phase)) throw new Error(`Duplicate Worker Matrix phase: ${entry.phase}`);
    seen.add(entry.phase);
    if (entry.phase !== PHASE_ORDER[index]) {
      throw new Error(`Worker Matrix phase ${entry.phase} is out of order; expected ${PHASE_ORDER[index]}`);
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
    return [
      {
        kind: 'binding',
        harness: 'claude',
        phase: entry.phase,
        destinationName: `${entry.bindingStem}-worker.md`,
        templateName: 'claudeBinding',
        text: renderWorkerTemplate(templates.claudeBinding, { ...common, harness: 'Claude Code' }),
      },
      {
        kind: 'binding',
        harness: 'opencode',
        phase: entry.phase,
        destinationName: `${entry.bindingStem}-worker.md`,
        templateName: 'opencodeBinding',
        text: renderWorkerTemplate(templates.opencodeBinding, { ...common, harness: 'opencode' }),
      },
      {
        kind: 'agent',
        harness: 'claude',
        phase: entry.phase,
        destinationName: `${entry.workerName}.md`,
        templateName: 'claudeAgent',
        text: renderWorkerTemplate(templates.claudeAgent, { ...common, ...entry.claudeAgent }),
      },
      {
        kind: 'agent',
        harness: 'opencode',
        phase: entry.phase,
        destinationName: `${entry.workerName}.md`,
        templateName: 'opencodeAgent',
        text: renderWorkerTemplate(templates.opencodeAgent, { ...common, ...entry.opencodeAgent }),
      },
    ];
  });
}

module.exports = {
  PHASE_ORDER,
  defineWorkerMatrix,
  renderWorkerTemplate,
  materializeWorkerMatrix,
};
