'use strict';

// performance-steps@1 — data module for the stateful stage machine that delivers
// the performance worker's step files of `/sai-6-performance` by pointer. Built via
// linear-steps factory; the audit coordinator emits each reported step to it
// and sends the next pointer from the response.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'performance-steps@1',
  steps: [
    'resolve-performance-scope',
    'map-stack-hot-paths',
    'audit-performance-tiers',
    'resolve-diagnostics',
    'close-performance-outcome',
  ],
  stageFiles: {
    'resolve-performance-scope': 'none',
    'map-stack-hot-paths': 'sai/commands/performance/steps/map-stack-hot-paths.md',
    'audit-performance-tiers': 'sai/commands/performance/steps/audit-performance-tiers.md',
    'resolve-diagnostics': 'sai/commands/performance/steps/resolve-diagnostics.md',
    'close-performance-outcome': 'sai/commands/performance/steps/close-performance-outcome.md',
  },
});

module.exports = machine;
