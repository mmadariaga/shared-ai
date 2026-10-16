'use strict';

// green-new-steps@1 — data module for the stateful stage machine that delivers
// the live GREEN worker's step file of `/sai-3-implement-new` by pointer. Built via
// linear-steps factory; the coordinator resets it at the start of every step.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'green-new-steps@1',
  steps: [
    'task-intake',
    'green-step',
  ],
  stageFiles: {
    'task-intake': 'none',
    'green-step': 'sai/commands/implement-new/steps/green-step.md',
  },
});

module.exports = machine;
