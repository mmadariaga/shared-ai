'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('I7: the sai-workflow schema declares the optional telemetry artifact with a template and no dependency', () => {
  const schema = read('openspec/schemas/sai-workflow/schema.yaml');
  const start = schema.indexOf('  - id: telemetry');
  assert.ok(start >= 0, 'schema.yaml should declare the telemetry artifact');
  const entry = schema.slice(start, schema.indexOf('\napply:', start));
  assert.match(entry, /generates: telemetry\.md/);
  assert.match(entry, /requires: \[\]/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'openspec/schemas/sai-workflow/templates/telemetry.md')));
  assert.ok(!/requires:.*telemetry/.test(schema), 'no artifact requires telemetry');
});

test('I4: every plan review round file ends with the base-form Summary line', () => {
  const cycle = read('sai/commands/plan/cycle.md');
  assert.match(cycle, /End every round file with the line `Summary: High=<n> Medium=<n> Low=<n>`/);
  assert.match(cycle, /state in that file is `open`/);
});

test('I5: both coordinators fetch the telemetry policy and record telemetry before their closing line', () => {
  const plan = read('sai/commands/plan/coordinator.md');
  assert.match(plan, /Fetch `@sai\/policies\/change-telemetry\.md`/);
  assert.ok(plan.indexOf('record the change telemetry') < plan.indexOf('close the planning report with exactly'), 'telemetry comes before the plan closing line');
  assert.match(plan, /--command sai-plan[^\n]*--run-dir/);
  const build = read('sai/commands/build/coordinator.md');
  assert.match(build, /Fetch `@sai\/policies\/change-telemetry\.md`/);
  assert.ok(build.indexOf('record the change telemetry') < build.indexOf('End with exactly `Build done.`'), 'telemetry comes before the build closing line');
  assert.match(build, /--command sai-build/);
});

test('E1, E2, E3, E12, E13: the policy gates on the setting, skips relays, and commits only an unignored file', () => {
  const policy = read('sai/policies/change-telemetry.md');
  assert.match(policy, /experimental\.changeTelemetry` is `true`/);
  assert.match(policy, /do nothing, with no tool call, no file, no commit, and no line/);
  assert.match(policy, /`\/sai-explore` runs the plan coordinator[^\n]*`\/sai-deep-review`[^\n]*record nothing/);
  assert.match(policy, /add the `reason` as one line to the closing report/);
  assert.match(policy, /git check-ignore -q openspec\/changes\/\{name\}\/telemetry\.md/);
  assert.match(policy, /git add` that path alone and commit with `git commit -m "<subject>" -- <path>`/);
  assert.match(policy, /stays on disk uncommitted and one line of the closing report says so/);
  assert.match(policy, /Never force-add with `-f`, never push/);
});

test('I3: the setting is documented in the catalogue table and its own section', () => {
  const docs = read('docs/project-settings.md');
  assert.match(docs, /\| `experimental\.changeTelemetry` \| `true` or `false`/);
  assert.match(docs, /## Change telemetry/);
});

test('the tool resolution policy lists the collector and its invocation', () => {
  const resolution = read('sai/policies/tool-resolution.md');
  assert.match(resolution, /`change-telemetry\.js`: `node <tool-path> collect --harness/);
});
