'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installClaude, installOpencode, ensureDir } = require('../bin/install-flow.js');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-fr-'));
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

describe('doctor fetch resolution', () => {

  test('STEP1_RETIRE_INLINE: fetch resolution has no Copilot identity or root', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-step1-fetch-claude-');
    const opencodeBase = makeTempDir('sai-step1-fetch-opencode-');
    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);
      const { code, parsed } = await runDoctor({
        projectRoot,
        claudeBase,
        opencodeBase,
      });

      assert.equal(code, 0);
      assert.equal(Object.keys(parsed).some(key => /copilot/i.test(key)), false);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
      fs.rmSync(opencodeBase, { recursive: true, force: true });
    }
  });

  test('1: Fetch @sai/commands/x/command-bootstrap.md resolved via global fallback — no error', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      for (const file of ['sai-2-design.md', 'sai-3-implement.md']) {
        assert.equal(fs.existsSync(path.join(claudeBase, 'sai', 'commands', file)), false);
      }

      const wrapper = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      fs.appendFileSync(wrapper, '\nFetch @sai/commands/fr-test-x/command-bootstrap.md\n');

      const targetDir = path.join(claudeBase, 'sai', 'commands', 'fr-test-x');
      ensureDir(targetDir);
      fs.writeFileSync(path.join(targetDir, 'command-bootstrap.md'), '# x\n');

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');

      const fetchRefErrors = (claude['fetch-ref'] || []).filter(r => r.severity === 'error');
      assert.equal(fetchRefErrors.length, 0,
        `expected no fetch-ref errors, got: ${JSON.stringify(fetchRefErrors)}`);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('2: Fetch @sai/commands/missing/command-bootstrap.md resolvable nowhere — error + exit 1', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      const wrapper = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      fs.appendFileSync(wrapper, '\nFetch @sai/commands/fr-test-missing/command-bootstrap.md\n');

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 1);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const fetchRefErrors = (claude['fetch-ref'] || []).filter(r => r.severity === 'error');
      assert.ok(fetchRefErrors.length >= 1, 'should have at least one fetch-ref error');
      assert.ok(
        fetchRefErrors.some(r => r.message.includes('fr-test-missing')),
        'error message should reference the missing target'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('4a: Fetch @skills/fetch/SKILL.md — installed skill, no error', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const fetchSkillErrors = (claude['fetch-skill'] || []).filter(r => r.severity === 'error');
      assert.equal(fetchSkillErrors.length, 0,
        `expected no fetch-skill errors, got: ${JSON.stringify(fetchSkillErrors)}`);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('4b: Fetch @skills/nonexistent/SKILL.md — absent skill, error', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      const wrapper = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      fs.appendFileSync(wrapper, '\nFetch @skills/nonexistent/SKILL.md\n');

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 1);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const fetchSkillErrors = (claude['fetch-skill'] || []).filter(r => r.severity === 'error');
      assert.ok(fetchSkillErrors.length >= 1, 'should have at least one fetch-skill error');
      assert.ok(
        fetchSkillErrors.some(r => r.message.includes('nonexistent')),
        'error message should reference the nonexistent skill name'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('Step 2: installed routed launchers and wrappers classify all direct worker bindings as non-skill fetches', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    const opencodeBase = makeTempDir('sai-dr-fr-opencode-');
    const phaseFolders = ['spec', 'design', 'implement', 'review', 'security', 'performance', 'accessibility', 'commit', 'archive', 'backfill'];
    const phases = [
      'spec-worker.md',
      'design-worker.md',
      'implementation-worker.md',
      'review-worker.md',
      'security-worker.md',
      'performance-worker.md',
      'accessibility-worker.md',
      'commit-worker.md',
      'archive-worker.md',
      'backfill-worker.md',
    ];
    const wrapperExploreRefs = {
        '[Claude Code]': [
          ['sai-explore.md', 'adapters/claude/idea-list-render.md'],
       ],
        '[Opencode]': [
           ['sai-explore.md', 'adapters/opencode/idea-list-render.md'],
       ],
    };

    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });
      assert.equal(code, 0);

      const expected = {
        '[Claude Code]': [
           ...phases.map(binding => `bindings/${binding}`),
           'bindings/spec-worker.md',
           'bindings/design-worker.md',
            'adapters/claude/idea-list-render.md',
          ],
          '[Opencode]': [
            ...phases.map(binding => `bindings/${binding}`),
            'bindings/spec-worker.md',
            'bindings/design-worker.md',
            'adapters/opencode/idea-list-render.md',
          ],
       };

      for (const [sectionName, refs] of Object.entries(wrapperExploreRefs)) {
        const base = sectionName === '[Claude Code]' ? claudeBase : opencodeBase;
        for (const [wrapper, target] of refs) {
          const source = fs.readFileSync(path.join(base, 'commands', wrapper), 'utf8');
           const fetchRoot = target.startsWith('adapters/') ? 'sai/' : 'sai/orchestration/workers/';
           assert.match(source, new RegExp(`Fetch @${fetchRoot}${target.replace(/[\\/.-]/g, '\\$&')}`),
             `${sectionName} ${wrapper} should use ${target}`);
          assert.doesNotMatch(source, /Fetch @skills\/sai-[^\s/]+-worker\/SKILL\.md/,
            `${sectionName} ${wrapper} should not use a worker skill fetch`);
        }
      }

      for (const [sectionName, targets] of Object.entries(expected)) {
        const base = sectionName === '[Claude Code]' ? claudeBase : opencodeBase;
        const section = parsed[sectionName];
        assert.ok(section, `${sectionName} section should exist`);
        const refs = section['fetch-ref'] || [];
        const refText = refs.map(ref => JSON.stringify(ref));
        for (const target of new Set(targets)) {
          assert.doesNotMatch(JSON.stringify(section['fetch-skill'] || []),
            new RegExp(target.replace(/[\\/.-]/g, '\\$&')),
            `${sectionName} should not classify ${target} as fetch-skill`);
           const installedTarget = target.startsWith('adapters/')
              ? path.join(base, 'sai', ...target.split('/'))
              : path.join(base, 'sai', 'orchestration', 'workers', ...target.split('/'));
           assert.equal(
              fs.existsSync(installedTarget),
              true,
              `${sectionName} should install ${target}`
            );
           if (target.endsWith('/idea-list-render.md')) {
              const sourceHarness = sectionName === '[Claude Code]' ? 'claude' : 'opencode';
              const sourceTarget = `sai/adapters/${sourceHarness}/idea-list-render.md`;
              assert.deepEqual(
                fs.readFileSync(installedTarget),
                fs.readFileSync(path.join(repoRoot, ...sourceTarget.split('/'))),
                `${sectionName} should preserve the render binding bytes for ${target}`
              );
           }
           if (target.endsWith('-worker.md')) {
             const bindingText = fs.readFileSync(
               path.join(base, 'sai', 'orchestration', 'workers', ...target.split('/')), 'utf8');
             assert.equal(
               (bindingText.match(/Fetch @sai\/commands\/[a-z-]+\/worker\.md and follow it exactly\./g) || []).length,
               1,
               `${sectionName} ${target} should carry exactly one canonical worker Fetch`
             );
             assert.match(
               bindingText,
               sectionName === '[Claude Code]' ? /Agent\(/ : /task\(/,
               `${sectionName} ${target} should preserve its dispatch mechanism`
             );
           }
         }

        assert.equal(refText.filter(text => /Fetch @skills\/sai-.*worker\/SKILL\.md/.test(text)).length, 0,
          `${sectionName} should contain no active worker skill fetches`);
      }

      for (const [index, folder] of phaseFolders.entries()) {
        for (const base of [claudeBase, opencodeBase]) {
          const launcherPath = path.join(base, 'sai', 'commands', folder, 'command-bootstrap.md');
          assert.ok(fs.existsSync(launcherPath), `launcher for ${folder} should be installed`);
        }
      }
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
      fs.rmSync(opencodeBase, { recursive: true, force: true });
    }
  });

  test('Step 2: installed harness boots and utility body cards resolve with exactly one own adapter', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-boot-claude-');
    const opencodeBase = makeTempDir('sai-dr-boot-opencode-');
    const utilities = ['explore', 'pr', 'status', 'worktree'];
    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);

      for (const [base, harness, foreign] of [
        [claudeBase, 'claude', 'opencode'],
        [opencodeBase, 'opencode', 'claude'],
      ]) {
        assert.ok(fs.existsSync(path.join(base, 'sai', 'adapters', harness, 'boot.md')),
          `${harness} harness should install its own boot adapter`);
        assert.equal(fs.existsSync(path.join(base, 'sai', 'adapters', foreign, 'boot.md')), false,
          `${harness} harness must not install the ${foreign} boot adapter`);
        for (const utility of utilities) {
          assert.ok(fs.existsSync(path.join(base, 'sai', 'commands', utility, 'body.md')),
            `${harness} harness should install the ${utility} utility body card`);
        }
  for (const card of ['command-bootstrap.md', 'coordinator.md', 'worker.md']) {
          assert.ok(fs.existsSync(path.join(base, 'sai', 'commands', 'archive', card)),
            `${harness} harness should install the routed archive ${card} card`);
        }
        for (const card of ['command-bootstrap.md', 'coordinator.md', 'worker.md']) {
          assert.ok(fs.existsSync(path.join(base, 'sai', 'commands', 'backfill', card)),
            `${harness} harness should install the routed backfill ${card} card`);
        }
        for (const card of ['command-bootstrap.md', 'coordinator.md']) {
          assert.ok(fs.existsSync(path.join(base, 'sai', 'commands', 'meta-build', card)),
            `${harness} harness should install the build ${card} card`);
        }
  for (const card of ['coordinator.md', 'worker.md', 'command-bootstrap.md']) {
          assert.ok(fs.existsSync(path.join(base, 'sai', 'commands', 'commit', card)),
            `${harness} harness should install the routed commit ${card} card`);
        }
        assert.equal(fs.existsSync(path.join(base, 'sai', 'commands', 'commit', 'body.md')), false,
          `${harness} harness must not install the retired commit body card`);
        const buildWrapper = path.join(base, 'commands', 'sai-build.md');
        assert.ok(fs.existsSync(buildWrapper), `${harness} harness should install sai-build.md`);
        assert.match(
          fs.readFileSync(buildWrapper, 'utf8'),
          /Fetch @sai\/commands\/meta-build\/command-bootstrap\.md/,
          `${harness} sai-build wrapper should resolve the build launcher`
        );
        for (const card of ['coordinator.md', 'red-worker.md', 'green-worker.md', 'runner.md', 'invocation.md']) {
          assert.ok(fs.existsSync(path.join(base, 'sai', 'commands', 'apply', card)),
            `${harness} harness should install the routed apply card ${card}`);
        }
        assert.equal(fs.existsSync(path.join(base, 'sai', 'commands', 'apply', 'body.md')), false,
          `${harness} harness must not install the retired apply body card`);
        assert.equal(fs.existsSync(path.join(base, 'sai', 'commands', 'apply', 'instructions.md')), false,
          `${harness} harness must not install the retired monolithic apply instruction`);
        assert.equal(fs.existsSync(path.join(base, 'sai', 'commands', 'sai-4-apply.md')), false,
          `${harness} harness must not install the flat sai-4-apply.md source`);
      }

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });
      assert.equal(code, 0);
      for (const sectionName of ['[Claude Code]', '[Opencode]']) {
        const section = parsed[sectionName];
        assert.ok(section, `${sectionName} section should exist`);
        const refErrors = (section['fetch-ref'] || []).filter(r => r.severity === 'error');
        assert.equal(refErrors.length, 0,
          `${sectionName} should resolve every Fetch reference including the boot adapter and the routed apply cards`);
      }
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
      fs.rmSync(opencodeBase, { recursive: true, force: true });
    }
  });

});

const repoRoot = path.join(__dirname, '..');

function sourceArtifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function positionOf(source, pattern) {
  const match = source.match(pattern);
  assert.ok(match, `expected source to contain ${pattern}`);
  return match.index;
}

function assertInOrder(source, patterns) {
  let previous = -1;
  for (const pattern of patterns) {
    const position = positionOf(source, pattern);
    assert.ok(position > previous, `${pattern} should appear after the preceding rule`);
    previous = position;
  }
}

test('Step 1 source fetch skills declare one active identity and local roots before global roots', () => {
  const skills = [
    {
      identity: 'claude',
      path: 'skills/claude/fetch/SKILL.md',
      localRoot: /\.claude[\\/]/,
      globalRoot: /~[\\/]\.claude[\\/]/,
    },
    {
      identity: 'opencode',
      path: 'skills/opencode/fetch/SKILL.md',
      localRoot: /\.opencode[\\/]/,
      globalRoot: /~[\\/]\.config[\\/]opencode[\\/]/,
    },
  ];

  for (const skill of skills) {
    const source = sourceArtifact(skill.path);
    const identities = source.match(new RegExp(`^\\s*Active harness identity\\s*:\\s*` + '`?' + `${skill.identity}` + '`?' + `[.!]?\\s*$`, 'gim')) || [];
    assert.equal(identities.length, 1, `${skill.path} should declare exactly one active identity`);
    assertInOrder(source, [skill.localRoot, skill.globalRoot]);
  }
});

test('Step 3 Claude Code and opencode use ordinary neutral local and global resolution', () => {
  for (const skill of [
    {
      path: 'skills/claude/fetch/SKILL.md',
      local: /\.claude[\\/]\/.*exists|\.claude[\\/].*exists/i,
      global: /~[\\/]\.claude[\\/].*directly/i,
      missing: /File not found: <subpath> \(checked \.claude\//i,
    },
    {
      path: 'skills/opencode/fetch/SKILL.md',
      local: /\.opencode[\\/]\/.*exists|\.opencode[\\/].*exists/i,
      global: /~[\\/]\.config[\\/]opencode[\\/].*directly/i,
      missing: /File not found: <subpath> \(checked \.opencode\//i,
    },
  ]) {
    const source = sourceArtifact(skill.path);
    assert.match(source, skill.local);
    assert.match(source, skill.global);
    assert.match(source, skill.missing);
    assert.doesNotMatch(source, /bindings[\\/]<(?:identity|claude|opencode)>[\\/]/i);
    assert.doesNotMatch(source, /coordinator-owned|worker-owned|cross-harness|replacement-worker/i);
  }
});

test('Step 3 neutral fetch contracts retain recursion and skill loading', () => {
  for (const source of [
    sourceArtifact('skills/claude/fetch/SKILL.md'),
    sourceArtifact('skills/opencode/fetch/SKILL.md'),
  ]) {
    assert.match(source, /Fetch @skills\/<name>\/SKILL\.md/);
    assert.match(source, /skill(?: tool)?/i);
    assert.match(source, /Recursion/);
    assert.match(source, /recursively/);
  }
});

test('Step 3 stale identity-bearing references receive no special guard', () => {
  for (const source of [
    sourceArtifact('skills/claude/fetch/SKILL.md'),
    sourceArtifact('skills/opencode/fetch/SKILL.md'),
  ]) {
    assert.doesNotMatch(source, /identity-bearing|cross-harness|mismatch|migration|stop rule/i);
    assert.match(source, /Fetch @<subpath>/);
  }
});

// Retired Copilot fetch contract intentionally has no test.

test('restore-coordinator-instruction-loading Step 1: Claude and opencode fetch resolvers use Read-then-Read without Glob or LS', () => {
  for (const relativePath of ['skills/claude/fetch/SKILL.md', 'skills/opencode/fetch/SKILL.md']) {
    const source = sourceArtifact(relativePath);
    assert.match(source, /\bRead\b/, `${relativePath} should name Read for non-skill resolution`);
    assert.doesNotMatch(source, /\bGlob\b/, `${relativePath} must not require Glob for non-skill resolution`);
    assert.doesNotMatch(source, /\bLS\b/, `${relativePath} must not require LS for non-skill resolution`);
  }
  // The opencode Fetch @<subpath> row marks the project-local branch by Read
  // existence and the user-global branch as a direct Read — no directory-based
  // probe is performed in either branch.
  const opencode = sourceArtifact('skills/opencode/fetch/SKILL.md');
  assert.match(opencode, /\bexists\b/, 'opencode Fetch @<subpath> row should mark the project-local branch by existence');
  assert.match(opencode, /\bdirectly\b/, 'opencode Fetch @<subpath> row should Read the user-global branch directly');
});

test('restore-coordinator-instruction-loading Step 1: both fetch skills reject out-of-namespace directives before any filesystem access', () => {
  for (const relativePath of ['skills/claude/fetch/SKILL.md', 'skills/opencode/fetch/SKILL.md']) {
    const source = sourceArtifact(relativePath);
    assert.match(source, /rejected before any filesystem access/i,
      `${relativePath} should reject an out-of-namespace directive before any filesystem access`);
    for (const prefix of ['sai/', 'commands/', 'skills/']) {
      assert.match(source, new RegExp(prefix, 'i'),
        `${relativePath} guard should name the permitted prefix ${prefix}`);
    }
  }
});

test('matrix worker bindings are the sole active binding inventory for both harnesses', () => {
  const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(repoRoot);
  const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility', 'commit', 'archive', 'backfill'];
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = {
      commands: path.join(os.tmpdir(), `sai-matrix-fetch-${harness}-commands`),
      sai: path.join(os.tmpdir(), `sai-matrix-fetch-${harness}-sai`),
      skills: path.join(os.tmpdir(), `sai-matrix-fetch-${harness}-skills`),
      agents: path.join(os.tmpdir(), `sai-matrix-fetch-${harness}-agents`),
      config: os.tmpdir(),
      root: os.tmpdir(),
    };
    const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 14, `${harness} should project exactly fourteen worker bindings`);
    const phaseBindingNames = bindingNames.filter(name => phases.includes(name.replace(/-worker\.md$/, '')));
    assert.deepEqual(phaseBindingNames.sort(), phases.map(phase => `${phase}-worker.md`).sort(),
      `${harness} phase worker binding names should match the canonical phase matrix`);
    assert.equal(bindingNames.includes('idea-list-render.md'), false,
      `${harness} must not project an idea-list-render matrix binding`);
    const allBindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
      .map(projection => path.basename(projection.destinationPath));
     assert.equal(allBindingNames.length, 14,
       `${harness} should keep only the fourteen routed worker bindings in the matrix destination`);
     assert.ok(active.some(projection =>
       path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/') ===
       `sai/adapters/${harness}/idea-list-render.md`));
  }
});

const STEP3_FLAT_UTILITY_SOURCES = [
  'sai/commands/sai-4-apply.md',
  'sai/commands/sai-archive.md',
  'sai/commands/sai-backfill.md',
  'sai/commands/sai-commit.md',
  'sai/commands/sai-explore.md',
  'sai/commands/sai-pr.md',
  'sai/commands/sai-status.md',
  'sai/commands/sai-worktree.md',
];
const STEP3_SUPERSEDED_WORKERS = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];
const STEP3_SUPERSEDED_SOURCES = [
  ...STEP3_FLAT_UTILITY_SOURCES,
  'sai/orchestration/coordinator-contract.md',
  'sai/orchestration/worker-lifecycle.md',
  ...STEP3_SUPERSEDED_WORKERS.map(name => `sai/orchestration/workers/${name}.md`),
];

test('Step 3 source audit rejects every superseded active destination and allows historical exclusions', () => {
  const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-source-audit-step3-'));
  const referenceLines = STEP3_SUPERSEDED_SOURCES
    .map(destination => `# wrapper navigation references @${destination} directly`);
  const historicalFiles = [
    path.join('docs', 'adr', '0001-superseded-layout.md'),
    path.join('openspec', 'changes', 'archive', 'legacy-change', 'proposal.md'),
  ];
  try {
    const activeDir = path.join(fixture, 'sai', 'commands');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.writeFileSync(path.join(activeDir, 'legacy.md'), `${referenceLines.join('\n')}\n`);

    for (const relative of historicalFiles) {
      const fullPath = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, `${referenceLines.join('\n')}\n`);
    }

    const references = auditActiveReferences(fixture);
    const flagged = new Set(references.map(reference => reference.reference));
    for (const destination of STEP3_SUPERSEDED_SOURCES) {
      assert.equal(flagged.has(destination), true,
        `source audit should reject the superseded active path ${destination}`);
    }
    for (const relative of historicalFiles) {
      assert.equal(references.some(reference => reference.file === relative), false,
        `source audit should allow historical references in ${relative}`);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('Step 3 the repository contains no active reference to any superseded destination', () => {
  const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');
  const references = auditActiveReferences(repoRoot);
  for (const destination of STEP3_SUPERSEDED_SOURCES) {
    assert.equal(references.some(reference => reference.reference === destination), false,
      `active repository content must not reference the superseded path ${destination}`);
  }
});
