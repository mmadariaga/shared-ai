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

test('published build specification preserves coordinator-owned fast-track grants', () => {
  const spec = read('openspec/specs/sai-build-command/spec.md');
  const requirement = title => {
    const heading = `### Requirement: ${title}\n`;
    const start = spec.indexOf(heading);
    assert.notEqual(start, -1, `published specification should contain ${title}`);
    const next = spec.indexOf('\n### Requirement:', start + heading.length);
    return spec.slice(start + heading.length, next === -1 ? spec.length : next);
  };
  const activation = requirement('Apply fast-track is injected and composition-owned');
  assert.match(activation, /print `> FAST-TRACK MODE ACTIVE` exactly once at implement activation, not at apply activation/);
  const commit = requirement('Apply commit grant is active before the first Step');
  assert.match(commit, /At apply segment entry the apply coordinator SHALL set `session_commit_authorized` from injected fast-track state before Step projection or dispatch/);
});

test('fast-track never skips the explore open-decision reconfirmation', () => {
  const policy = read('sai/policies/fast-track-flag.md');
  assert.match(policy, /open-decision reconfirmation at `Crystallize` entry\s+\(`sai\/commands\/explore\/steps\/open-decisions\.md`\) runs unchanged under\s+`--fast-track`/);
  assert.match(policy, /every open decision is asked/);
  assert.match(read('AGENTS.md'), /open-decision reconfirmation at Crystallize entry \(`sai\/commands\/explore\/steps\/open-decisions\.md`\) always runs/);
  assert.match(read('sai/commands/explore/steps/open-decisions.md'), /`--fast-track` leaves this step unchanged \(`sai\/policies\/fast-track-flag\.md`\)/);
});
