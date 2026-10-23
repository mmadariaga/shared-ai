'use strict';

// spec-steps@1 — data module for the stateful stage machine that delivers the
// spec worker's step files of `/sai-1-spec` and `/sai-plan` by pointer. Built
// via linear-steps factory; the coordinator emits each reported step to it and
// sends the next pointer from the response.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'spec-steps@1',
  steps: [
    'spec-intake',
    'research',
    'proposal',
    'specs',
    'validation',
  ],
  stageFiles: {
    'spec-intake': 'none',
    research: 'sai/commands/spec/steps/research.md',
    proposal: 'sai/commands/spec/steps/proposal.md',
    specs: 'sai/commands/spec/steps/specs.md',
    validation: 'sai/commands/spec/steps/validation.md',
  },
});

module.exports = machine;
