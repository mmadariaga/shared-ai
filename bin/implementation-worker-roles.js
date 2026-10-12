'use strict';

const { AGENTS } = require('../sai/tools/planning-parts');

// Phase membership is separate from the closed set of installed worker roles.
// Models and other harness tunables remain owned by the manifest entries.
const IMPLEMENTATION_REGISTRATION = Object.freeze({
  phase: 'implementation',
  command: 'sai-3-implement',
  roles: Object.freeze(AGENTS.map(agent =>
    Object.freeze({
      workerName: `sai-3-${agent}-worker`,
      workerContract: 'sai/commands/implement/worker.md',
    }),
  )),
});

module.exports = { IMPLEMENTATION_REGISTRATION };
