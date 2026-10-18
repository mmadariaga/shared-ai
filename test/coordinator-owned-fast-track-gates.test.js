'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  // Normalize CRLF checkouts (Windows autocrlf) to LF so heading scans
  // hold on every platform. See .gitattributes (eol=lf).
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');
}

test('published build specification keeps fast-track out of build and with the implement coordinator', () => {
  const spec = read('openspec/specs/sai-build-command/spec.md');
  const heading = '### Requirement: Build strips residual fast-track tokens before resolution\n';
  const start = spec.indexOf(heading);
  assert.notEqual(start, -1, 'published specification should contain the fast-track token requirement');
  const next = spec.indexOf('\n### Requirement:', start + heading.length);
  const requirement = spec.slice(start + heading.length, next === -1 ? spec.length : next);
  assert.match(requirement, /every `--fast-track` token SHALL be removed from `arguments_value` in any order, by the first implementation segment's Start step/);
  assert.match(requirement, /SHALL not make build a fifth parser or create build-local fast-track state/);
  assert.match(read('sai/commands/implement/coordinator.md'), /Drop any `--fast-track` token from `arguments_value`/);
});

test('fast-track never skips the explore open-decision reconfirmation', () => {
  const policy = read('sai/policies/fast-track-flag.md');
  assert.match(policy, /open-decision reconfirmation at `Crystallize` entry\s+\(`sai\/commands\/explore\/steps\/open-decisions\.md`\) runs unchanged under\s+`--fast-track`/);
  assert.match(policy, /every open decision is asked/);
  assert.match(read('AGENTS.md'), /open-decision reconfirmation at Crystallize entry \(`sai\/commands\/explore\/steps\/open-decisions\.md`\) always runs/);
  assert.match(read('sai/commands/explore/steps/open-decisions.md'), /`--fast-track` leaves this step unchanged \(`sai\/policies\/fast-track-flag\.md`\)/);
});
