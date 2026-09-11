'use strict';

// spec-standalone@1 — data module for stateful stage machine owning happy-path
// step routing for standalone `sai-1-spec` runs. Built via linear-steps factory.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'spec-standalone@1',
  steps: [
    'prereqs-and-change',
    'research',
    'proposal',
    'specs',
    'validation',
    'review',
  ],
  stageFiles: {
    'prereqs-and-change': 'none',
    research: 'sai/commands/spec/steps/research.md',
    proposal: 'sai/commands/spec/steps/proposal.md',
    specs: 'sai/commands/spec/steps/specs.md',
    validation: 'sai/commands/spec/steps/validation.md',
    review: 'sai/commands/spec/steps/review.md',
  },
});

module.exports = machine;
