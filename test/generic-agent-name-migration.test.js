'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { spawnSync } = require('node:child_process');
const flow = require('../bin/install-flow');
const { expandInstallManifest, loadInstallManifest } = require('../bin/install-manifest');
const { enumerateOpencode, computePlanEntry, runDeletion } = require('../bin/uninstall-flow');
const { main: doctor } = require('../bin/doctor');
const repoRoot = path.join(__dirname, '..');
const names = { 'budget-explorer': 'explore', 'budget-executor': 'executor', 'budget-subagent': 'budget' };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-generic-rename-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const base = path.join(root, 'global');
  const destinationRoot = Object.fromEntries(['agents', 'commands', 'sai', 'skills', 'config', 'root']
    .map(key => [key, ['config', 'root'].includes(key) ? base : path.join(base, key)]));
  const projections = expandInstallManifest(loadInstallManifest(repoRoot), { harness: 'opencode', repoRoot, destinationRoot })
    .filter(item => Object.hasOwn(names, path.basename(item.destinationPath, '.md')));
  assert.equal(projections.length, 3);
  fs.mkdirSync(destinationRoot.agents, { recursive: true });
  return { root, base, projections, agents: destinationRoot.agents };
}

function tuned(text, variant = true) {
  return text.replace(/^model:.*$/m, 'model: user/custom-model')
    .replace(/^variant:.*\n/m, variant ? 'variant: low\n' : '');
}

function legacy(f, projection, text = projection.sourceText) {
  const name = names[path.basename(projection.destinationPath, '.md')];
  const file = path.join(f.agents, `${name}.md`);
  fs.writeFileSync(file, text);
  return file;
}

test('fresh installs share names and generated dispatch grants across both harnesses', t => {
  const f = fixture(t);
  flow.installOpencode(f.base);
  const claude = path.join(f.root, 'claude');
  flow.installClaude(claude);
  for (const base of [f.base, claude]) {
    const files = fs.readdirSync(path.join(base, 'agents'));
    for (const [name, old] of Object.entries(names)) {
      assert.ok(files.includes(`${name}.md`));
      assert.ok(!files.includes(`${old}.md`));
    }
  }
  const design = fs.readFileSync(path.join(f.agents, 'sai-2-design-worker.md'), 'utf8');
  assert.match(design, /resource: "budget-explorer"/);
  assert.match(design, /resource: "budget-subagent"/);
  assert.doesNotMatch(design, /resource: "(?:explore|executor|budget)"/);
  const commandRequirements = fs.readFileSync(path.join(f.base, 'sai', 'capability-requirements.json'), 'utf8');
  assert.match(commandRequirements, /budget-executor/);
});

test('renamed agents are deleted and replacements receive shipped defaults over repeat installation', t => {
  const f = fixture(t);
  const originals = f.projections.map((p, i) => {
    const content = tuned(p.sourceText, i !== 1);
    return { path: legacy(f, p, content), content, projection: p };
  });
  flow.installOpencode(f.base);
  flow.installOpencode(f.base);
  for (const item of originals) {
    assert.equal(fs.existsSync(item.path), false);
    assert.equal(fs.readFileSync(item.projection.destinationPath, 'utf8'), item.projection.sourceText);
  }
});

test('new-name settings win conflicts, including structured model settings', t => {
  const f = fixture(t);
  const p = f.projections[0];
  const old = legacy(f, p, tuned(p.sourceText));
  const current = p.sourceText.replace(/^model:.*$/m, 'model:\n  providerID: own\n  id: destination').replace(/^variant:.*\n/m, '');
  fs.writeFileSync(p.destinationPath, current);
  const notices = [];
  flow.installOpencode(f.base, { notices });
  assert.equal(fs.readFileSync(p.destinationPath, 'utf8'), current);
  assert.equal(fs.existsSync(old), false);
  assert.ok(!notices.some(line => /Conflicting legacy agent settings/.test(line)), 'obsolete tunables are not compared or migrated');
});

test('modified legacy definitions are removed globally and from the named project', t => {
  const f = fixture(t);
  const p = f.projections.find(item => item.destinationPath.endsWith('budget-explorer.md'));
  const content = `${tuned(p.sourceText)}\nUser instructions.\n`;
  const old = legacy(f, p, content);
  const local = path.join(f.root, '.opencode', 'agents', 'explore.md');
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, 'independent local definition');
  const notices = [];
  flow.installOpencode(f.base, { notices });
  flow.installOpencode(f.base, { notices });
  const child = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(repoRoot, 'bin/install-flow.js'))}).installOpencode(${JSON.stringify(f.base)}, { projectPath: process.cwd() })`], { cwd: f.root, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.doesNotMatch(child.stdout, /Preserved project-local legacy agent/);
  assert.equal(fs.existsSync(old), false);
  assert.equal(fs.existsSync(local), false);
  assert.ok(!notices.some(line => /Preserved legacy agent/.test(line)));
  assert.equal(fs.readFileSync(p.destinationPath, 'utf8'), p.sourceText);
});

test('retirement is separate from the non-regular replacement guard and repeat installation is safe', t => {
  const f = fixture(t);
  const [first, second] = f.projections;
  const firstOld = legacy(f, first, tuned(first.sourceText));
  const secondOld = legacy(f, second, tuned(second.sourceText, false));
  flow.installProjection(first, f.base);
  assert.equal(fs.existsSync(firstOld), true, 'a single projection does not run manifest retirement');
  fs.mkdirSync(second.destinationPath);
  const notices = [];
  flow.installProjection(second, f.base, notices);
  assert.ok(fs.lstatSync(second.destinationPath).isDirectory());
  assert.ok(notices.some(line => /Skipped managed agent installation/.test(line)));
  assert.ok(fs.existsSync(secondOld));
  fs.rmdirSync(second.destinationPath);
  flow.installOpencode(f.base);
  assert.equal(fs.existsSync(secondOld), false);
  assert.equal(fs.existsSync(firstOld), false);
  assert.equal(fs.readFileSync(first.destinationPath, 'utf8'), first.sourceText);
  assert.equal(fs.readFileSync(second.destinationPath, 'utf8'), second.sourceText);
});

for (const withLegacy of [false, true]) {
  test(`linked new-name destination is preserved (legacy predecessor: ${withLegacy})`, t => {
    const f = fixture(t);
    const p = f.projections[0];
    const original = tuned(p.sourceText);
    const old = withLegacy ? legacy(f, p, original) : null;
    const target = path.join(f.root, 'unrelated.md');
    const content = 'Unrelated external content.\n';
    fs.writeFileSync(target, content);
    try {
      fs.symlinkSync(target, p.destinationPath, 'file');
    } catch (error) {
      if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
      t.skip(`File symlinks unavailable: ${error.code}`);
      return;
    }
    const notices = [];
    flow.installProjection(p, f.base, notices);
    assert.equal(fs.readlinkSync(p.destinationPath), target);
    assert.equal(fs.readFileSync(target, 'utf8'), content);
    if (old) assert.equal(fs.readFileSync(old, 'utf8'), original);
    assert.ok(notices.some(line => line.includes(p.destinationPath) && /left unchanged/.test(line) && /manually/.test(line)));
  });

  test(`non-regular destination guard runs before any destination read (legacy predecessor: ${withLegacy})`, t => {
    const f = fixture(t);
    const p = f.projections[0];
    const original = tuned(p.sourceText);
    const old = withLegacy ? legacy(f, p, original) : null;
    // Exercise the file-link boundary even on hosts that cannot create symlinks.
    const target = path.join(f.root, 'unrelated.md');
    fs.writeFileSync(target, 'Unrelated external content.\n');
    fs.writeFileSync(p.destinationPath, 'protected destination');
    const lstat = fs.lstatSync;
    const read = fs.readFileSync;
    const write = fs.writeFileSync;
    t.mock.method(fs, 'lstatSync', (file, ...args) => file === p.destinationPath
      ? { isFile: () => false, isSymbolicLink: () => true }
      : lstat(file, ...args));
    t.mock.method(fs, 'readFileSync', (file, ...args) => {
      assert.notEqual(file, p.destinationPath, 'protected destination must not be read');
      return read(file, ...args);
    });
    t.mock.method(fs, 'writeFileSync', (file, ...args) => {
      assert.notEqual(file, p.destinationPath, 'protected destination must not be written');
      return write(file, ...args);
    });
    const notices = [];
    flow.installProjection(p, f.base, notices);
    assert.equal(read(p.destinationPath, 'utf8'), 'protected destination');
    assert.equal(read(target, 'utf8'), 'Unrelated external content.\n');
    if (old) assert.equal(read(old, 'utf8'), original);
    assert.ok(notices.some(line => /Skipped managed agent installation/.test(line)));
  });
}

test('doctor and uninstall recognize migrated settings and protect changed new-name files', async t => {
  const f = fixture(t);
  for (const p of f.projections) legacy(f, p, tuned(p.sourceText));
  flow.installOpencode(f.base);
  fs.mkdirSync(path.join(f.root, 'openspec'));
  fs.writeFileSync(path.join(f.root, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  const claude = path.join(f.root, 'claude');
  flow.installClaude(claude);
  const out = new PassThrough();
  let output = '';
  out.on('data', chunk => { output += chunk.toString(); });
  const code = await doctor({ argv: ['--json'], projectRoot: f.root, claudeBase: claude, opencodeBase: f.base,
    execOpenspec: () => ({ status: 0, stdout: '1.4.1\n', stderr: '', error: null }), out });
  assert.equal(code, 0, output);
  const protectedPath = f.projections[0].destinationPath;
  fs.appendFileSync(protectedPath, '\nUser customization.\n');
  const entries = enumerateOpencode(f.base);
  for (const p of f.projections) {
    const entry = entries.find(item => item.dest === p.destinationPath);
    assert.ok(entry);
    assert.equal(computePlanEntry(entry).action, p.destinationPath === protectedPath ? 'keep-override' : 'delete');
    runDeletion([entry]);
    assert.equal(fs.existsSync(p.destinationPath), p.destinationPath === protectedPath);
  }
});
