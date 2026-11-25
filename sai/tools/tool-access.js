#!/usr/bin/env node
'use strict';

// Evidence is supplied by the live harness, never inferred from rendered text.
function verifyAccess(required, evidence) {
  if (!Array.isArray(required) || !Array.isArray(evidence)) throw new Error('Required operations and live evidence must be arrays');
  const operations = required.map(operation => {
    if (typeof operation.action !== 'string' || typeof operation.resource !== 'string') throw new Error('Each operation requires action and resource');
    const observed = evidence.find(item => item.action === operation.action && item.resource === operation.resource);
    const status = !observed ? 'unverified'
      : observed.available === false ? 'unavailable'
      : observed.effect === 'allow' && observed.available === true ? 'allowed'
      : ['ask', 'deny'].includes(observed.effect) ? 'permission-blocked' : 'unverified';
    return { ...operation, status,
      ...(status === 'allowed' ? {} : { remediation: status === 'permission-blocked'
        ? `Enable ${operation.action} for ${operation.resource} in the selected agent's native permissions, subject to policy.`
        : status === 'unavailable' ? `Install or enable the harness integration providing ${operation.action}.`
          : `Evaluate ${operation.action} for ${operation.resource} in the live harness before claiming effective access.` }),
    };
  });
  return { verdict: operations.every(operation => operation.status === 'allowed') ? 'pass' : 'incomplete', operations };
}

function missingNotices(discards) {
  if (!Array.isArray(discards)) throw new Error('ladder_discards must be an array');
  return discards.filter(item => item.classification === 'unavailable' && item.granted === true && item.applicable === true
    && typeof item.tool === 'string' && item.tool.length > 0 && typeof item.reason === 'string'
    && typeof item.remediation === 'string' && item.remediation.trim().length > 0)
    .map(item => `> Research tool unavailable: ${item.tool} — ${item.reason}. ${item.remediation}`);
}

const usage = require('./usage');

const INPUT_FLAGS = { '--input-file': true };
const USAGE = {
  subcommands: {
    verify: {
      usage: ['node sai/tools/tool-access.js verify --input-file <path>'],
      examples: ['node sai/tools/tool-access.js verify --input-file verify-input.json'],
      flags: INPUT_FLAGS,
    },
    notices: {
      usage: ['node sai/tools/tool-access.js notices --input-file <path>'],
      examples: ['node sai/tools/tool-access.js notices --input-file notices-input.json'],
      flags: INPUT_FLAGS,
    },
  },
};

module.exports = { verifyAccess, missingNotices, USAGE };

if (require.main === module) {
  const guarded = usage.handle(USAGE, process.argv.slice(2));
  if (guarded !== null) process.exitCode = guarded;
  else try {
    const { extractInputFile, readInput } = require('./input-reader');
    const { argv, inputFile } = extractInputFile(process.argv.slice(2));
    const input = JSON.parse(readInput(inputFile));
    const report = argv[0] === 'notices' ? { notices: missingNotices(input.ladder_discards) }
      : argv[0] === 'verify' ? verifyAccess(input.required, input.evidence)
        : (() => { throw new Error(usage.error(USAGE, null, 'subcommand required')); })();
    process.stdout.write(JSON.stringify(report) + '\n');
    if (report.verdict === 'incomplete') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 2;
  }
}
