'use strict';

// red-steps@1 — data module for the stateful stage machine that delivers
// the live RED worker's step file of `/sai-3-implement` by pointer. Built via
// linear-steps factory; the coordinator resets it at the start of every step.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'red-steps@1',
  steps: [
    'task-intake',
    'red-step',
  ],
  stageFiles: {
    'task-intake': 'none',
    'red-step': 'sai/commands/implement/steps/red-step.md',
  },
});

module.exports = machine;
