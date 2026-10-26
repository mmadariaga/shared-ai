'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'temp-root.js');
const { harnessRoot, resolveTempRoot, makeTempDir, removeInside, TempRootError } = require(TOOL);

const POSIX = process.platform !== 'win32';
const OPENCODE_SAI = path.join('/tmp/opencode', 'sai');
const UID = typeof process.getuid === 'function' ? process.getuid() : undefined;

function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-temp-root-test-'));
  return { base, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

test('Linux roots do not depend on the temp environment; other platforms use tmpdir plus the harness', () => {
  const tmpdir = () => path.join('somewhere', 'tmp');
  assert.equal(harnessRoot('opencode', { platform: 'linux', tmpdir, uid: 1000 }), '/tmp/opencode');
  assert.equal(harnessRoot('claude', { platform: 'linux', tmpdir, uid: 1000 }), '/tmp/claude-1000');
  assert.equal(harnessRoot('claude', { platform: 'darwin', tmpdir }), path.join('somewhere', 'tmp', 'claude'));
  assert.equal(harnessRoot('opencode', { platform: 'win32', tmpdir }), path.join('somewhere', 'tmp', 'opencode'));
});

test('an unknown harness is rejected', () => {
  assert.throws(() => harnessRoot('vscode', {}), /Expected harness: claude or opencode/);
});

test('on Linux a missing harness root is a blocker naming the path and nothing is created', () => {
  const calls = [];
  const io = {
    lstatSync(target) { calls.push(target); const error = new Error('missing'); error.code = 'ENOENT'; throw error; },
    mkdirSync() { throw new Error('must not create'); },
  };
  for (const [harness, expected] of [['opencode', '/tmp/opencode'], ['claude', '/tmp/claude-1000']]) {
    calls.length = 0;
    assert.throws(
      () => resolveTempRoot(harness, { platform: 'linux', uid: 1000, io }),
      error => error instanceof TempRootError && error.code === 'TEMP_ROOT_MISSING' && error.message.includes(expected),
    );
    assert.deepEqual(calls, [expected]);
  }
});

test('off Linux the harness folder and sai/ are created under the user temp base', () => {
  const box = sandbox();
  try {
    const root = resolveTempRoot('claude', { platform: 'darwin', tmpdir: () => box.base, uid: UID });
    assert.equal(root, path.join(box.base, 'claude', 'sai'));
    assert.ok(fs.statSync(root).isDirectory());
    if (POSIX) assert.equal(fs.statSync(root).mode & 0o777, 0o700);
    assert.equal(resolveTempRoot('claude', { platform: 'darwin', tmpdir: () => box.base, uid: UID }), root);
  } finally {
    box.cleanup();
  }
});

test('with an existing harness root, a missing sai/ is created with mode 0700', { skip: !POSIX }, () => {
  const box = sandbox();
  try {
    const harness = path.join(box.base, 'claude');
    fs.mkdirSync(harness, { mode: 0o700 });
    const root = resolveTempRoot('claude', { platform: 'darwin', tmpdir: () => box.base, uid: UID });
    assert.equal(root, path.join(harness, 'sai'));
    assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  } finally {
    box.cleanup();
  }
});

test('a symbolic-link harness root or sai/ and a file in their place are blockers and nothing is repaired', { skip: !POSIX }, () => {
  const box = sandbox();
  try {
    const real = path.join(box.base, 'real');
    fs.mkdirSync(real);
    fs.symlinkSync(real, path.join(box.base, 'claude'));
    const options = { platform: 'darwin', tmpdir: () => box.base, uid: UID };
    assert.throws(() => resolveTempRoot('claude', options), /not a symbolic link/);
    assert.deepEqual(fs.readdirSync(real), []);

    const harness = path.join(box.base, 'opencode');
    fs.mkdirSync(harness, { mode: 0o700 });
    fs.symlinkSync(real, path.join(harness, 'sai'));
    assert.throws(() => resolveTempRoot('opencode', options), /not a symbolic link/);
    fs.unlinkSync(path.join(harness, 'sai'));
    fs.writeFileSync(path.join(harness, 'sai'), '');
    assert.throws(() => resolveTempRoot('opencode', options), /not a symbolic link/);
  } finally {
    box.cleanup();
  }
});

test('ownership and shared-write checks block without repairing', () => {
  const stat = (overrides) => ({ isDirectory: () => true, isSymbolicLink: () => false, uid: 1000, mode: 0o40700, ...overrides });
  const make = (harnessStat, saiStat) => ({
    lstatSync(target) { return target.endsWith('sai') ? saiStat : harnessStat; },
    mkdirSync() { throw new Error('must not create'); },
    chmodSync() { throw new Error('must not repair'); },
  });
  const options = { platform: 'linux', uid: 1000 };
  assert.equal(resolveTempRoot('opencode', { ...options, io: make(stat(), stat()) }), OPENCODE_SAI);
  assert.equal(resolveTempRoot('opencode', { ...options, io: make(stat({ uid: 0 }), stat()) }), OPENCODE_SAI);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat({ uid: 2000 }), stat()) }), /owned by another user/);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat({ mode: 0o40770 }), stat()) }), /without the sticky bit/);
  assert.equal(resolveTempRoot('opencode', { ...options, io: make(stat({ mode: 0o41777 }), stat()) }), OPENCODE_SAI);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat(), stat({ uid: 0 })) }), /owned by another user/);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat(), stat({ mode: 0o40702 })) }), /without the sticky bit/);
});

test('makeTempDir creates a private child of the SAI temp root', () => {
  const box = sandbox();
  try {
    const options = { platform: process.platform === 'linux' ? 'darwin' : process.platform, tmpdir: () => box.base, uid: UID };
    const first = makeTempDir('claude', 'implement-demo-', options);
    const second = makeTempDir('claude', 'implement-demo-', options);
    assert.notEqual(first, second);
    const root = fs.realpathSync(resolveTempRoot('claude', options));
    assert.equal(path.dirname(first), root);
    assert.match(path.basename(first), /^implement-demo-[A-Za-z0-9]{6}$/);
    if (POSIX) assert.equal(fs.statSync(first).mode & 0o777, 0o700);
    assert.throws(() => makeTempDir('claude', '../escape-', options), error => error.code === 'USAGE');
  } finally {
    box.cleanup();
  }
});

test('removeInside deletes only directories strictly inside the SAI temp root', () => {
  const box = sandbox();
  try {
    const options = { platform: process.platform === 'linux' ? 'darwin' : process.platform, tmpdir: () => box.base, uid: UID };
    const dir = makeTempDir('claude', 'run-', options);
    fs.mkdirSync(path.join(dir, 'reports'));
    fs.writeFileSync(path.join(dir, 'reports', 'a.yaml'), 'x');
    assert.equal(removeInside('claude', dir, options), true);
    assert.equal(fs.existsSync(dir), false);
    assert.equal(removeInside('claude', dir, options), false);
    // A missing path whose parents are missing too is judged by its nearest existing ancestor, never a crash.
    assert.equal(removeInside('claude', path.join(dir, 'gone', 'deeper'), options), false);
    assert.throws(() => removeInside('claude', path.join(box.base, 'gone', 'deeper'), options), error => error.code === 'REJECTED_PATH');

    const root = resolveTempRoot('claude', options);
    const outside = path.join(box.base, 'outside');
    fs.mkdirSync(outside);
    for (const rejected of [root, outside, box.base, path.join(root, '..', 'outside'), 'relative/path']) {
      assert.throws(() => removeInside('claude', rejected, options), error => error.code === 'REJECTED_PATH', rejected);
    }
    assert.ok(fs.existsSync(outside));
    assert.ok(fs.existsSync(root));
    if (POSIX) {
      fs.symlinkSync(outside, path.join(root, 'link'));
      assert.throws(() => removeInside('claude', path.join(root, 'link'), options), error => error.code === 'REJECTED_PATH');
      assert.ok(fs.existsSync(outside));
    }
  } finally {
    box.cleanup();
  }
});

test('removeInside accepts the 8.3 short and long forms of one directory on Windows', { skip: process.platform !== 'win32' }, () => {
  const box = sandbox();
  try {
    const options = { platform: 'win32', tmpdir: () => box.base, uid: UID };
    const created = makeTempDir('claude', 'run-', options);
    const longForm = fs.realpathSync.native(created);
    const outside = path.join(box.base, 'outside');
    fs.mkdirSync(outside);
    assert.throws(() => removeInside('claude', outside, options), error => error.code === 'REJECTED_PATH');
    assert.equal(removeInside('claude', longForm, options), true);
    assert.equal(fs.existsSync(created), false);
    assert.ok(fs.existsSync(outside));
  } finally {
    box.cleanup();
  }
});

function cli(args, env) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: result.status, json: JSON.parse(result.stdout) };
}

test('the CLI creates and removes a run directory and reports usage errors', { skip: process.platform === 'linux' }, () => {
  const box = sandbox();
  try {
    const env = { TMPDIR: box.base, TEMP: box.base, TMP: box.base };
    const created = cli(['mkdtemp', '--harness', 'claude', '--prefix', 'implement-demo-'], env);
    assert.equal(created.status, 0);
    assert.equal(created.json.ok, true);
    assert.ok(fs.statSync(created.json.dir).isDirectory());
    assert.equal(cli(['remove', '--harness', 'claude', '--dir', box.base], env).status, 1);
    assert.ok(fs.existsSync(box.base));
    const removed = cli(['remove', '--harness', 'claude', '--dir', created.json.dir], env);
    assert.deepEqual([removed.status, removed.json.removed], [0, true]);
    assert.equal(fs.existsSync(created.json.dir), false);
    assert.equal(cli(['mkdtemp', '--harness', 'vscode'], env).status, 2);
    assert.equal(cli(['bogus', '--harness', 'claude'], env).status, 2);
  } finally {
    box.cleanup();
  }
});

const { harnessFromInstalledPath } = require(TOOL);

test('the harness derives from the installed root a tool runs from', () => {
  const claude = ['.claude', 'sai', 'tools', 'x.js'];
  const opencode = ['.opencode', 'sai', 'tools', 'x.js'];
  assert.equal(harnessFromInstalledPath(path.join(path.sep, 'home', 'u', ...claude)), 'claude');
  assert.equal(harnessFromInstalledPath(path.join(path.sep, 'home', 'u', ...opencode)), 'opencode');
  assert.equal(harnessFromInstalledPath(path.join(path.sep, 'home', 'u', '.config', 'opencode', 'sai', 'bin', 'sai-state.js')), 'opencode');
  assert.equal(harnessFromInstalledPath(path.join(path.sep, 'project', '.opencode', 'skills', 'to-backlog', 'scripts', 'prepare-temp.js')), 'opencode');
  // The nearest harness folder wins, and a source checkout counts as Claude Code.
  assert.equal(harnessFromInstalledPath(path.join(path.sep, 'opencode', 'work', '.claude', 'sai', 'tools', 'x.js')), 'claude');
  assert.equal(harnessFromInstalledPath(path.join(path.sep, 'src', 'shared-ai', 'sai', 'tools', 'x.js')), 'claude');
});

test('no tool keeps its own temp-root computation', () => {
  const root = path.join(__dirname, '..');
  const files = [
    ...fs.readdirSync(path.join(root, 'sai', 'tools')).filter(name => name.endsWith('.js') && name !== 'temp-root.js').map(name => path.join(root, 'sai', 'tools', name)),
    path.join(root, 'bin', 'sai-state.js'),
    path.join(root, 'skills', 'universal', 'to-backlog', 'scripts', 'prepare-temp.js'),
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /os\.tmpdir\(\)|\bTMPDIR\b|['"]\/tmp\b/, `${path.relative(root, file)} must resolve temp paths through temp-root.js`);
  }
});

// POSIX verification of the created child, exercised with an injected file system
// so it runs on every host: the checks moved here from the to-backlog helper.
function posixFake(overrides = {}) {
  const harness = '/tmp/opencode';
  const sai = path.join(harness, 'sai');
  const child = path.join(sai, 'run-ABCDEF');
  const dir = (ino, extra = {}) => ({ isDirectory: () => true, isSymbolicLink: () => false, uid: 1000, mode: 0o40700, dev: 1, ino, ...extra });
  const calls = { fchmod: [], closed: [], mkdtemp: 0 };
  const reads = { sai: 0, child: 0 };
  const io = {
    lstatSync(target) {
      if (target === harness) return dir(1);
      if (target === sai) return (overrides.sai || (() => dir(2)))(++reads.sai);
      if (target === child) return (overrides.child || (() => dir(3)))(++reads.child);
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    },
    realpathSync: target => (overrides.realpath || (value => value))(target),
    mkdtempSync(prefix) { calls.mkdtemp++; return `${prefix}ABCDEF`; },
    openSync: () => 7,
    fstatSync: () => (overrides.fd || (() => dir(3)))(),
    fchmodSync(fd, mode) { calls.fchmod.push([fd, mode]); },
    closeSync(fd) { calls.closed.push(fd); },
    mkdirSync() { throw new Error('must not create'); },
    chmodSync() { throw new Error('must not chmod a path'); },
  };
  const options = { platform: 'linux', uid: 1000, io };
  return { io, calls, options, dir, child };
}

test('makeTempDir fixes the verified child to 0700 through its descriptor and closes it', () => {
  const fake = posixFake();
  assert.equal(makeTempDir('opencode', 'run-', fake.options), fake.child);
  assert.deepEqual(fake.calls.fchmod, [[7, 0o700]]);
  assert.deepEqual(fake.calls.closed, [7]);
});

test('makeTempDir rejects a changed root and leaves nothing repaired', () => {
  for (const [change, message] of [
    [{ sai: n => (n === 3 ? posixFake().dir(9) : posixFake().dir(2)) }, /changed during preparation/],
    [{ sai: n => posixFake().dir(2, n === 3 ? { mode: 0o40777 } : {}) }, /without the sticky bit/],
    [{ sai: n => posixFake().dir(2, n === 3 ? { uid: 2000 } : {}) }, /owned by another user/],
  ]) {
    const fake = posixFake(change);
    assert.throws(() => makeTempDir('opencode', 'run-', fake.options), message);
    assert.deepEqual(fake.calls.closed, [7]);
  }
});

test('makeTempDir rejects a root reached through a symbolic link before creating anything', () => {
  const fake = posixFake({ realpath: () => path.join('/elsewhere', 'sai') });
  assert.throws(() => makeTempDir('opencode', 'run-', fake.options), /no symbolic link/);
  assert.equal(fake.calls.mkdtemp, 0);
});

test('makeTempDir rejects a child that fails verification or changes underneath it', () => {
  const fake0 = posixFake();
  const bad = [
    [{ child: () => fake0.dir(3, { isSymbolicLink: () => true }) }, /Created directory/],
    [{ child: () => fake0.dir(3, { isDirectory: () => false }) }, /Created directory/],
    [{ child: () => fake0.dir(3, { uid: 2000 }) }, /Created directory/],
    [{ child: () => fake0.dir(3, { mode: 0o40755 }) }, /Created directory/],
    [{ fd: () => fake0.dir(8) }, /changed during preparation/],
    [{ child: n => fake0.dir(n === 2 ? 8 : 3) }, /changed during preparation/],
    [{ child: n => fake0.dir(3, n === 2 ? { isSymbolicLink: () => true } : {}) }, /Created directory/],
    [{ realpath: value => (value.endsWith('ABCDEF') ? path.join('/elsewhere', 'run-ABCDEF') : value) }, /changed during preparation/],
  ];
  for (const [change, message] of bad) {
    const fake = posixFake(change);
    assert.throws(() => makeTempDir('opencode', 'run-', fake.options), message);
    assert.deepEqual(fake.calls.fchmod.length <= 1, true);
    assert.deepEqual(fake.calls.closed.length <= 1, true);
  }
});
