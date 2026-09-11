'use strict';

// review-standalone@1 — data module for stateful stage machine owning
// happy-path step routing for standalone `sai-5-review` runs. Built via
// linear-steps factory.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'review-standalone@1',
  steps: [
    'resolve-change',
    'establish-diff-scope',
    'resolve-review-analysis',
    'resolve-mutation-analysis',
    'close-review-outcome',
  ],
  stageFiles: {
    'resolve-change': 'none',
    'establish-diff-scope': 'sai/commands/review/steps/establish-diff-scope.md',
    'resolve-review-analysis': 'sai/commands/review/steps/resolve-review-analysis.md',
    'resolve-mutation-analysis': 'sai/commands/review/steps/resolve-mutation-analysis.md',
    'close-review-outcome': 'sai/commands/review/steps/close-review-outcome.md',
  },
});

module.exports = machine;
