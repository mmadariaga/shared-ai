'use strict';

// design-steps@1 — data module for the stateful stage machine that delivers the
// design worker's step files of `/sai-2-design` and `/sai-plan` by pointer.
// Built via linear-steps factory; the coordinator emits each reported step to
// it and sends the next pointer from the response. The overview is not a step
// of the machine: the coordinator sends it as a separate continuation that
// names `sai/commands/design/steps/overview.md`.

const { createLinearStepMachine } = require('./linear-steps.js');

const machine = createLinearStepMachine({
  machineId: 'design-steps@1',
  steps: [
    'design-intake',
    'research',
    'design',
    'tasks',
    'interfaces',
  ],
  stageFiles: {
    'design-intake': 'none',
    research: 'sai/commands/design/steps/research.md',
    design: 'sai/commands/design/steps/design.md',
    tasks: 'sai/commands/design/steps/tasks.md',
    interfaces: 'sai/commands/design/steps/interfaces.md',
  },
});

module.exports = machine;
