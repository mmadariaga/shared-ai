'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const manifest = require('../sai/install-manifest.json');
const { translate, validateRegistry } = require('../bin/capabilities');
const { expandInstallManifest } = require('../bin/install-manifest');
const { main } = require('../skills/universal/fetch/fetch');

const repoRoot = path.join(__dirname, '..');
const script = path.join(repoRoot, 'skills/universal/fetch/fetch.js');

function fixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-fetch-tool-'));
  const cwd = path.join(base, 'project');
  const home = path.join(base, 'home');
  fs.mkdirSync(cwd, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  return { base, cwd, home };
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// The tool resolves its global root through `harness-root.js`, so the helper hands it an empty environment and a
// silent `opencode debug paths` unless the test supplies its own: no variable of the machine running the suite
// (CLAUDE_CONFIG_DIR, XDG_CONFIG_HOME) and no installed opencode reaches the result.
function run(args, { cwd, home, env = {}, runOpencodePaths = () => ({ status: 1, stdout: '' }) } = {}) {
  let out = '';
  let err = '';
  const code = main(args, { cwd, home, env, runOpencodePaths, stdout: { write: text => { out += text; } }, stderr: { write: text => { err += text; } } });
  return { code, out, err };
}

test('the project-local root wins and the output is a header, a blank line, and the unchanged content', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/policies/x.md'), '# Local\r\nbody');
  write(path.join(home, '.claude/sai/policies/x.md'), 'global');
  const result = run(['--harness', 'claude', 'sai/policies/x.md'], { cwd, home });
  assert.equal(result.code, 0);
  const expectedPath = path.resolve(cwd, '.claude/sai/policies/x.md').replace(/\\/g, '/');
  assert.equal(result.out, `path: ${expectedPath}\nroot: project\n\n# Local\r\nbody`);
});

test('E3 the global root answers when the local root lacks the file, with no memory between calls', () => {
  const { cwd, home } = fixture();
  write(path.join(home, '.claude/commands/c.md'), 'global');
  const first = run(['--harness', 'claude', 'commands/c.md'], { cwd, home });
  assert.match(first.out, /^path: .*\/\.claude\/commands\/c\.md\nroot: global\n\nglobal$/);
  write(path.join(cwd, '.claude/commands/c.md'), 'local');
  assert.match(run(['--harness', 'claude', 'commands/c.md'], { cwd, home }).out, /root: project\n\nlocal$/);
});

test('opencode resolves against .opencode and ~/.config/opencode', () => {
  const { cwd, home } = fixture();
  write(path.join(home, '.config/opencode/skills/s/notes.md'), 'g');
  assert.match(run(['--harness', 'opencode', 'skills/s/notes.md'], { cwd, home }).out, /root: global\n\ng$/);
  write(path.join(cwd, '.opencode/skills/s/notes.md'), 'l');
  assert.match(run(['--harness', 'opencode', 'skills/s/notes.md'], { cwd, home }).out, /root: project\n\nl$/);
});

test('E4 opencode falls back to the config directory that opencode debug paths prints', () => {
  const { base, cwd, home } = fixture();
  const config = path.join(base, 'xdg', 'opencode');
  write(path.join(config, 'sai/policies/y.md'), 'xdg');
  const calls = [];
  const runOpencodePaths = () => { calls.push(1); return { status: 0, stdout: `home       ${home}\nconfig     ${config}\nstate      /x\n` }; };
  const result = run(['--harness', 'opencode', 'sai/policies/y.md'], { cwd, home, runOpencodePaths });
  assert.equal(result.code, 0);
  assert.match(result.out, /root: global\n\nxdg$/);
  assert.equal(calls.length, 1);
  const claude = run(['--harness', 'claude', 'sai/policies/y.md'], { cwd, home, runOpencodePaths });
  assert.equal(claude.code, 1);
  assert.equal(calls.length, 1, 'Claude Code never runs the opencode command');
});

test('E5 a failing fallback or a missing file names the subpath and the paths tried', () => {
  const { cwd, home } = fixture();
  for (const harness of ['claude', 'opencode']) {
    const result = run(['--harness', harness, 'sai/missing.md'], { cwd, home, runOpencodePaths: () => ({ status: 1, stdout: '' }) });
    assert.equal(result.code, 1);
    assert.equal(result.out, '');
    assert.match(result.err, /File not found: sai\/missing\.md \(tried /);
    assert.match(result.err, harness === 'claude' ? /\.claude\/sai\/missing\.md/ : /\.config\/opencode\/sai\/missing\.md/);
  }
  const thrown = run(['--harness', 'opencode', 'sai/missing.md'], { cwd, home, runOpencodePaths: () => { throw new Error('no binary'); } });
  assert.equal(thrown.code, 1);
});

test('E1 scope and traversal are rejected before any filesystem access', () => {
  const { cwd, home } = fixture();
  write(path.join(home, 'secret.md'), 'secret');
  const outside = ['vendor/notes.md', 'sai', 'sai/', '/etc/passwd', 'C:/Windows/win.ini', 'C:\\x', '~/x.md', 'sai/../secret.md', 'sai/..\\..\\secret.md',
    'sai//x.md', 'sai/./x.md', '', '../secret.md', '.claude/sai/x.md'];
  for (const subpath of outside) {
    const result = run(['--harness', 'claude', subpath], { cwd, home });
    assert.equal(result.code, 1, subpath);
    assert.equal(result.out, '', subpath);
    assert.match(result.err, /sai\/, commands\/, skills\//, subpath);
  }
});

test('E2 a skill directive is sent to the harness skill tool', () => {
  const { cwd, home } = fixture();
  write(path.join(home, '.claude/skills/budget/SKILL.md'), 'skill');
  const claude = run(['--harness', 'claude', 'skills/budget/SKILL.md'], { cwd, home });
  assert.equal(claude.code, 1);
  assert.equal(claude.out, '');
  assert.match(claude.err, /`Skill` tool/);
  assert.match(run(['--harness', 'opencode', 'skills/budget/SKILL.md'], { cwd, home }).err, /`skill` tool/);
  write(path.join(home, '.claude/skills/budget/other.md'), 'plain');
  assert.equal(run(['--harness', 'claude', 'skills/budget/other.md'], { cwd, home }).code, 0);
});

test('E6 a file above the output cap prints only the header and a marker', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/big.md'), 'x'.repeat(30000));
  write(path.join(cwd, '.claude/sai/fits.md'), 'x'.repeat(29600));
  const big = run(['--harness', 'claude', 'sai/big.md'], { cwd, home });
  assert.equal(big.code, 0);
  assert.match(big.out, /^path: .*\/sai\/big\.md\nroot: project\ntoo-large: /);
  assert.ok(!big.out.includes('xxxx'));
  const fits = run(['--harness', 'claude', 'sai/fits.md'], { cwd, home });
  assert.ok(fits.out.endsWith('x'.repeat(29600)));
  assert.ok(fits.out.length <= 30000);
});

test('E7 the header path is absolute and uses forward slashes', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/a.md'), 'a');
  const header = run(['--harness', 'claude', 'sai/a.md'], { cwd, home }).out.split('\n')[0];
  const resolved = header.replace(/^path: /, '');
  assert.ok(path.isAbsolute(resolved));
  assert.ok(!resolved.includes('\\'));
  assert.ok(fs.existsSync(resolved));
});

test('E8 a missing or unknown harness is a usage error that reads nothing', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/a.md'), 'a');
  for (const args of [['sai/a.md'], ['--harness', 'copilot', 'sai/a.md'], ['--harness'], ['--harness', 'claude'],
    ['--harness', 'claude', '--cwd', 'x', 'sai/a.md'], ['--harness', 'claude', 'sai/a.md', 'sai/b.md', '--cwd', 'x'],
    ['--harness', 'copilot', 'sai/a.md', 'sai/b.md']]) {
    const result = run(args, { cwd, home });
    assert.equal(result.code, 2, args.join(' '));
    assert.equal(result.out, '');
  }
});

test('E10 directives inside the returned content are returned as text, never followed', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/a.md'), 'Fetch `@sai/b.md`\n');
  write(path.join(cwd, '.claude/sai/b.md'), 'SECOND');
  const result = run(['--harness', 'claude', 'sai/a.md'], { cwd, home });
  assert.ok(result.out.endsWith('\n\nFetch `@sai/b.md`\n'));
  assert.ok(!result.out.includes('SECOND'));
});

test('the script runs as a command and takes its local root from the working directory', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.opencode/sai/a.md'), 'cli');
  const result = spawnSync(process.execPath, [script, '--harness', 'opencode', 'sai/a.md'], { cwd, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: '', XDG_CONFIG_HOME: '' } });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /root: project\n\ncli$/);
  assert.equal(spawnSync(process.execPath, [script, 'sai/a.md'], { cwd, encoding: 'utf8' }).status, 2);
});

test('every capability profile of both harnesses may run the fetch tool', () => {
  const registry = manifest.capabilities;
  validateRegistry(registry);
  for (const harness of ['claude', 'opencode']) {
    const root = harness === 'claude' ? '~/.claude' : '~/.config/opencode';
    const local = harness === 'claude' ? '.claude' : '.opencode';
    for (const name of Object.keys(registry.profiles)) {
      const grants = translate(registry, name, harness, `/home/u/${harness === 'claude' ? '.claude' : '.config/opencode'}`);
      const wildcard = registry.profiles[name].shell?.includes('*') || (harness === 'claude' && grants.allowedTools.split(', ').includes('Bash') && grants.allowedTools.split(', ').includes('PowerShell') && grants.profile.shell?.includes('*'));
      if (harness === 'claude') {
        const allowed = grants.allowedTools.split(', ');
        for (const shell of ['Bash', 'PowerShell']) {
          const covered = wildcard && allowed.includes(shell);
          for (const location of [`${local}`, root]) assert.ok(covered || allowed.includes(`${shell}(node ${location}/skills/fetch/fetch.js:*)`), `${name} ${shell} ${location}`);
          assert.ok(covered || allowed.includes(`${shell}(node "/home/u/.claude/skills/fetch/fetch.js":*)`), `${name} ${shell} absolute`);
        }
      } else {
        const rules = grants.permissions.filter(rule => rule.action === 'shell' && rule.effect === 'allow').map(rule => rule.resource);
        for (const resource of [`node ${local}/skills/fetch/fetch.js *`, `node ${root}/skills/fetch/fetch.js *`, 'node "/home/u/.config/opencode/skills/fetch/fetch.js" *']) {
          assert.ok(rules.includes('*') || rules.includes(resource), `${name} ${resource}`);
        }
      }
      assert.ok(grants.toolRequirements.some(item => item.capability === 'shell'), `${name} requires a shell`);
    }
  }
});

test('the manifest installs fetch.js beside each harness fetch skill', () => {
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), 'sai-fetch-projection', harness);
    const destinationRoot = Object.fromEntries(['commands', 'agents', 'sai', 'skills', 'config', 'root'].map(key => [key, path.join(base, key)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const tool = projections.find(item => item.destinationPath === path.join(destinationRoot.skills, 'fetch', 'fetch.js'));
    assert.ok(tool, `${harness} installs fetch.js`);
    assert.equal(tool.ownership, 'managed');
    assert.equal(tool.drift, 'content');
    assert.ok(projections.some(item => item.destinationPath === path.join(destinationRoot.skills, 'fetch', 'SKILL.md')));
  }
});

test('both fetch skills call the tool with their own harness and keep the skill-tool row', () => {
  for (const harness of ['claude', 'opencode']) {
    const text = fs.readFileSync(path.join(repoRoot, 'skills', harness, 'fetch', 'SKILL.md'), 'utf8');
    assert.match(text, new RegExp(`node "<base directory>/fetch\\.js" --harness ${harness} <subpath>`));
    assert.match(text, /Fetch `@skills\/<name>\/SKILL\.md`/);
    assert.doesNotMatch(text, /probes the project-local|Project-local `sai\/` root probe|### Path composition/);
    assert.match(text, /Do not fall back to resolving the path yourself/);
  }
});

test('H1 both skills and the explorer policy invoke the tool in the forms the permission rules cover', () => {
  const rules = {
    claude: translate(manifest.capabilities, 'research', 'claude', 'C:/Users/u/.claude').allowedTools.split(', '),
    opencode: translate(manifest.capabilities, 'research', 'opencode', 'C:/Users/u/.config/opencode').permissions.filter(rule => rule.action === 'shell').map(rule => rule.resource),
  };
  for (const [harness, local] of [['claude', '.claude'], ['opencode', '.opencode']]) {
    const text = fs.readFileSync(path.join(repoRoot, 'skills', harness, 'fetch', 'SKILL.md'), 'utf8');
    assert.ok(text.includes(`node ${local}/skills/fetch/fetch.js --harness ${harness} <subpath>`), 'the project-local copy runs relative as written');
    assert.match(text, /backslashes turned into forward slashes and nothing else, double-quoted/);
    assert.match(text, /tool-resolution\.md/);
    // The relative form and the quoted absolute form are both granted.
    const granted = harness === 'claude'
      ? [`Bash(node ${local}/skills/fetch/fetch.js:*)`, 'Bash(node "C:/Users/u/.claude/skills/fetch/fetch.js":*)']
      : [`node ${local}/skills/fetch/fetch.js *`, 'node "C:/Users/u/.config/opencode/skills/fetch/fetch.js" *'];
    for (const rule of granted) assert.ok(rules[harness].includes(rule), rule);
  }
  const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/explore-agent.md'), 'utf8');
  assert.match(policy, /relative as written when the base directory is the project-local copy/);
  assert.match(policy, /backslashes turned into forward slashes/);
  assert.ok(policy.includes('<subpath> [<subpath> ...]'), 'the explorer policy admits the multi-subpath form');
});

test('E1 one subpath keeps the content output, the stderr error, and the too-large line', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/a.md'), 'a');
  write(path.join(cwd, '.claude/sai/big.md'), 'x'.repeat(30000));
  assert.match(run(['--harness', 'claude', 'sai/a.md'], { cwd, home }).out, /^path: .*\/sai\/a\.md\nroot: project\n\na$/);
  assert.match(run(['--harness', 'claude', 'sai/big.md'], { cwd, home }).out, /^path: .*\/sai\/big\.md\nroot: project\ntoo-large: /);
  const missing = run(['--harness', 'claude', 'sai/missing.md'], { cwd, home });
  assert.equal(missing.code, 1);
  assert.equal(missing.out, '');
  assert.match(missing.err, /File not found: sai\/missing\.md/);
});

test('E2 two or more subpaths print one resolution block each, in argument order, and never content', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/a.md'), 'CONTENT-A');
  write(path.join(home, '.claude/sai/b.md'), 'CONTENT-B');
  write(path.join(cwd, '.claude/sai/big.md'), 'x'.repeat(40000));
  const result = run(['--harness', 'claude', 'sai/b.md', 'sai/a.md', 'sai/big.md'], { cwd, home });
  assert.equal(result.code, 0);
  assert.equal(result.err, '');
  const resolved = file => path.resolve(file).replace(/\\/g, '/');
  assert.equal(result.out, [
    `subpath: sai/b.md\npath: ${resolved(path.join(home, '.claude/sai/b.md'))}\nroot: global\n`,
    `subpath: sai/a.md\npath: ${resolved(path.join(cwd, '.claude/sai/a.md'))}\nroot: project\n`,
    `subpath: sai/big.md\npath: ${resolved(path.join(cwd, '.claude/sai/big.md'))}\nroot: project\n`,
  ].join('\n'));
  assert.ok(!result.out.includes('CONTENT') && !result.out.includes('xxxx'));
});

test('E3 E4 a failing subpath prints an error block on stdout, the others still resolve, and the exit code is 1', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.claude/sai/a.md'), 'a');
  write(path.join(home, 'secret.md'), 'secret');
  write(path.join(home, '.claude/skills/budget/SKILL.md'), 'skill');
  const result = run(['--harness', 'claude', 'sai/a.md', '../secret.md', 'skills/budget/SKILL.md', 'sai/missing.md', 'sai/a.md'], { cwd, home });
  assert.equal(result.code, 1);
  assert.equal(result.err, '');
  const blocks = result.out.split('\n\n').map(block => block.split('\n').filter(Boolean));
  assert.deepEqual(blocks.map(block => block[0]), ['subpath: sai/a.md', 'subpath: ../secret.md', 'subpath: skills/budget/SKILL.md', 'subpath: sai/missing.md']);
  assert.match(blocks[0][1], /^path: /);
  assert.match(blocks[1][1], /^error: .*sai\/, commands\/, skills\//);
  assert.match(blocks[2][1], /^error: .*`Skill` tool/);
  assert.match(blocks[3][1], /^error: File not found: sai\/missing\.md \(tried /);
  assert.equal(run(['--harness', 'claude', 'sai/a.md', 'sai/a.md'], { cwd, home }).code, 0);
});

test('E4 a call without a subpath is a usage error that prints no block', () => {
  const { cwd, home } = fixture();
  const result = run(['--harness', 'claude'], { cwd, home });
  assert.equal(result.code, 2);
  assert.equal(result.out, '');
});

for (const harness of ['claude', 'opencode']) {
  test(`${harness} repeated-singleton lookup keeps path mode and resolves only once`, () => {
    const { cwd, home } = fixture();
    const root = harness === 'claude' ? '.claude' : '.opencode';
    const file = path.join(cwd, root, 'sai/a.md');
    write(file, 'CONTENT-A');
    const realStat = fs.statSync;
    let calls = 0;
    fs.statSync = (...args) => { calls += 1; return realStat.apply(fs, args); };
    let result;
    try {
      result = run(['--harness', harness, 'sai/a.md', 'sai/a.md'], { cwd, home });
    } finally {
      fs.statSync = realStat;
    }
    assert.equal(calls, 1);
    assert.equal(result.code, 0);
    assert.equal(result.err, '');
    assert.equal(result.out, `subpath: sai/a.md\npath: ${path.resolve(file).replace(/\\/g, '/')}\nroot: project\n`);
    assert.ok(!result.out.includes('CONTENT-A'));
    assert.ok(run(['--harness', harness, 'sai/a.md'], { cwd, home }).out.endsWith('\n\nCONTENT-A'));
  });

  test(`${harness} adjacent and separated duplicates preserve first-occurrence order`, () => {
    const { cwd, home } = fixture();
    const root = harness === 'claude' ? '.claude' : '.opencode';
    for (const name of ['a', 'b', 'c']) write(path.join(cwd, root, `sai/${name}.md`), `CONTENT-${name}`);
    for (const paths of [
      ['sai/a.md', 'sai/a.md', 'sai/b.md', 'sai/c.md', 'sai/c.md'],
      ['sai/a.md', 'sai/b.md', 'sai/a.md', 'sai/c.md', 'sai/b.md'],
    ]) {
      const result = run(['--harness', harness, ...paths], { cwd, home });
      assert.equal(result.code, 0);
      assert.equal(result.err, '');
      assert.deepEqual(result.out.match(/^subpath: .+$/gm), ['subpath: sai/a.md', 'subpath: sai/b.md', 'subpath: sai/c.md']);
      assert.ok(!result.out.includes('CONTENT'));
    }
  });

  test(`${harness} repeated missing and invalid paths each emit one error while others resolve`, () => {
    const { cwd, home } = fixture();
    const root = harness === 'claude' ? '.claude' : '.opencode';
    write(path.join(cwd, root, 'sai/a.md'), 'CONTENT-A');
    const result = run(['--harness', harness, 'sai/missing.md', 'sai/missing.md', '../secret.md', 'sai/a.md', '../secret.md'], { cwd, home });
    assert.equal(result.code, 1);
    assert.equal(result.err, '');
    assert.deepEqual(result.out.match(/^subpath: .+$/gm), ['subpath: sai/missing.md', 'subpath: ../secret.md', 'subpath: sai/a.md']);
    assert.equal(result.out.match(/^error: /gm).length, 2);
    assert.match(result.out, /error: File not found: sai\/missing\.md/);
    assert.match(result.out, /error: .*outside the permitted scope/);
    assert.match(result.out, /subpath: sai\/a\.md\npath: /);
  });

  test(`${harness} distinct argument spellings for the same file stay distinct`, () => {
    const { cwd, home } = fixture();
    const root = harness === 'claude' ? '.claude' : '.opencode';
    write(path.join(cwd, root, 'sai/a.md'), 'CONTENT-A');
    const result = run(['--harness', harness, 'sai/a.md', 'sai\\a.md', 'sai/a.md'], { cwd, home });
    assert.equal(result.code, 0);
    assert.deepEqual(result.out.match(/^subpath: .+$/gm), ['subpath: sai/a.md', 'subpath: sai\\a.md']);
    const resolved = result.out.match(/^path: .+$/gm);
    assert.equal(resolved.length, 2);
    assert.equal(resolved[0], resolved[1]);
  });
}

test('E6 opencode runs debug paths at most once per call, whatever the number of subpaths that reach it', () => {
  const { base, cwd, home } = fixture();
  const config = path.join(base, 'xdg', 'opencode');
  write(path.join(config, 'sai/policies/y.md'), 'xdg');
  write(path.join(config, 'sai/policies/z.md'), 'xdg');
  let calls = 0;
  const runOpencodePaths = () => { calls += 1; return { status: 0, stdout: `config     ${config}\n` }; };
  const result = run(['--harness', 'opencode', 'sai/policies/y.md', 'sai/policies/z.md', 'sai/policies/none.md'], { cwd, home, runOpencodePaths });
  assert.equal(result.code, 1);
  assert.equal(calls, 1);
  assert.equal(result.out.split('root: global').length - 1, 2);
  let failing = 0;
  run(['--harness', 'opencode', 'sai/a.md', 'sai/b.md'], { cwd, home, runOpencodePaths: () => { failing += 1; throw new Error('no binary'); } });
  assert.equal(failing, 1);
});

test('E3 every subpath of a batch passes the scope check before any filesystem access or opencode debug paths call', () => {
  const { cwd, home } = fixture();
  write(path.join(cwd, '.opencode/sai/a.md'), 'a');
  const events = [];
  // A String object whose split is the scope check's first use of the subpath, so each check is observable.
  const tracked = value => Object.assign(new String(value), {
    split(...args) { events.push(`check ${value}`); return String.prototype.split.apply(String(value), args); },
  });
  const realStat = fs.statSync;
  fs.statSync = (...args) => { events.push('stat'); return realStat.apply(fs, args); };
  let result;
  try {
    result = run(['--harness', 'opencode', tracked('sai/a.md'), tracked('sai/missing.md'), tracked('vendor/out.md')], {
      cwd, home, runOpencodePaths: () => { events.push('debug-paths'); return { status: 1, stdout: '' }; },
    });
  } finally {
    fs.statSync = realStat;
  }
  assert.equal(result.code, 1);
  const checks = events.filter(event => event.startsWith('check '));
  assert.deepEqual(checks, ['check sai/a.md', 'check sai/missing.md', 'check vendor/out.md']);
  const firstAccess = events.findIndex(event => event === 'stat' || event === 'debug-paths');
  assert.ok(firstAccess >= 3, `filesystem access began at event ${firstAccess}: ${events.join(', ')}`);
  assert.deepEqual(events.slice(0, 3), checks);
  assert.match(result.out, /subpath: vendor\/out\.md\nerror: .*sai\/, commands\/, skills\//);
});

test('E7 to E11 both fetch skills state the batch, parallel-read, conditional-directive, and loaded-copy behavior', () => {
  for (const harness of ['claude', 'opencode']) {
    const read = harness === 'claude' ? 'Read' : 'read';
    const skillTool = harness === 'claude' ? 'Skill' : 'skill';
    const text = fs.readFileSync(path.join(repoRoot, 'skills', harness, 'fetch', 'SKILL.md'), 'utf8');
    assert.ok(text.includes(`--harness ${harness} <subpath> [<subpath> ...]`), harness);
    assert.doesNotMatch(text, /one subpath per call|one call at a time|once per directive/);
    assert.ok(text.includes('### Batching'), harness);
    assert.ok(text.includes('unconditional directives known at that moment that have no loaded copy'), harness);
    assert.ok(text.includes('in one fetch call'), harness);
    assert.ok(text.includes('`Fetch @skills/<name>/SKILL.md` directive of the batch with the `' + skillTool + '` tool'), harness);
    assert.ok(text.includes('Read every returned `path` in parallel, in a single turn'), harness);
    assert.ok(text.includes('a conditional directive joins a batch only once its condition holds'), harness);
    assert.ok(text.includes('the directives found in the files and skills of one batch form the next batch'), harness);
    assert.ok(text.includes('the full ' + read + ' of a `path` that a multi-subpath call returned'), harness);
    assert.ok(text.includes("stop only that subpath's directive and report the tool's message"), harness);
    assert.ok(text.includes('Never compose or guess another path'), harness);
  }
});

test('E7 the global root of Claude Code follows CLAUDE_CONFIG_DIR and ~/.claude is not consulted when it is set', () => {
  const { base, cwd, home } = fixture();
  const configured = path.join(base, 'alt-claude');
  write(path.join(configured, 'sai/policies/z.md'), 'configured');
  write(path.join(home, '.claude/sai/policies/z.md'), 'default');
  const result = run(['--harness', 'claude', 'sai/policies/z.md'], { cwd, home, env: { CLAUDE_CONFIG_DIR: configured } });
  assert.equal(result.code, 0);
  assert.match(result.out, /root: global\n\nconfigured$/);
  assert.match(run(['--harness', 'claude', 'sai/policies/z.md'], { cwd, home }).out, /root: global\n\ndefault$/);
  const missing = run(['--harness', 'claude', 'sai/policies/none.md'], { cwd, home, env: { CLAUDE_CONFIG_DIR: configured } });
  assert.equal(missing.code, 1);
  assert.ok(missing.err.includes(path.join(configured, 'sai/policies/none.md').replace(/\\/g, '/')));
  assert.ok(!missing.err.includes(path.join(home, '.claude').replace(/\\/g, '/')));
});

test('E8 the opencode global root is the reported directory, then XDG_CONFIG_HOME/opencode, then ~/.config/opencode', () => {
  const { base, cwd, home } = fixture();
  const reported = path.join(base, 'reported');
  const xdg = path.join(base, 'xdg');
  write(path.join(reported, 'sai/p.md'), 'reported');
  write(path.join(xdg, 'opencode/sai/p.md'), 'xdg');
  write(path.join(home, '.config/opencode/sai/p.md'), 'default');
  const probe = () => ({ status: 0, stdout: `config ${reported}\n` });
  const silent = () => ({ status: 1, stdout: '' });
  assert.match(run(['--harness', 'opencode', 'sai/p.md'], { cwd, home, env: { XDG_CONFIG_HOME: xdg }, runOpencodePaths: probe }).out, /\n\nreported$/);
  assert.match(run(['--harness', 'opencode', 'sai/p.md'], { cwd, home, env: { XDG_CONFIG_HOME: xdg }, runOpencodePaths: silent }).out, /\n\nxdg$/);
  assert.match(run(['--harness', 'opencode', 'sai/p.md'], { cwd, home, env: {}, runOpencodePaths: silent }).out, /\n\ndefault$/);
});

test('E10 an unreadable file is a declared error with no stack trace, and in path mode only that subpath fails', { skip: process.platform === 'win32' || (process.getuid && process.getuid() === 0) }, () => {
  const { cwd, home } = fixture();
  const locked = path.join(home, '.claude/sai/locked.md');
  write(locked, 'secret');
  write(path.join(home, '.claude/sai/open.md'), 'open');
  fs.chmodSync(locked, 0o000);
  try {
    const single = run(['--harness', 'claude', 'sai/locked.md'], { cwd, home });
    assert.equal(single.code, 1);
    assert.equal(single.out, '');
    assert.match(single.err, /^File cannot be read: sai\/locked\.md \(.*locked\.md: EACCES\)\n$/);
    assert.ok(!single.err.includes('    at '));
    const batch = run(['--harness', 'claude', 'sai/locked.md', 'sai/open.md'], { cwd, home });
    assert.equal(batch.code, 1);
    const blocks = batch.out.split('\n\n');
    assert.match(blocks[0], /^subpath: sai\/locked\.md\nerror: File cannot be read: /);
    assert.match(blocks[1], /^subpath: sai\/open\.md\npath: .*open\.md\nroot: global\n$/);
  } finally {
    fs.chmodSync(locked, 0o600);
  }
});

test('E11 a root or a file reached through a symbolic link resolves, and the lexical scope still rejects escapes', { skip: process.platform === 'win32' }, () => {
  const { base, cwd, home } = fixture();
  const shared = path.join(base, 'shared');
  write(path.join(shared, 'sai/policies/l.md'), 'linked');
  fs.symlinkSync(shared, path.join(home, '.claude'), 'dir');
  const viaRoot = run(['--harness', 'claude', 'sai/policies/l.md'], { cwd, home });
  assert.equal(viaRoot.code, 0);
  assert.match(viaRoot.out, /root: global\n\nlinked$/);
  fs.symlinkSync(path.join(shared, 'sai/policies/l.md'), path.join(shared, 'sai/policies/alias.md'));
  assert.match(run(['--harness', 'claude', 'sai/policies/alias.md'], { cwd, home }).out, /\n\nlinked$/);
  for (const subpath of ['../shared/sai/policies/l.md', path.join(shared, 'sai/policies/l.md'), 'vendor/l.md']) {
    const rejected = run(['--harness', 'claude', subpath], { cwd, home });
    assert.equal(rejected.code, 1, subpath);
    assert.match(rejected.err, /outside the permitted scope/, subpath);
  }
});

test('the manifest installs harness-root.js beside fetch.js for both harnesses', () => {
  const { expandInstallManifest: expand } = require('../bin/install-manifest');
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), `sai-root-${harness}`);
    const roots = { commands: path.join(base, 'commands'), sai: path.join(base, 'sai'), skills: path.join(base, 'skills'), agents: path.join(base, 'agents'), config: base, root: base };
    const destinations = expand(manifest, { harness, repoRoot, destinationRoot: roots }).map(projection => projection.destinationPath);
    assert.ok(destinations.includes(path.join(base, 'skills', 'fetch', 'fetch.js')), harness);
    assert.ok(destinations.includes(path.join(base, 'skills', 'fetch', 'harness-root.js')), harness);
  }
});
