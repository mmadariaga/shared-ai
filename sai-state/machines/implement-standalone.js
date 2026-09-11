'use strict';

// implement-standalone@1 — data module for stateful stage machine owning
// happy-path step routing for standalone `sai-3-implement` runs. Built via
// linear-steps factory.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'implement-standalone@1',
  steps: [
    'prereqs-resolution',
    'collapse-implemented-steps',
    'artifact-analysis',
    'documentation-review',
    'plan-generation',
    'validation',
  ],
  stageFiles: {
    'prereqs-resolution': 'none',
    'collapse-implemented-steps': 'sai/commands/implement/steps/collapse-implemented-steps.md',
    'artifact-analysis': 'sai/commands/implement/steps/artifact-analysis.md',
    'documentation-review': 'sai/commands/implement/steps/documentation-review.md',
    'plan-generation': 'sai/commands/implement/steps/plan-generation.md',
    validation: 'sai/commands/implement/steps/validation.md',
  },
});

module.exports = machine;
