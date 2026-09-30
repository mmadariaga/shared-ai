'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { installClaude, installOpencode } = require('../bin/install-flow.js');

const repoRoot = path.join(__dirname, '..');
const prefix = '[sai-default]-';

for (const [harness, install, names] of [
  ['claude', installClaude, ['OPUS.json']],
  ['opencode', installOpencode, ['Go.json', 'Go+Zen.json', 'oAI-LUNA+Zen.json', 'oAI-SOL+Zen.json']],
]) {
  test(`${harness}: every installation refreshes only distributed defaults and does not apply presets`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-default-presets-'));
    try {
      const base = path.join(root, 'global');
      const presets = path.join(base, 'sai', 'presets');
      const project = path.join(root, 'project', harness === 'claude' ? '.claude' : '.opencode', 'agents');
      fs.mkdirSync(project, { recursive: true });
      const projectFile = path.join(project, 'personal.md');
      const projectText = '---\nmodel: personal/model\n---\nPersonal override\n';
      fs.writeFileSync(projectFile, projectText);
      fs.mkdirSync(presets, { recursive: true });
      const preserved = [...names, 'personal.json', `${prefix}not-distributed.json`];
      for (const name of preserved) fs.writeFileSync(path.join(presets, name), `personal ${name}`);
      for (const name of names) fs.writeFileSync(path.join(presets, prefix + name), 'edited default');

      for (let round = 0; round < 2; round += 1) {
        install(base);
        assert.deepEqual(fs.readdirSync(presets).sort(), [...preserved, ...names.map(name => prefix + name)].sort());
        for (const name of names) {
          assert.equal(fs.readFileSync(path.join(presets, prefix + name), 'utf8'),
            fs.readFileSync(path.join(repoRoot, 'sai', 'presets', harness, prefix + name), 'utf8'));
        }
        for (const name of preserved) assert.equal(fs.readFileSync(path.join(presets, name), 'utf8'), `personal ${name}`);
        assert.equal(fs.readFileSync(projectFile, 'utf8'), projectText);
        if (round === 0) {
          for (const name of names) fs.writeFileSync(path.join(presets, prefix + name), 'edited again');
        }
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
