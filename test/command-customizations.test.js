'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const flow = require('../bin/install-flow');
const doctor = require('../bin/doctor');
const uninstall = require('../bin/uninstall-flow');

const MARKER = '<!-- User customizations below this line -->';
const repo = path.join(__dirname, '..');
const installers = { claude: flow.installClaude, opencode: flow.installOpencode };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-customizations-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

for (const harness of ['claude', 'opencode']) {
  test(`${harness}: every command exposes exactly one empty customization section`, () => {
    for (const name of fs.readdirSync(path.join(repo, 'commands', harness))) {
      if (!name.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(repo, 'commands', harness, name), 'utf8');
      assert.equal(text.split(MARKER).length, 2, name);
      assert.equal(text.split(MARKER)[1], '\n', name);
    }
  });

  test(`${harness}: reinstall refreshes agent bodies and preserves suffixes and omitted optional tuning`, t => {
    const root = fixture(t);
    installers[harness](root);
    const file = path.join(root, 'agents', 'sai-3-green-worker.md');
    const suffix = '\n\nMy worker rule.  \nNo final newline';
    fs.writeFileSync(file, `---\ndescription: obsolete\nmodel: custom-model\n---\nOld instructions.\n${MARKER}${suffix}`);
    installers[harness](root);
    const updated = fs.readFileSync(file, 'utf8');
    assert.match(updated, /^model: custom-model$/m);
    assert.doesNotMatch(updated, /^(?:effort|variant):/m);
    assert.ok(updated.includes('sai/commands/implement/green-worker.md'));
    assert.equal(updated.slice(updated.indexOf(MARKER) + MARKER.length), suffix);
    installers[harness](root);
    assert.equal(fs.readFileSync(file, 'utf8'), updated);
  });

  test(`${harness}: reinstall replaces legacy commands, preserving only tunables`, t => {
    const root = fixture(t);
    installers[harness](root);
    const file = path.join(root, 'commands', 'sai-explore.md');
    const model = harness === 'claude' ? 'custom-model' : 'provider/custom-model#high';
    const tuning = harness === 'claude' ? '\neffort: low' : '';
    fs.writeFileSync(file, `---\ndescription: obsolete\nmodel: ${model}${tuning}\nsubtask: true\n---\nFetch retired/boot.md\n`);
    installers[harness](root);
    const updated = fs.readFileSync(file, 'utf8');
    assert.ok(updated.includes(`model: ${model}\n`));
    if (harness === 'claude') assert.match(updated, /^effort: low$/m);
    assert.ok(updated.includes('sai/commands/explore/body.md'));
    assert.ok(!updated.includes('obsolete'));
    assert.ok(!updated.includes('retired/boot.md'));
    assert.ok(!updated.includes('subtask: true'));
    assert.ok(updated.endsWith(`${MARKER}\n`));
    installers[harness](root);
    assert.equal(fs.readFileSync(file, 'utf8'), updated, 'reinstallation is idempotent');
  });

  test(`${harness}: reinstall preserves the exact suffix, not edits above the marker`, t => {
    const root = fixture(t);
    installers[harness](root);
    const file = path.join(root, 'commands', 'from-backlog.md');
    const suffix = '\r\n\r\nUse my terminology.  \r\nmodel: this is body text\r\n' + MARKER + '\r\n';
    fs.writeFileSync(file, `---\ndescription: obsolete\nmodel: custom-model\n---\nOld instructions.\n${MARKER}${suffix}`);
    installers[harness](root);
    const updated = fs.readFileSync(file, 'utf8');
    assert.equal(updated.slice(updated.indexOf(MARKER) + MARKER.length), suffix);
    assert.match(updated, /^model: custom-model$/m);
    assert.ok(!updated.includes('Old instructions.'));
    assert.ok(updated.includes('skills/from-backlog/SKILL.md'));
  });

  test(`${harness}: reinstall refreshes existing local commands and agents only`, t => {
    const root = fixture(t);
    const global = path.join(root, 'global');
    const project = path.join(root, 'project');
    const harnessRoot = path.join(project, harness === 'claude' ? '.claude' : '.opencode');
    for (const directory of ['commands', 'agents']) fs.mkdirSync(path.join(harnessRoot, directory), { recursive: true });
    const command = path.join(harnessRoot, 'commands', 'sai-explore.md');
    const agent = path.join(harnessRoot, 'agents', 'sai-3-green-worker.md');
    const tuning = harness === 'claude' ? 'effort: low' : 'variant: high';
    const old = `---\nmodel: custom-model\n${tuning}\n---\nRetired instructions.\n${MARKER}\nMy local rule.\n`;
    fs.writeFileSync(command, old);
    fs.writeFileSync(agent, old);
    const unrelated = path.join(harnessRoot, 'commands', 'my-command.md');
    fs.writeFileSync(unrelated, 'Unrelated user command.');
    installers[harness](global, { projectPath: project });
    assert.ok(fs.readFileSync(command, 'utf8').includes('sai/commands/explore/body.md'));
    assert.ok(fs.readFileSync(agent, 'utf8').includes('sai/commands/implement/green-worker.md'));
    for (const file of [command, agent]) {
      const text = fs.readFileSync(file, 'utf8');
      assert.ok(text.includes('model: custom-model'));
      assert.ok(text.endsWith(`${MARKER}\nMy local rule.\n`));
      assert.ok(!text.includes('Retired instructions.'));
    }
    assert.match(fs.readFileSync(agent, 'utf8'), new RegExp(`^${tuning}$`, 'm'));
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'Unrelated user command.');
    assert.equal(fs.existsSync(path.join(harnessRoot, 'commands', 'sai-status.md')), false);
    assert.equal(fs.existsSync(path.join(harnessRoot, 'sai')), false);
  });

  test(`${harness}: local refresh skips links and unrelated projects`, t => {
    const root = fixture(t);
    const project = path.join(root, 'project');
    const harnessRoot = path.join(project, harness === 'claude' ? '.claude' : '.opencode');
    const outside = path.join(root, 'outside.md');
    fs.mkdirSync(path.join(harnessRoot, 'commands'), { recursive: true });
    fs.writeFileSync(outside, 'Do not overwrite.');
    try {
      fs.symlinkSync(outside, path.join(harnessRoot, 'commands', 'sai-explore.md'));
    } catch (error) {
      if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
      t.skip('Creating symbolic links requires privileges on this Windows host.');
      return;
    }
    const notices = [];
    installers[harness](path.join(root, 'global'), { projectPath: project, notices });
    assert.equal(fs.readFileSync(outside, 'utf8'), 'Do not overwrite.');
    assert.ok(notices.some(line => line.includes('sai-explore.md') && /skipped/i.test(line)));
    const absent = path.join(root, 'absent-project');
    flow.refreshProjectOverrides(harness, absent);
    assert.equal(fs.existsSync(absent), false);
  });

  test(`${harness}: doctor accepts tunables and suffixes but reports stale local bodies`, async t => {
    const root = fixture(t);
    const global = path.join(root, 'global');
    const project = path.join(root, 'project');
    installers[harness](global);
    fs.mkdirSync(path.join(project, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(project, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
    const command = path.join(global, 'commands', 'sai-explore.md');
    fs.writeFileSync(command, fs.readFileSync(command, 'utf8').replace(/^model:.*$/m, 'model: custom-model') + '\nMy rule.\n');
    const options = {
      argv: ['--json', '--offline'], projectRoot: project,
      claudeBase: harness === 'claude' ? global : path.join(root, 'no-claude'),
      opencodeBase: harness === 'opencode' ? global : path.join(root, 'no-opencode'),
      execOpenspec: () => ({ status: 0, stdout: '1.0.0' }),
    };
    const run = async () => {
      let text = '';
      const code = await doctor.main({ ...options, out: { write: chunk => { text += chunk; } } });
      return { code, text };
    };
    assert.equal((await run()).code, 0);
    const local = path.join(project, harness === 'claude' ? '.claude' : '.opencode', 'commands', 'sai-explore.md');
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, '---\nmodel: custom-model\n---\nRetired body.\n');
    const stale = await run();
    assert.equal(stale.code, 1);
    assert.ok(stale.text.includes('sai-explore.md'));
    installers[harness](global, { projectPath: project });
    assert.equal((await run()).code, 0);
  });

  test(`${harness}: uninstall recognizes tuned commands but keeps user suffixes`, t => {
    const root = fixture(t);
    installers[harness](root);
    const command = path.join(root, 'commands', 'sai-explore.md');
    fs.writeFileSync(command, fs.readFileSync(command, 'utf8').replace(/^model:.*$/m, 'model: custom-model'));
    const entries = harness === 'claude' ? uninstall.enumerateClaude(root) : uninstall.enumerateOpencode(root);
    const entry = entries.find(item => item.dest === command);
    assert.equal(uninstall.computePlanEntry(entry).action, 'delete');
    fs.appendFileSync(command, '\nKeep my rule.\n');
    assert.equal(uninstall.computePlanEntry(entry).action, 'keep-override');
  });
}

test('opencode commands migrate legacy separate variant fields without losing tuning', t => {
  const root = fixture(t);
  flow.installOpencode(root);
  const file = path.join(root, 'commands', 'sai-explore.md');
  fs.writeFileSync(file, '---\nmodel: provider/custom\nvariant: high\n---\nOld body.\n');
  flow.installOpencode(root);
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /^model: provider\/custom#high$/m);
  assert.doesNotMatch(text, /^variant:/m);
});

test('only a standalone customization marker starts a preserved section', () => {
  const { splitCustomizations, preserveCustomizations } = require('../bin/managed-customizations');
  assert.equal(splitCustomizations(`Text mentioning ${MARKER}\n`).hasMarker, false);
  const source = `New body.\n${MARKER}\n`;
  assert.equal(preserveCustomizations(source, 'Old unmarked body.'), source);
  assert.equal(preserveCustomizations(source, `Old body.\r\n${MARKER}`), `New body.\n${MARKER}`);
});
