'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installClaude, installOpencode } = require('../bin/install-flow.js');

function execOk() {
  return { status: 0, stdout: '1.4.1\n', stderr: '', error: null };
}

function collectOut() {
  const ps = new PassThrough();
  const chunks = [];
  ps.on('data', (c) => chunks.push(c));
  const end = () => Buffer.concat(chunks).toString();
  return { stream: ps, end };
}

function makeGoodFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-harness-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  return dir;
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function nonexistentPath(prefix) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return path.join(os.tmpdir(), prefix + '-' + ts + '-' + rnd);
}

async function runDoctor({ projectRoot, claudeBase, opencodeBase }) {
  const { stream: out, end } = collectOut();
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase,
    execOpenspec: execOk,
    out,
  });
  const raw = end();
  const parsed = JSON.parse(raw);
  return { code, parsed };
}

describe('doctor harness inventory', () => {

  test('STEP1_RETIRE_INLINE: doctor reports exactly Claude Code and opencode', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-step1-doctor-claude-');
    const opencodeBase = makeTempDir('sai-step1-doctor-opencode-');
    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);
      const { code, parsed } = await runDoctor({
        projectRoot,
        claudeBase,
        opencodeBase,
      });

      assert.equal(code, 0);
      assert.ok(parsed['[Claude Code]']);
      assert.ok(parsed['[Opencode]']);
      assert.equal(Object.hasOwn(parsed, '[GitHub Copilot]'), false);
      assert.equal(JSON.stringify(parsed).toLowerCase().includes('copilot'), false);
      assert.equal(JSON.stringify(parsed).toLowerCase().includes('sai-step1-doctor-copilot'), false);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
      fs.rmSync(opencodeBase, { recursive: true, force: true });
    }
  });

  test('1: only claudeBase exists — opencode and copilot dirs absent', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    try {
      installClaude(claudeBase);

      const opencodeBase = nonexistentPath('sai-harness-oc-nonexistent');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.files), 'files should be an array');
      assert.ok(claude.files.length > 0, 'should list expected files');
      for (const r of claude.files) {
        assert.equal(r.severity, 'ok', `expected ok for ${r.name}`);
      }

      const oc = parsed['[Opencode]'];
      assert.ok(oc, '[Opencode] section should exist');
      assert.equal(oc.notInstalled, true, 'opencode should report not installed');

      assert.deepEqual(Object.keys(parsed).filter(key => ['[Claude Code]', '[Opencode]'].includes(key)).sort(), ['[Claude Code]', '[Opencode]']);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('2: fully-populated supported harnesses', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    const opencodeBase = makeTempDir('sai-harness-opencode-');
    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      for (const key of ['[Claude Code]', '[Opencode]']) {
        const section = parsed[key];
        assert.ok(section, `${key} section should exist`);
        assert.ok(Array.isArray(section.files), `${key} files should be an array`);
        assert.ok(section.files.length > 0, `${key} should list expected files`);
        for (const r of section.files) {
          assert.equal(r.severity, 'ok', `${key} file ${r.name} should be ok`);
        }
      }
      for (const file of [
        path.join('sai', 'commands', 'design', 'coordinator.md'),
        path.join('sai', 'commands', 'design', 'invocation.md'),
        path.join('sai', 'commands', 'implement', 'coordinator.md'),
        path.join('sai', 'commands', 'implement', 'invocation.md'),
      ]) {
        assert.equal(fs.existsSync(path.join(claudeBase, file)), true, `${file} should be installed`);
        assert.equal(fs.existsSync(path.join(opencodeBase, file)), true, `${file} should be installed`);
      }
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      for (const d of [claudeBase, opencodeBase]) {
        fs.rmSync(d, { recursive: true, force: true });
      }
    }
  });

  test('3: one expected file deleted — error severity and exit 1', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    try {
      installClaude(claudeBase);

      const target = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      assert.ok(fs.existsSync(target), 'sai-1-spec.md should exist after install');
      fs.unlinkSync(target);

      const opencodeBase = nonexistentPath('sai-harness-oc-nonexistent');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 1);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const errorFile = claude.files.find(r => r.severity === 'error');
      assert.ok(errorFile, 'should have a file record with error severity for the missing file');
      assert.ok(
        (errorFile.name && errorFile.name.includes('sai-1-spec.md')) ||
        (errorFile.path && errorFile.path.includes('sai-1-spec.md')),
        'error record should reference the deleted sai-1-spec.md'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('4: extra .md added — unexpected record with warn severity', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    try {
      installClaude(claudeBase);

      const extra = path.join(claudeBase, 'commands', 'extra-user-file.md');
      fs.writeFileSync(extra, '# User-added file\n');

      const opencodeBase = nonexistentPath('sai-harness-oc-nonexistent');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.unexpected), 'should have unexpected array');
      assert.ok(claude.unexpected.length >= 1, 'should have at least one unexpected record');
      assert.ok(
        claude.unexpected.some(r => r.severity === 'warn'),
        'unexpected records should have warn severity'
      );
      assert.ok(
        claude.unexpected.some(r =>
          (r.name && r.name.includes('extra-user-file')) ||
          (r.path && r.path.includes('extra-user-file'))
        ),
        'unexpected record should reference the extra file'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('Step 2: doctor inventories one harness adapter and the utility body cards with no flat sources', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-boot-claude-');
    const opencodeBase = makeTempDir('sai-harness-boot-opencode-');
    const utilities = ['apply', 'archive', 'backfill', 'commit', 'explore', 'pr', 'status', 'worktree'];
    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);

      for (const [base, harness, foreign] of [
        [claudeBase, 'claude', 'opencode'],
        [opencodeBase, 'opencode', 'claude'],
      ]) {
        assert.ok(fs.existsSync(path.join(base, 'sai', 'adapters', harness, 'boot.md')),
          `${harness} should install its own boot adapter`);
        assert.equal(fs.existsSync(path.join(base, 'sai', 'adapters', foreign, 'boot.md')), false,
          `${harness} must not install the foreign boot adapter`);
        for (const utility of utilities) {
          assert.ok(fs.existsSync(path.join(base, 'sai', 'commands', utility, 'body.md')),
            `${harness} should install the ${utility} utility body card`);
        }
        assert.equal(fs.existsSync(path.join(base, 'sai', 'commands', 'sai-4-apply.md')), false,
          `${harness} must not install the flat sai-4-apply.md utility source`);
      }

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });
      assert.equal(code, 0);
      for (const key of ['[Claude Code]', '[Opencode]']) {
        const section = parsed[key];
        assert.ok(section, `${key} section should exist`);
        for (const r of section.files) {
          assert.equal(r.severity, 'ok', `${key} file ${r.name} should be ok`);
        }
      }
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
      fs.rmSync(opencodeBase, { recursive: true, force: true });
    }
  });

});

function step3DestinationRootFor(base, harness) {
  return {
    commands: path.join(base, 'commands'),
    sai: path.join(base, 'sai'),
    skills: path.join(base, 'skills'),
    agents: path.join(base, 'agents'),
    config: base,
    root: base,
  };
}

function step3NeutralSource(source) {
  return source === 'sai/command-runner.md' ||
    source === 'sai/worker-core.md' ||
    source.startsWith('sai/commands/') ||
    source.startsWith('sai/instructions/') ||
    source.startsWith('sai/policies/');
}

test('Step 3 Claude and opencode neutral inventories are equivalent and differ only at the boot adapter seam', () => {
  const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const expansions = {};
  for (const harness of ['claude', 'opencode']) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-step3-equivalence-${harness}-`));
    expansions[harness] = {
      base,
      projections: expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: step3DestinationRootFor(base, harness),
      }),
    };
  }
  try {
    const neutralInventory = (harness) => {
      const { base, projections } = expansions[harness];
      const map = {};
      for (const projection of projections) {
        const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
        if (!step3NeutralSource(source)) continue;
        const destination = path.relative(step3DestinationRootFor(base, harness).sai, projection.destinationPath)
          .split(path.sep).join('/');
        map[source] = destination;
      }
      return map;
    };
    const claude = neutralInventory('claude');
    const opencode = neutralInventory('opencode');
    assert.equal(Object.keys(claude).length > 0, true, 'claude should carry a non-empty neutral inventory');
    assert.deepEqual(claude, opencode,
      'claude and opencode should project the same neutral sources to the same relative destinations');
    for (const source of Object.keys(claude)) {
      const bytes = fs.readFileSync(path.join(repoRoot, ...source.split('/')));
      assert.deepEqual(fs.readFileSync(path.join(repoRoot, ...source.split('/'))), bytes,
        `${source} should be shared neutral content for both harnesses`);
    }

    const saiSources = (harness) => new Set(expansions[harness].projections
      .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'))
      .filter(source => source.startsWith('sai/')));
    const claudeOnly = [...saiSources('claude')].filter(source => !saiSources('opencode').has(source)).sort();
    const opencodeOnly = [...saiSources('opencode')].filter(source => !saiSources('claude').has(source)).sort();
    assert.deepEqual(claudeOnly, [
      'sai/adapters/claude/boot.md',
      'sai/orchestration/workers/bindings/claude/idea-list-render.md',
    ], 'claude-specific SAI sources should be its boot adapter plus its idea-list-render runtime glue');
    assert.deepEqual(opencodeOnly, [
      'sai/adapters/opencode/boot.md',
      'sai/orchestration/workers/bindings/opencode/idea-list-render.md',
    ], 'opencode-specific SAI sources should be its boot adapter plus its idea-list-render runtime glue');
  } finally {
    for (const harness of ['claude', 'opencode']) {
      fs.rmSync(expansions[harness].base, { recursive: true, force: true });
    }
  }
});
