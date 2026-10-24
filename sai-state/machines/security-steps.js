'use strict';

// security-steps@1 — data module for the stateful stage machine that delivers
// the security worker's step files of `/sai-5-security` by pointer. Built via
// linear-steps factory; the audit coordinator emits each reported step to it
// and sends the next pointer from the response.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'security-steps@1',
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
