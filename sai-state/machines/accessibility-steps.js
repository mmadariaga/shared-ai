'use strict';

// accessibility-steps@1 — data module for the stateful stage machine that delivers
// the accessibility worker's step files of `/sai-7-accessibility` by pointer. Built via
// linear-steps factory; the audit coordinator emits each reported step to it
// and sends the next pointer from the response.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'accessibility-steps@1',
  steps: [
    'resolve-accessibility-scope',
    'map-ui-framework',
    'resolve-static-audit',
    'resolve-runtime-audit',
    'close-accessibility-outcome',
  ],
  stageFiles: {
    'resolve-accessibility-scope': 'none',
    'map-ui-framework': 'sai/commands/accessibility/steps/map-ui-framework.md',
    'resolve-static-audit': 'sai/commands/accessibility/steps/resolve-static-audit.md',
    'resolve-runtime-audit': 'sai/commands/accessibility/steps/resolve-runtime-audit.md',
    'close-accessibility-outcome': 'sai/commands/accessibility/steps/close-accessibility-outcome.md',
  },
});

module.exports = machine;
