'use strict';

// review-new-steps@1 — data module for the stateful stage machine that delivers
// the review worker's step files of `/sai-4-review-new` by pointer. Built via
// linear-steps factory; the coordinator emits each reported step to it and sends
// the next pointer from the response.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'review-new-steps@1',
  steps: [
    'review-intake',
    'establish-diff-scope',
    'resolve-review-analysis',
    'close-review-outcome',
  ],
  stageFiles: {
    'review-intake': 'none',
    'establish-diff-scope': 'sai/commands/review-new/steps/establish-diff-scope.md',
    'resolve-review-analysis': 'sai/commands/review-new/steps/resolve-review-analysis.md',
    'close-review-outcome': 'sai/commands/review-new/steps/close-review-outcome.md',
  },
});

module.exports = machine;
