'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { translate, normalizeInstallRoot } = require('../bin/capabilities');
const { harnessRoot } = require('../sai/tools/temp-root');
const registry = require('../sai/install-manifest.json').capabilities;

// Every shell command the instructions of each read-only profile prescribe, as `{root}`-relative tool paths.
const T = tool => `sai/tools/${tool}`;
const S = skill => `skills/${skill}`;
const OPEN = { node: T('transfer.js'), args: 'open --harness {harness}' };
const INPUT = '--input-file /tmp/sai/sai-transfer-abc123/input.json';
const FETCH = { node: S('fetch/fetch.js'), args: '--harness {harness} sai/policies/tool-resolution.md' };
const PLAIN = [
  'git grep -l pattern', 'git grep -c pattern -- src', 'git grep --max-count 5 pattern',
  'codegraph explore "how does x work"', 'opencode debug paths',
];
const TABLE = {
  coordinator: { plain: PLAIN.slice(4), nodes: [FETCH, OPEN,
    { node: T('worker-report-validator.js'), args: `validate --kind progress --json ${INPUT}` },
    { node: 'sai/bin/sai-state.js', args: `emit id explore-idea@1 ${INPUT}` }, { node: 'sai/bin/sai-state.js', args: `emit id machine --progress ${INPUT}` },
    { node: S('sai-cache-warmer/wait.js'), args: `wait ${INPUT}` }] },
  research: { plain: PLAIN, nodes: [FETCH, { node: S('sai-cache-warmer/wait.js'), args: 'begin --agent budget-explorer --harness claude' }, { node: S('sai-cache-warmer/wait.js'), args: 'warm --chain abc123' }, { node: S('sai-cache-warmer/wait.js'), args: 'warm --state eyJhIjoxfQ' }] },
  'explore-command': { plain: ['openspec list --json', 'git status --short', ...PLAIN.slice(4)], nodes: [FETCH,
    { node: T('to-backlog.js'), args: 'create' }, { node: S('to-backlog/scripts/prepare-temp.js'), args: '{harness}' }, { node: S('to-backlog/scripts/prepare-temp.js'), args: '{harness} --dir x' },
    { node: S('sai-cache-warmer/wait.js'), args: 'wait' }, { node: T('ready-to-propose.js'), args: `check --profile strict ${INPUT}` }, OPEN] },
  'status-command': { plain: ['openspec status --change x --json', ...PLAIN.slice(4)], nodes: [FETCH,
    { node: T('status.js'), args: 'panel my-change --json --cwd .' }, { node: T('change-picker.js'), args: '--json' }] },
  'retrospective-command': { plain: PLAIN.slice(4), nodes: [FETCH, { node: T('retrospective.js'), args: 'index target --limit 5' }] },
  'from-backlog-command': { plain: PLAIN.slice(4), nodes: [FETCH, { node: T('from-backlog.js'), args: `resolve registry ${INPUT}` }, OPEN] },
  'from-next-backlog-item-command': { plain: PLAIN.slice(4), nodes: [FETCH,
    { node: T('from-next-backlog-item.js'), args: `select ${INPUT}` }, { node: T('from-backlog.js'), args: `resolve registry ${INPUT}` }, OPEN] },
  'cache-warmer-command': { plain: PLAIN.slice(4), nodes: [FETCH, { node: S('sai-cache-warmer/wait.js'), args: `prepare ${INPUT}` }, OPEN] },
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

test('scoped write grants native writes inside the SAI temp root only, on both harnesses', () => {
  for (const name of ['coordinator', 'from-backlog-command', 'cache-warmer-command', 'commit-command', 'to-pr-command']) {
    assert.equal(registry.profiles[name].write, 'temp', name);
  }
  const claude = translate(registry, 'from-backlog-command', 'claude');
  const allowed = claude.allowedTools.split(', ');
  assert.ok(claude.tools.split(', ').includes('Write'));
  assert.ok(!allowed.includes('Write') && !allowed.includes('Edit') && !claude.tools.split(', ').includes('Edit'), 'no unscoped write and no Edit tool');
  // The SAI temp root is platform-resolved: `/tmp/claude-<uid>` on Linux, `<tmpdir>/claude` elsewhere.
  const saiRoot = harness => path.join(harnessRoot(harness), 'sai').split(path.sep).join('/');
  const claudeRoot = saiRoot('claude');
  const drive = /^([A-Za-z]):\/(.*)$/.exec(claudeRoot);
  // Claude Code honors write path rules only under the `Edit` rule name; `Write(<path>)` is ignored.
  const claudeRule = `Edit(${drive ? `//${drive[1].toLowerCase()}/${drive[2]}` : `/${claudeRoot}`}/**)`;
  const scoped = allowed.filter(entry => entry === claudeRule);
  assert.equal(scoped.length, 1, `expected ${claudeRule}`);
  const opencode = translate(registry, 'from-backlog-command', 'opencode');
  const edits = opencode.permissions.filter(rule => rule.action === 'edit' && rule.effect === 'allow');
  assert.deepEqual(edits.map(rule => rule.resource), [`${saiRoot('opencode')}/*`]);
  assert.ok(opencode.toolRequirements.some(entry => entry.capability === 'write'));
});

test('the research profile (the explorer) has no write grant and no Write tool on either harness', () => {
  assert.equal(registry.profiles.research.write, undefined);
  const claude = translate(registry, 'research', 'claude');
  assert.ok(!claude.tools.split(', ').some(tool => ['Write', 'Edit'].includes(tool)));
  assert.ok(!claude.allowedTools.split(', ').some(entry => /^(Write|Edit)\b/.test(entry)));
  assert.ok(!translate(registry, 'research', 'opencode').permissions.some(rule => rule.action === 'edit' && rule.effect === 'allow'));
  assert.ok(!registry.profiles.research.shell.some(rule => /transfer\.js/.test(rule)));
});

test('full write stays unscoped and an unknown write value fails closed', () => {
  assert.ok(translate(registry, 'implement-command', 'opencode').permissions.some(rule => rule.action === 'edit' && rule.resource === '*'));
  assert.throws(() => translate({ ...registry, profiles: { ...registry.profiles, bad: { extends: 'boot', write: 'anywhere' } } }, 'bad', 'claude'), /write must be boolean or "temp"/);
});
