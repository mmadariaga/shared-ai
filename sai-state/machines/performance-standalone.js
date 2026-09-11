'use strict';

// performance-standalone@1 — data module for stateful stage machine owning
// happy-path step routing for standalone `sai-7-performance` runs. Built via
// linear-steps factory.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'performance-standalone@1',
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
