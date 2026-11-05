'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { translate, normalizeInstallRoot } = require('../bin/capabilities');
const registry = require('../sai/install-manifest.json').capabilities;

// Every shell command the instructions of each read-only profile prescribe, as `{root}`-relative tool paths.
const T = tool => `sai/tools/${tool}`;
const S = skill => `skills/${skill}`;
const FETCH = { node: S('fetch/fetch.js'), args: '--harness {harness} sai/policies/tool-resolution.md' };
const PLAIN = [
  'git grep -l pattern', 'git grep -c pattern -- src', 'git grep --max-count 5 pattern',
  'codegraph explore "how does x work"', 'opencode debug paths',
];
const TABLE = {
  research: { plain: PLAIN, nodes: [FETCH, { node: S('sai-cache-warmer/wait.js'), args: 'wait' }] },
  'explore-command': { plain: ['openspec list --json', 'git status --short', ...PLAIN.slice(4)], nodes: [FETCH,
    { node: T('to-backlog.js'), args: 'create' }, { node: S('to-backlog/scripts/prepare-temp.js'), args: '{harness}' }, { node: S('to-backlog/scripts/prepare-temp.js'), args: '{harness} --dir x' },
    { node: S('sai-cache-warmer/wait.js'), args: 'wait' }, { node: T('ready-to-propose.js'), args: 'check --profile strict' }] },
  'status-command': { plain: ['openspec status --change x --json', ...PLAIN.slice(4)], nodes: [FETCH,
    { node: T('status.js'), args: 'panel my-change --json --cwd .' }, { node: T('change-picker.js'), args: '--json' }] },
  'retrospective-command': { plain: PLAIN.slice(4), nodes: [FETCH, { node: T('retrospective.js'), args: 'index target --limit 5' }] },
  'from-backlog-command': { plain: PLAIN.slice(4), nodes: [FETCH, { node: T('from-backlog.js'), args: 'resolve registry' }] },
  'from-next-backlog-item-command': { plain: PLAIN.slice(4), nodes: [FETCH,
    { node: T('from-next-backlog-item.js'), args: 'select' }, { node: T('from-backlog.js'), args: 'resolve registry' }] },
  'cache-warmer-command': { plain: PLAIN.slice(4), nodes: [FETCH, { node: S('sai-cache-warmer/wait.js'), args: 'prepare' }] },
  'context-cache-benchmark-command': { plain: PLAIN.slice(4), nodes: [FETCH,
    { node: S('sai-context-cache-ttl-benchmark/cache_ttl.js'), args: 'run' },
    { node: S('sai-context-cache-ttl-benchmark/warming_override.js'), args: 'status' }] },
};
const INSTALL_ROOT = { claude: '/home/u/.claude', opencode: '/home/u/.xdg config/opencode' };
const ROOTS = { claude: '.claude', opencode: '.opencode' };
const HOMES = { claude: '~/.claude', opencode: '~/.config/opencode' };

// Claude Code `Bash(prefix:*)` matches the prefix followed by a word boundary; opencode `prefix *` matches the prefix then anything.
function matcher(harness, profile) {
  const native = translate(registry, profile, harness, INSTALL_ROOT[harness]);
  const rules = harness === 'claude'
    ? native.allowedTools.split(', ').filter(entry => entry.startsWith('Bash(')).map(entry => entry.slice(5, -1))
    : native.permissions.filter(rule => rule.action === 'shell' && rule.effect === 'allow').map(rule => rule.resource);
  return command => rules.some(rule => {
    if (rule === '*') return true;
    const prefix = harness === 'claude' ? (rule.endsWith(':*') ? rule.slice(0, -2) : null) : (rule.endsWith(' *') ? rule.slice(0, -2) : null);
    if (prefix === null) {
      // A path wildcard such as `node ~/.claude/sai/*` is a plain glob.
      return new RegExp(`^${rule.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(command);
    }
    // Claude Code `prefix:*` also matches the bare prefix; opencode `prefix *` is only assumed to need an argument.
    return (harness === 'claude' && command === prefix) || command.startsWith(`${prefix} `);
  });
}

function forms(harness, entry) {
  const args = entry.args.replaceAll('{harness}', harness).trim();
  const tail = args ? ` ${args}` : '';
  return [ROOTS[harness], HOMES[harness]].map(base => `node ${base}/${entry.node}${tail}`)
    .concat(`node "${INSTALL_ROOT[harness]}/${entry.node}"${tail}`);
}

for (const [profile, spec] of Object.entries(TABLE)) {
  for (const harness of ['claude', 'opencode']) {
    test(`${profile} on ${harness} allows every prescribed shell command in every path form`, () => {
      const allows = matcher(harness, profile);
      for (const command of spec.plain) assert.ok(allows(command), `${command}`);
      for (const entry of spec.nodes) {
        for (const command of forms(harness, entry)) {
          assert.ok(allows(command), `${command}`);
        }
      }
    });
  }
}

test('opencode absolute forms follow the config directory opencode reports', () => {
  const rules = translate(registry, 'status-command', 'opencode').permissions.filter(rule => rule.action === 'shell').map(rule => rule.resource);
  assert.ok(rules.some(rule => /^node "[^"]+\/sai\/tools\/status\.js" \*$/.test(rule)));
  assert.ok(rules.includes('opencode debug paths'));
});

test('the four mutating utility commands run any shell command and every skills list includes fetch', () => {
  for (const name of ['worktree-command', 'new-change-branch-command', 'to-pr-command', 'to-backlog-command']) {
    assert.deepEqual(registry.profiles[name].shell, ['*'], name);
  }
  for (const [name, profile] of Object.entries(registry.profiles)) {
    if (profile.skills && !profile.skills.includes('*')) assert.ok(profile.skills.includes('fetch'), `${name} lists fetch`);
  }
  assert.ok(registry.universal.shell.includes('opencode debug paths'));
  assert.deepEqual(registry.profiles.research.shell.filter(rule => rule === '*'), [], 'the research profile keeps pattern-list shell');
});
