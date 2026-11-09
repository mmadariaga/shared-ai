'use strict';

// E7 and E9: the installer, doctor, uninstall, and the generated permission rules all work on the one resolved
// root. Each case runs in a child process with its own HOME and CLAUDE_CONFIG_DIR, because the Claude Code root
// is read from the environment when the modules load.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..');

function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-root-consumers-'));
  const home = path.join(base, 'home');
  const alt = path.join(base, 'alt-claude');
  const project = path.join(base, 'project');
  fs.mkdirSync(home);
  fs.mkdirSync(alt);
  fs.mkdirSync(path.join(project, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(project, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  return { base, home, alt, project };
}

function child(script, { home, env = {} }) {
  const childEnv = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: '', XDG_CONFIG_HOME: '', ...env };
  const result = spawnSync(process.execPath, ['-e', script], { cwd: repoRoot, encoding: 'utf8', env: childEnv });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

const posix = value => value.replace(/\\/g, '/');

test('E7 the installer root and the generated permission rules use CLAUDE_CONFIG_DIR, and ~/.claude when it is unset', () => {
  const { base, home, alt } = sandbox();
  try {
    const script = `
      const flow = require('./bin/install-flow');
      const { translate } = require('./bin/capabilities');
      const registry = require('./sai/install-manifest.json').capabilities;
      const rules = translate(registry, 'status-command', 'claude').allowedTools.split(', ');
      process.stdout.write(JSON.stringify({ base: flow.CLAUDE_BASE, rules }));`;
    const set = JSON.parse(child(script, { home, env: { CLAUDE_CONFIG_DIR: alt } }));
    assert.equal(set.base, alt);
    assert.ok(set.rules.includes(`Bash(node "${posix(alt)}/sai/tools/status.js":*)`));
    const unset = JSON.parse(child(script, { home }));
    assert.equal(unset.base, path.join(home, '.claude'));
    assert.ok(unset.rules.includes(`Bash(node "${posix(path.join(home, '.claude'))}/sai/tools/status.js":*)`));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('E8 the installer resolves the opencode root in one order, and the probe it is given is honored', () => {
  const { base, home } = sandbox();
  try {
    const script = `
      const flow = require('./bin/install-flow');
      const silent = () => ({ status: 1, stdout: '' });
      const reported = () => ({ status: 0, stdout: 'config  /srv/reported\\n' });
      process.stdout.write(JSON.stringify([
        flow.resolveOpencodeBase({ spawnSync: reported, env: { XDG_CONFIG_HOME: '/srv/xdg' } }),
        flow.resolveOpencodeBase({ spawnSync: silent, env: { XDG_CONFIG_HOME: '/srv/xdg' } }),
        flow.resolveOpencodeBase({ spawnSync: silent, env: {} }),
      ]));`;
    const [reported, xdg, fallback] = JSON.parse(child(script, { home }));
    // path.resolve qualifies a drive-less root with the current drive on Windows, so the expectation does too.
    assert.equal(posix(reported), posix(path.resolve('/srv/reported')));
    assert.equal(posix(xdg), posix(path.join(path.resolve('/srv/xdg'), 'opencode')));
    assert.equal(fallback, path.join(home, '.config', 'opencode'));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('E9 a reinstall after CLAUDE_CONFIG_DIR changed writes only the resolved root, with its absolute path in the rules', () => {
  const { base, home, alt } = sandbox();
  try {
    child("require('./bin/install-flow').installClaude();", { home, env: { CLAUDE_CONFIG_DIR: alt } });
    assert.ok(fs.existsSync(path.join(alt, 'sai', 'policies', 'tool-resolution.md')));
    assert.ok(fs.existsSync(path.join(alt, 'skills', 'fetch', 'harness-root.js')));
    assert.ok(!fs.existsSync(path.join(home, '.claude')), 'the default root is neither created nor migrated');
    const profile = fs.readFileSync(path.join(alt, 'sai', 'capabilities', 'status-command.json'), 'utf8');
    assert.ok(profile.includes(`${posix(alt)}/sai/tools/status.js`));
    const command = fs.readFileSync(path.join(alt, 'commands', 'sai-status.md'), 'utf8');
    assert.ok(command.includes(`node "${posix(alt)}/sai/tools/status.js"`));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('E9 doctor reports the files missing from the resolved root and leaves the previous root alone', () => {
  const { base, home, alt, project } = sandbox();
  try {
    const previous = path.join(home, '.claude');
    fs.mkdirSync(path.join(previous, 'sai'), { recursive: true });
    fs.writeFileSync(path.join(previous, 'sai', 'old.md'), 'old');
    const script = `
      const { main } = require('./bin/doctor');
      let out = '';
      main({ argv: ['--json', '--offline'], projectRoot: ${JSON.stringify(project)}, opencodeBase: ${JSON.stringify(path.join(home, 'none-opencode'))},
        out: { write: text => { out += text; } }, execOpenspec: () => ({ status: 0, stdout: '1', error: null }) })
        .then(code => process.stdout.write(JSON.stringify({ code, report: JSON.parse(out) })));`;
    const { code, report } = JSON.parse(child(script, { home, env: { CLAUDE_CONFIG_DIR: alt } }));
    assert.equal(code, 1);
    const [files] = report['[Claude Code]'].files;
    assert.equal(files.severity, 'error');
    assert.match(files.message, /expected file\(s\) missing/);
    assert.ok(files.message.includes(alt));
    assert.ok(!files.message.includes(previous));
    assert.equal(fs.readFileSync(path.join(previous, 'sai', 'old.md'), 'utf8'), 'old');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('I8 uninstall enumerates only the resolved Claude Code root', () => {
  const { base, home, alt } = sandbox();
  try {
    const script = `
      const uninstall = require('./bin/uninstall-flow');
      const entries = uninstall.enumerateClaude();
      process.stdout.write(JSON.stringify(entries.map(entry => entry.dest)));`;
    const destinations = JSON.parse(child(script, { home, env: { CLAUDE_CONFIG_DIR: alt } }));
    assert.ok(destinations.length > 0);
    assert.ok(destinations.every(dest => dest.startsWith(alt + path.sep)), 'every destination is inside the resolved root');
    const fallback = JSON.parse(child(script, { home }));
    assert.ok(fallback.every(dest => dest.startsWith(path.join(home, '.claude') + path.sep)));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
