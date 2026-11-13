'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeTempDir, removeInside } = require('../sai/tools/temp-root');
const transfer = require('../sai/tools/transfer');
const { hashBlock } = require('../sai/tools/ready-to-propose');
const { validate } = require('../sai/tools/validate-backfill-drafts');
const { compose, BANNER, OUT_OF_SCOPE } = require('../sai/tools/backfill-no-specs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const tool = path.join(root, 'sai/tools/backfill-no-specs.js');
const SESSION = '805971e2-a1f0-4587-9672-97ffc6bb9d39';
const ISSUE = 'https://github.com/acme/widgets/issues/12';
const NOTES = 'Context kept as is.\n\n- Undecided: the retry count.\n  Indented line.';

function blockText({ specs = '**Specs**: none — pure tooling change\n', notes = true, origins = true, leads = true } = {}) {
  return [
    '## Ready to Propose',
    '',
    '**Change name**: sample-change',
    '**Depends on**: None',
    ...(origins ? [`**Backlog origin**: ${ISSUE}`, `**Explore origin**: claude ${SESSION}`] : []),
    '**What**: Add a tool that drafts the change files.',
    '**Why**: The drafting round costs minutes for two files.',
    ...(specs ? [specs.trimEnd()] : []),
    '**Capabilities in scope**:',
    '- sample-capability: the tool drafts the files',
    '**Research Leads**:',
    ...(leads ? ['- sai/tools/ready-to-propose.js:10-20 - the block detector', '- `sai/commands/backfill/instructions.md` - section 6a', '- sai/tools/ready-to-propose.js:30 - the same file again'] : ['- None']),
    '**Decisions & Rationale**:',
    '- A tool drafts the files because they derive from the block,',
    '  which the archive worker then writes.',
    '**Alternatives Considered**:',
    '- None',
    '**Trade-offs Accepted**:',
    '- None',
    '**Model / Re-framings**:',
    '- None',
    '**Key constraints**:',
    '- Only one route changes.',
    '- The POC lane is unaffected.',
    '**Terms**:',
    '- None',
    '**Edge Cases**:',
    '- E1. The block declares no specs.',
    '- E2. A populated specs directory changes the route.',
    '**Implementation Details**:',
    '- I1. Add the tool under sai/tools.',
    '- I2. Test the tool.',
    '**Out of scope Implementation Details**:',
    '- None',
    ...(notes ? ['**Request Additional Notes**:', NOTES] : []),
    '**Overview language**: None',
    '',
    '---',
  ].join('\n');
}

function fixture(t, options) {
  const cwd = makeTempDir('claude', 'no-specs-test-');
  const { dir } = transfer.open('claude');
  const text = blockText(options);
  const block = transfer.put(dir, 'block.md', Buffer.from(text));
  const hash = hashBlock(text);
  const args = { 'block-file': block.path, 'block-hash': hash, 'change-name': 'sample-change', 'transfer-dir': dir, cwd, created: '2026-11-13' };
  t.after(() => { transfer.close(dir); removeInside('claude', cwd); });
  return { cwd, dir, args, text };
}
const content = ref => fs.readFileSync(ref.path, 'utf8');
const byName = (result, name) => result.draft_references.find(ref => ref.destination.endsWith(`/${name}`));

test('compose writes the two drafts of a no-specs block as transfer files with their destinations', t => {
  const f = fixture(t);
  const result = compose(f.args);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(result.draft_references.map(ref => ref.destination), ['openspec/changes/sample-change/.openspec.yaml', 'openspec/changes/sample-change/proposal.md']);
  for (const ref of result.draft_references) assert.doesNotThrow(() => transfer.verify(f.dir, ref));
  assert.equal(content(byName(result, '.openspec.yaml')), `schema: sai-workflow\ncreated: 2026-11-13\nbackfilled: true\nprior_intent: true\nskip_specs: true\nbacklog_origin: ${ISSUE}\nexplore_origin: [${SESSION}]\n`);
  assert.deepEqual(result.warnings, []);
});

test('the proposal restates the block under the required headings and copies the notes byte for byte', t => {
  const f = fixture(t);
  const proposal = content(byName(compose(f.args), 'proposal.md'));
  assert.ok(proposal.startsWith(`${BANNER}\n\n## Why\n`));
  const headings = ['## Why', '## What Changes', '## Capabilities', '### New Capabilities', '### Modified Capabilities', '## Impact', '## Proposal Research Documentation', '## Request Additional Notes', '## Additional Notes'];
  let from = 0;
  for (const heading of headings) { const at = proposal.indexOf(`\n${heading}\n`, from); assert.ok(at >= from, heading); from = at; }
  assert.match(proposal, /## Why\n\nThe drafting round costs minutes for two files\./);
  assert.match(proposal, /- Add a tool that drafts the change files\.\n- I1\. Add the tool under sai\/tools\.\n- I2\. Test the tool\./);
  assert.match(proposal, /### New Capabilities\n- None\n\n### Modified Capabilities\n- None/);
  assert.match(proposal, /- sample-capability: the tool drafts the files\n\nEdge cases agreed for this change:\n- E1\. The block declares no specs\.\n- E2\. A populated specs directory changes the route\.\n\nKey constraints of this change:\n- Only one route changes\.\n- The POC lane is unaffected\.\n\n/);
  assert.match(proposal, new RegExp(`The POC lane is unaffected\\.\\n\\n${OUT_OF_SCOPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\n## Proposal Research Documentation\\n`));
  assert.match(proposal, new RegExp(`\\n${NOTES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\n## Additional Notes\\n\\nDecisions & Rationale agreed for this change:\\n- A tool drafts the files because they derive from the block,\\n {2}which the archive worker then writes\\.\\n$`));
  assert.doesNotMatch(proposal, /<!--|TODO|\{name\}/);
});

test('the research documentation lists the lead paths once, without line ranges, and the empty marker otherwise', t => {
  const proposal = content(byName(compose(fixture(t).args), 'proposal.md'));
  assert.match(proposal, /## Proposal Research Documentation\n\n\*\*Local files\*\*:\n- sai\/tools\/ready-to-propose\.js\n- sai\/commands\/backfill\/instructions\.md\n\n\*\*External URLs\*\*:\n- None\n/);
  const none = content(byName(compose(fixture(t, { leads: false }).args), 'proposal.md'));
  assert.match(none, /\*\*Local files\*\*:\n- None\n\n\*\*External URLs\*\*:\n- None\n/);
});

test('a block without notes or origins yields a proposal without the notes section and a key-minimal metadata file', t => {
  const f = fixture(t, { notes: false, origins: false });
  const result = compose(f.args);
  assert.doesNotMatch(content(byName(result, 'proposal.md')), /Request Additional Notes/);
  assert.equal(content(byName(result, '.openspec.yaml')), 'schema: sai-workflow\ncreated: 2026-11-13\nbackfilled: true\nprior_intent: true\nskip_specs: true\n');
});

test('the generated drafts match section 6a and 6b of the backfill instructions', t => {
  const instructions = read('sai/commands/backfill/instructions.md');
  assert.ok(instructions.includes(BANNER), 'the usable-intent banner');
  assert.ok(instructions.includes(OUT_OF_SCOPE), 'the Impact closing line');
  const section = instructions.slice(instructions.indexOf('### 6a.'), instructions.indexOf('### 6b.'));
  const fourKeys = /```yaml\nschema: sai-workflow\ncreated: \{[^}]*\}\nbackfilled: true\nprior_intent: true\n```/;
  assert.match(section, fourKeys);
  assert.match(section, /adds the one optional key `skip_specs: true`/);
  assert.match(section, /`explore_origin: \[<sessionID>, <sessionID>\]`/);
  const lines = content(byName(compose(fixture(t).args), '.openspec.yaml')).split('\n');
  assert.deepEqual(lines.slice(0, 4).map(line => line.split(':')[0]), ['schema', 'created', 'backfilled', 'prior_intent']);
  assert.match(lines[1], /^created: \d{4}-\d{2}-\d{2}$/);
  assert.equal(lines[4], 'skip_specs: true');
});

test('compose defaults the creation date to the local calendar day', t => {
  const f = fixture(t);
  delete f.args.created;
  assert.match(content(byName(compose(f.args), '.openspec.yaml')), /^schema: sai-workflow\ncreated: \d{4}-\d{2}-\d{2}\n/);
});

test('E1 and E2: only a no-specs block with an empty specs directory takes the no-specs route', t => {
  const without = fixture(t, { specs: '' });
  const result = compose(without.args);
  assert.equal(result.ok, false);
  assert.equal(result.eligible, false);
  assert.equal(fs.readdirSync(without.dir).filter(file => file !== 'block.md' && !file.startsWith('.')).length, 0, 'ineligible writes no draft');
  const populated = fixture(t);
  fs.mkdirSync(path.join(populated.cwd, 'openspec/changes/sample-change/specs/cap'), { recursive: true });
  fs.writeFileSync(path.join(populated.cwd, 'openspec/changes/sample-change/specs/cap/spec.md'), 'x');
  const second = compose(populated.args);
  assert.equal(second.eligible, false);
  assert.match(second.reason, /specs\/ already holds files/);
  const emptyDirectory = fixture(t);
  fs.mkdirSync(path.join(emptyDirectory.cwd, 'openspec/changes/sample-change/specs'), { recursive: true });
  assert.equal(compose(emptyDirectory.args).ok, true);
});

test('a block that does not verify, a wrong change name, or a missing argument writes nothing and fails', t => {
  const f = fixture(t);
  assert.throws(() => compose({ ...f.args, 'block-hash': '0'.repeat(64) }), /does not match its hash/);
  assert.throws(() => compose({ ...f.args, 'change-name': 'other-change' }), /not other-change/);
  assert.throws(() => compose({ ...f.args, 'transfer-dir': undefined }), /Expected --block-file/);
  assert.throws(() => compose({ ...f.args, created: '13-11-2026' }), /YYYY-MM-DD/);
});

test('E3: a supplied origin replaces the block origin with a warning, and an invalid one is left out with a warning', t => {
  const other = 'https://github.com/acme/widgets/issues/99';
  const f = fixture(t);
  const replaced = compose({ ...f.args, 'backlog-origin': other });
  assert.match(content(byName(replaced, '.openspec.yaml')), new RegExp(`backlog_origin: ${other}\\n`));
  assert.equal(replaced.warnings.length, 1);
  const invalid = compose({ ...f.args, 'backlog-origin': 'https://github.com/acme/widgets/pull/12', 'explore-origin': 'nonsense' });
  assert.match(content(byName(invalid, '.openspec.yaml')), new RegExp(`backlog_origin: ${ISSUE}\\nexplore_origin: \\[${SESSION}\\]\\n`));
  assert.equal(invalid.warnings.length, 2);
  const bare = fixture(t, { origins: false });
  const supplied = compose({ ...bare.args, 'explore-origin': `claude ${SESSION}, ses_abc123` });
  assert.match(content(byName(supplied, '.openspec.yaml')), new RegExp(`explore_origin: \\[${SESSION}, ses_abc123\\]\\n`));
  assert.deepEqual(supplied.warnings, []);
});

test('the command line prints one JSON object and exits 0 for a composed set and 1 otherwise', t => {
  const f = fixture(t);
  const flags = Object.entries(f.args).flatMap(([key, value]) => [`--${key}`, value]);
  const ok = spawnSync(process.execPath, [tool, 'compose', ...flags], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.equal(JSON.parse(ok.stdout).draft_references.length, 2);
  const bad = spawnSync(process.execPath, [tool, 'compose', ...flags.slice(0, -2), '--block-hash', 'nope'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).ok, false);
  assert.equal(spawnSync(process.execPath, [tool, 'unknown'], { encoding: 'utf8' }).status, 1);
});

const cli = spawnSync('openspec', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
test('E4: the real CLI accepts the generated draft set', { skip: cli.error || cli.status !== 0 ? 'OpenSpec CLI unavailable' : false }, t => {
  const f = fixture(t);
  const write = (relative, bytes) => { const file = path.join(f.cwd, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
  write('openspec/config.yaml', 'schema: sai-workflow\n');
  fs.cpSync(path.join(root, 'openspec/schemas/sai-workflow'), path.join(f.cwd, 'openspec/schemas/sai-workflow'), { recursive: true });
  const result = compose(f.args);
  const validation = validate({ change_name: 'sample-change', transfer_dir: f.dir, draft_references: result.draft_references }, { cwd: f.cwd, harness: 'claude' });
  t.after(() => { if (validation.project_dir) removeInside('claude', validation.project_dir); });
  assert.equal(validation.ok, true, JSON.stringify(validation));
});

test('the coordinator and both workers describe the no-specs route', () => {
  const card = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(card, /`backfill-no-specs\.js`/);
  assert.match(card, /\*\*Specs\*\*: none — <reason>/);
  assert.match(card, /no backfill worker is created or bound/);
  assert.match(card, /validate-backfill-drafts\.js/);
  assert.match(card, /order --target archive/);
  const archive = read('sai/commands/archive/worker.md');
  assert.match(archive, /\*\*Draft materialization\*\*/);
  assert.ok(archive.indexOf('**Draft materialization**') < archive.indexOf('0. **Retirement declaration**'));
});
