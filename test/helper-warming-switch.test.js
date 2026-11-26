'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const HARNESSES = ['claude', 'opencode'];
const HELPERS = ['budget-explorer', 'budget-subagent'];

for (const harness of HARNESSES) {
  for (const helper of HELPERS) {
    test(`E1 E2 ${harness} ${helper} limits the warming switch to a dispatcher that disposes the helper`, () => {
      const text = read(`skills/${harness}/${helper}/SKILL.md`);
      const section = text.slice(text.indexOf('## Warming and dispose'));
      assert.match(section, /only (?:by a dispatcher that disposes|when you dispose)/, 'the switch is conditioned on the dispatcher disposing the helper');
      assert.doesNotMatch(section, /dispatches its own helpers/, 'the worker rule stays in the policy, not restated here');
      assert.match(section, /§ The switch/, 'the single source is named');
      assert.doesNotMatch(section, /Its task message and every continuation end with the warming switch/, 'no unconditional switch remains');
    });
  }
}

test('E1 the cache-warming policy keeps the no-switch rule for a worker that dispatches helpers', () => {
  const policy = read('sai/policies/cache-warming.md');
  assert.match(policy, /A dispatcher that cannot dispose \(a worker that dispatches its own helpers\) sends no switch/);
});

test('E8 E9 E10 explore disposes its explorers at the route start and not when entering the POC lane', () => {
  const selector = read('sai/commands/explore/steps/route-selector.md');
  const heading = selector.indexOf('\n## Route start\n');
  assert.ok(heading > selector.indexOf('\n## After a valid answer\n'), 'the section follows the answer handling');
  const section = selector.slice(heading, selector.indexOf('\n## ', heading + 5));
  assert.match(section, /dispose every live explorer/);
  assert.match(section, /transfer\.js close/);
  assert.match(section, /same-turn batch/);
  assert.match(section, /POC lane is not a route start/);
  assert.match(section, /new explorer with its ready handshake/);
  const after = selector.slice(selector.indexOf('\n## After a valid answer\n'));
  assert.match(after, /Right after that emit is accepted and before you follow the returned pointer, run the dispose of `## Route start`/);
  const body = read('sai/commands/explore/body.md');
  assert.doesNotMatch(body, /and when a route ends/);
  assert.match(body, /when a route starts/);
});
