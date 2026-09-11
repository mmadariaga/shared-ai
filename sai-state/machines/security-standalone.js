'use strict';

// security-standalone@1 — data module for stateful stage machine owning
// happy-path step routing for standalone `sai-6-security` runs. Built via
// linear-steps factory.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'security-standalone@1',
  steps: [
    'resolve-security-scope',
    'discover-module-map',
    'resolve-sast-analysis',
    'resolve-sca',
    'close-security-outcome',
  ],
  stageFiles: {
    'resolve-security-scope': 'none',
    'discover-module-map': 'sai/commands/security/steps/discover-module-map.md',
    'resolve-sast-analysis': 'sai/commands/security/steps/resolve-sast-analysis.md',
    'resolve-sca': 'sai/commands/security/steps/resolve-sca.md',
    'close-security-outcome': 'sai/commands/security/steps/close-security-outcome.md',
  },
});

module.exports = machine;
