'use strict';

// accessibility-standalone@1 — data module for stateful stage machine owning
// happy-path step routing for standalone `sai-8-accessibility` runs. Built via
// linear-steps factory.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'accessibility-standalone@1',
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
