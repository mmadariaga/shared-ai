'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { COMMAND_FIELDS } = require('../sai/tools/worker-report-validator.js');

const AUDITS = ['security', 'performance', 'accessibility'];
const card = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'audit', 'worker-common.md'), 'utf8');

/** The fenced `completed` shape that follows the line naming the audit. */
function completedShape(audit) {
  const match = new RegExp(`The \`completed\` report of the ${audit} audit:\n\n\`\`\`yaml\n([\\s\\S]*?)\`\`\``).exec(card);
  assert.ok(match, `worker-common.md shows one completed shape for the ${audit} audit`);
  return match[1];
}

for (const audit of AUDITS) {
  test(`audit worker card: the ${audit} completed shape carries the counts keys its validator accepts`, () => {
    const shape = completedShape(audit);
    const counts = /^counts: \{(.*)\}$/m.exec(shape);
    assert.ok(counts, 'the shape has a counts line');
    const cardKeys = counts[1].split(',').map((entry) => entry.split(':')[0].trim());
    assert.deepEqual(cardKeys, COMMAND_FIELDS[audit].counts.type.keys);
    assert.match(shape, /^report_path: string$/m);
  });
}
