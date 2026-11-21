'use strict';

// red-steps@1 — data module for the stateful stage machine that delivers
// the RED worker's step file by pointer: the plan RED of `/sai-2-design` (its
// plan brief) and the fix RED of `/sai-3-implement` (its finding brief) follow
// the same file. Built via linear-steps factory; the coordinator resets it at
// the start of every brief.

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
