'use strict';

// Opt-in: exercises the installed V2 server's real configuration merge and
// permission evaluator. No model, worker, mutation probe or persistent approval.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const registry = require('../sai/install-manifest.json').capabilities;
const { translate, projectSource } = require('../bin/capabilities');

function api(method, endpoint, data, directory) {
  const args = ['api', method, endpoint];
  if (data !== undefined) args.push('--data', JSON.stringify(data));
  if (directory) args.push('--header', `x-opencode-directory:${directory}`);
  const result = spawnSync('opencode', args, { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, `${method} ${endpoint}: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

test('opencode native effective access survives inherited allow/deny and keeps exclusions', {
  skip: process.env.SAI_RUNTIME_ACCESS_TEST !== '1',
}, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-capability-runtime-'));
  const agents = {};
  // Global rules intentionally disagree with profile grants and exclusions.
  const permissions = [
    { action: '*', resource: '*', effect: 'allow' },
    { action: 'read', resource: '*', effect: 'deny' },
    { action: 'execute', resource: '*', effect: 'deny' },
    { action: 'subagent', resource: '*', effect: 'allow' },
    { action: 'edit', resource: '*', effect: 'allow' },
  ];
  for (const profile of Object.keys(registry.profiles)) {
    agents[`sai-probe-${profile}`] = { mode: 'primary', description: 'No-model capability verification fixture', permissions: translate(registry, profile, 'opencode').permissions };
  }
  fs.writeFileSync(path.join(root, 'opencode.json'), JSON.stringify({ permissions, agents }));
  fs.mkdirSync(path.join(root, '.opencode', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(root, '.opencode', 'agents', 'sai-generic-probe.md'), projectSource(
    fs.readFileSync(path.join(__dirname, '..', 'agents', 'opencode', 'explore.md'), 'utf8'), registry, 'agents', 'explore', 'opencode'));
  fs.writeFileSync(path.join(root, 'fixture.txt'), 'read-only fixture\n');
  const config = api('get', '/api/config', undefined, root);
  assert.ok(config.some(document => document.info?.agents?.['sai-probe-boot']), 'fixture configuration must be loaded before registration is tested');
  let roster = [];
  // The live server discovers newly-created definitions asynchronously. Bound
  // initialization reads; do not rely on a sleep or mutate shared reload state.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    roster = api('get', '/api/agent', undefined, root).data;
    if (roster.some(agent => agent.id === 'sai-probe-boot')) break;
  }
  assert.ok(roster.some(agent => agent.id === 'sai-probe-boot'), 'native agent listing must register the fixture');
  const session = api('post', '/api/session', { title: 'SAI capability verification (no model)', location: { directory: root }, agent: 'sai-probe-research' }, root).data;
  assert.ok(session.id);
  const evaluate = (profile, action, resource, expected) => {
    const agent = `sai-probe-${profile}`;
    const result = api('post', `/api/session/${session.id}/permission`, { agent, action, resources: [resource] }, root);
    assert.equal(result.data.effect, expected, `${profile}: ${action} ${resource}`);
  };
  for (const profile of Object.keys(registry.profiles)) {
    const native = translate(registry, profile, 'opencode');
    const observed = api('get', `/api/agent/sai-probe-${profile}`, undefined, root).data;
    assert.ok(observed, `${profile} must register natively`);
    for (const rule of native.permissions.filter(rule => rule.effect === 'allow' && rule.action !== 'external_directory')) {
      const resource = rule.resource === '*' ? (rule.action === 'read' || rule.action === 'edit' ? 'fixture.txt' : '*')
        : rule.resource.replaceAll('*', 'fixture');
      evaluate(profile, rule.action, resource, 'allow');
    }
    if (native.profile.read || native.profile.shell?.length) {
      evaluate(profile, 'external_directory', path.join(os.homedir(), '.config', 'opencode', 'sai', '*'), 'allow');
      const dataRoot = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
      evaluate(profile, 'external_directory', path.join(dataRoot, 'opencode', 'tool-output', 'probe', '*'), 'allow');
      evaluate(profile, 'external_directory', path.join(dataRoot, 'opencode', 'shell', 'probe', '*'), 'allow');
    }
    // A newly introduced action must remain denied despite inherited allow.
    evaluate(profile, 'sai_unknown_future_tool', '*', 'deny');
    for (const action of ['edit', 'webfetch', 'subagent', 'question']) {
      if (!native.permissions.some(rule => rule.action === action && rule.effect === 'allow')) evaluate(profile, action, '*', 'deny');
    }
  }
  evaluate('research', 'shell', 'git grep needle', 'allow');
  evaluate('research', 'shell', 'printf mutation', 'deny');
  evaluate('research', 'skill', 'fetch', 'allow');
  evaluate('research', 'skill', 'unrelated', 'deny');
  evaluate('research', 'unrelated_mcp_tool', '*', 'deny');
  const generic = api('get', '/api/agent/sai-generic-probe', undefined, root).data;
  assert.ok(generic, 'generated Markdown must parse in the native harness');
  assert.deepEqual(generic.model, { providerID: 'opencode', id: 'muse-spark-1.3-contributor-free', variant: 'xhigh' }, 'native parsing must retain the model and separate variant');
  // Preserve the fixture/session as inspectable evidence; no model runs here.
  console.log(`Native verification fixture: ${root}; session: ${session.id}`);
});
