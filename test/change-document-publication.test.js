'use strict';

// Publication of change documents: the title line is the issue title and the rest is the description, a published set
// is read as a whole, the child issue URLs are attached as `Backlog origin:`, and a re-imported document takes its
// origin from the imported URL.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const toolPath = path.join(repoRoot, 'sai', 'tools', 'change-document.js');
const doc = require(toolPath);
const transfer = require('../sai/tools/transfer');
const { document } = require('./helpers/change-document-fixture');
const { resolveDocuments } = require('../sai/tools/to-backlog');

const PARENT = 'https://github.com/owner/repo/issues/1';
const CHILD = n => `https://github.com/owner/repo/issues/${n}`;
const EXPLORE = 'claude 88a1341a-aab7-4efe-82d8-58de66098f65';

function correspondence(slices) {
  return { version: 1, platform: 'github', role: 'parent', parent: PARENT, slices: slices.map(([change_name, n, depends_on = []]) => ({ change_name, issue: CHILD(n), depends_on })) };
}

function cli(args, input) {
  const result = spawnSync(process.execPath, [toolPath, ...args], { encoding: 'utf8', input: input || '' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function withDirectory(t) {
  const { dir } = transfer.open('claude');
  t.after(() => transfer.close(dir));
  return { dir, put: (name, text) => transfer.put(dir, name, Buffer.from(text)).path };
}

test('splitDocument: the title line is the issue title and the rest, untouched, is the description', () => {
  const text = document('greeting-banner', { title: 'Show the greeting in a banner' });
  const { title, description } = doc.splitDocument(text);
  assert.equal(title, 'Show the greeting in a banner');
  assert.ok(description.startsWith('## Problem\n'));
  assert.ok(description.endsWith('- Depends on: None'));
  assert.equal(`# ${title}\n\n${description}\n`, text);
  assert.throws(() => doc.splitDocument('## Problem\nNo title line.'), /Not one change document/);
  assert.throws(() => doc.splitDocument(`${text}\n# A second document\n`), /Not one change document/);
});

test('readSet: order, dependencies, origin, and the publication fields of each document', () => {
  const set = doc.readSet([document('dependent', { dependencies: 'blocker', origin: CHILD(7) }), document('blocker')]);
  assert.equal(set.ok, true, JSON.stringify(set.violations));
  assert.deepEqual(set.order, ['blocker', 'dependent']);
  const dependent = set.documents.find(row => row.name === 'dependent');
  assert.deepEqual(dependent.dependencies, ['blocker']);
  assert.equal(dependent.backlog_origin, CHILD(7));
  assert.equal(dependent.title, 'Ship dependent');
  assert.match(dependent.hash, /^[0-9a-f]{64}$/);
  assert.equal(doc.readSet([]).ok, false);
  assert.equal(doc.readSet([document('one', { dependencies: 'missing' })]).ok, false);
  assert.equal(doc.readSet([document('one'), document('one')]).ok, false);
  assert.equal(doc.readSet(['## Ready to Propose\n\n**Change name**: one\n']).ok, false);
});

test('setChangeLine inserts Backlog origin before Explore origin and Specs, keeps the list marker, and replaces a present line', () => {
  const plain = document('one', { explore: EXPLORE });
  const inserted = doc.setChangeLine(plain, 'Backlog origin', CHILD(2));
  assert.match(inserted, new RegExp(`- Depends on: None\\n- Backlog origin: ${CHILD(2).replace(/[/.]/g, '\\$&')}\\n- Explore origin: `));
  assert.equal(doc.checkDocument(inserted).change.backlog_origin, CHILD(2));
  const appended = doc.setChangeLine(document('one'), 'Backlog origin', CHILD(2));
  assert.ok(appended.trimEnd().endsWith(`- Backlog origin: ${CHILD(2)}`));
  const replaced = doc.setChangeLine(inserted, 'Backlog origin', CHILD(3));
  assert.equal(replaced.split('Backlog origin:').length, 2);
  assert.equal(doc.checkDocument(replaced).change.backlog_origin, CHILD(3));
  const unmarked = document('one').replace(/^- /gm, '');
  assert.match(doc.setChangeLine(unmarked, 'Backlog origin', CHILD(2)), /\nBacklog origin: /);
  assert.throws(() => doc.setChangeLine('# T\n\n## Problem\nx\n', 'Backlog origin', CHILD(2)), /no "## Change" section/);
});

test('attachBacklogOrigins gives each document its child URL, replaces the adopted parent, and refuses other origins', () => {
  const map = correspondence([['blocker', 2], ['dependent', 3, ['blocker']]]);
  const texts = [document('dependent', { dependencies: 'blocker', explore: EXPLORE }), document('blocker', { origin: PARENT })];
  const attached = doc.attachBacklogOrigins(texts, map);
  assert.deepEqual(attached.order, ['blocker', 'dependent']);
  for (const entry of attached.documents) {
    const slice = map.slices.find(row => row.change_name === entry.name);
    assert.equal(entry.backlog_origin, slice.issue);
    assert.equal(doc.checkDocument(entry.text).change.backlog_origin, slice.issue);
    assert.equal(doc.hashDocument(entry.text), entry.hash);
    assert.ok(!entry.text.includes(PARENT));
  }
  const dependent = attached.documents.find(row => row.name === 'dependent');
  assert.equal(dependent.text.replace(/^- Backlog origin:.*\n/m, ''), texts[0], 'only the origin line is added');
  assert.throws(() => doc.attachBacklogOrigins([document('blocker', { origin: CHILD(9) }), texts[0]], map), /conflicts with publication/);
  assert.throws(() => doc.attachBacklogOrigins(texts, correspondence([['blocker', 2]])), /complete stored document set/);
  assert.throws(() => doc.attachBacklogOrigins(texts, correspondence([['blocker', 2], ['dependent', 3]])), /dependencies/);
});

test('resolveImportedOrigin: the imported URL fills a missing origin and a different existing one is kept with a warning', () => {
  assert.deepEqual(doc.resolveImportedOrigin(null, CHILD(5)), { value: CHILD(5), source: 'imported', warning: null });
  assert.deepEqual(doc.resolveImportedOrigin(CHILD(5), CHILD(5)), { value: CHILD(5), source: 'imported', warning: null });
  const kept = doc.resolveImportedOrigin(CHILD(4), CHILD(5));
  assert.equal(kept.value, CHILD(4));
  assert.equal(kept.source, 'document');
  assert.match(kept.warning, /existing value is kept/);
  assert.deepEqual(doc.resolveImportedOrigin(null, null), { value: null, source: null, warning: null });
  assert.throws(() => doc.resolveImportedOrigin(null, 'not a url'), /canonical/);
});

test('readIssue reports the Change lines of a re-imported change document and the origin the change takes', () => {
  const published = document('greeting-banner', { dependencies: 'other-change', explore: EXPLORE });
  const filled = doc.readIssue(published, { origin: CHILD(5) });
  assert.equal(filled.change.name, 'greeting-banner');
  assert.deepEqual(filled.change.depends_on, ['other-change']);
  assert.equal(filled.change.explore_origin, EXPLORE);
  assert.equal(filled.proposed_change_name, 'greeting-banner');
  assert.equal(filled.ready_to_propose_form, true);
  assert.deepEqual(filled.backlog_origin, { value: CHILD(5), source: 'imported', warning: null });
  const kept = doc.readIssue(document('greeting-banner', { origin: CHILD(4) }), { origin: CHILD(5) });
  assert.equal(kept.backlog_origin.value, CHILD(4));
  assert.match(kept.backlog_origin.warning, new RegExp(CHILD(4).replace(/[/.]/g, '\\$&')));
  assert.equal(doc.readIssue(published).backlog_origin.value, null);
  const html = doc.readIssue('<h2>Problem</h2><p>x</p><h2>Change</h2><p>Change name: html-change</p>', { origin: CHILD(5) });
  assert.equal(html.change.name, 'html-change');
});

test('E10: set-origin writes a copy of a stored document with the imported URL, keeping a different existing value', t => {
  const { put } = withDirectory(t);
  const file = put('stored.md', document('greeting-banner', { explore: EXPLORE }));
  const filled = cli(['set-origin', '--document-file', file, '--origin', CHILD(5), '--harness', 'claude']);
  assert.equal(filled.status, 0, filled.stderr);
  const result = JSON.parse(filled.stdout);
  t.after(() => transfer.close(result.transfer_dir));
  assert.equal(result.action, 'inserted');
  const written = fs.readFileSync(result.document_file, 'utf8');
  assert.equal(result.hash, doc.hashDocument(written));
  assert.equal(doc.checkDocument(written).change.backlog_origin, CHILD(5));
  assert.equal(doc.verifyDocumentFile(result.document_file, result.hash), written);

  const own = put('own.md', document('greeting-banner', { origin: CHILD(4) }));
  const kept = JSON.parse(cli(['set-origin', '--document-file', own, '--origin', CHILD(5), '--harness', 'claude']).stdout);
  t.after(() => transfer.close(kept.transfer_dir));
  assert.equal(kept.action, 'kept');
  assert.match(kept.origin.warning, /existing value is kept/);
  assert.equal(doc.checkDocument(fs.readFileSync(kept.document_file, 'utf8')).change.backlog_origin, CHILD(4));
  assert.equal(cli(['set-origin', '--document-file', own, '--harness', 'claude']).status, 2);
});

test('the command line splits a verified document and attaches the origins of a published set', t => {
  const { put } = withDirectory(t);
  const text = document('greeting-banner', { title: 'Show the greeting' });
  const file = put('document.md', text);
  const split = cli(['split', '--document-file', file, '--document-hash', doc.hashDocument(text)]);
  assert.equal(split.status, 0, split.stderr);
  assert.equal(JSON.parse(split.stdout).title, 'Show the greeting');
  assert.equal(cli(['split', '--document-file', file, '--document-hash', 'f'.repeat(64)]).status, 2);

  const map = correspondence([['blocker', 2], ['dependent', 3, ['blocker']]]);
  const documents = [document('dependent', { dependencies: 'blocker' }), document('blocker')];
  const files = documents.map((value, index) => ({ document_file: put(`set-${index}.md`, value), hash: doc.hashDocument(value) }));
  const input = put('attach.json', JSON.stringify({ document_files: files, correspondence: map }));
  const attached = cli(['attach-origin', '--harness', 'claude', '--input-file', input]);
  assert.equal(attached.status, 0, attached.stdout + attached.stderr);
  const result = JSON.parse(attached.stdout);
  t.after(() => transfer.close(result.transfer_dir));
  assert.equal(result.ok, true);
  for (const entry of result.documents) {
    const written = fs.readFileSync(entry.document_file, 'utf8');
    assert.equal(doc.hashDocument(written), entry.hash);
    assert.equal(doc.checkDocument(written).change.backlog_origin, entry.backlog_origin);
  }
  const wrong = put('wrong.json', JSON.stringify({ document_files: [files[0]], correspondence: map }));
  const refused = cli(['attach-origin', '--harness', 'claude', '--input-file', wrong]);
  assert.equal(refused.status, 1);
  assert.equal(JSON.parse(refused.stdout).ok, false);
});

test('to-backlog resolveDocuments verifies a document reference and fills the title and the description', t => {
  const { put } = withDirectory(t);
  const text = document('greeting-banner', { title: 'Show the greeting' });
  const reference = { document_file: put('document.md', text), document_hash: doc.hashDocument(text) };
  const resolved = resolveDocuments({ provider: 'github', repository: 'owner/repo', document: reference });
  assert.equal(resolved.title, 'Show the greeting');
  assert.equal(resolved.description, doc.splitDocument(text).description);
  assert.equal(resolved.document, undefined);
  assert.throws(() => resolveDocuments({ document: reference, title: 'Own title' }), /either a document or a title/);
  assert.throws(() => resolveDocuments({ document: { ...reference, document_hash: 'f'.repeat(64) } }), /does not match its hash/);
  const incomplete = put('incomplete.md', document('greeting-banner').replace('Ready to propose', 'Idea'));
  assert.throws(() => resolveDocuments({ document: { document_file: incomplete, document_hash: doc.hashDocument(fs.readFileSync(incomplete, 'utf8')) } }), /not a complete change document: MATURITY_NOT_READY/);

  const set = [document('one'), document('two', { dependencies: 'one' })];
  const references = set.map((value, index) => ({ document_file: put(`set-${index}.md`, value), document_hash: doc.hashDocument(value) }));
  assert.deepEqual(resolveDocuments({ documents: references }).documents, set);
  assert.throws(() => resolveDocuments({ documents: [] }), /at least one/);
});

test('no retired block tool or policy remains, and the format has one definition', () => {
  for (const retired of ['sai/tools/ready-to-propose.js', 'sai/policies/ready-to-propose-format.md']) {
    assert.equal(fs.existsSync(path.join(repoRoot, retired)), false, `${retired} is retired`);
  }
  const skipped = new Set(['node_modules', '.git', 'archive']);
  const offenders = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (skipped.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(full); continue; }
      if (!/\.(js|md|json)$/.test(entry.name)) continue;
      const relative = path.relative(repoRoot, full).split(path.sep).join('/');
      if (relative.startsWith('docs/adr/') || relative.startsWith('docs/ddr/') || relative.startsWith('openspec/') || relative === 'test/change-document-publication.test.js') continue;
      let content = fs.readFileSync(full, 'utf8');
      // The manifest names the retired paths in its `retirements`, so installed copies are removed; every other entry is live.
      if (relative === 'sai/install-manifest.json') {
        const { retirements, ...live } = JSON.parse(content);
        assert.ok(retirements.some(entry => entry.destination.path === 'tools/ready-to-propose.js'), 'the retired tool is declared');
        assert.ok(retirements.some(entry => entry.destination.path === 'policies/ready-to-propose-format.md'), 'the retired policy is declared');
        content = JSON.stringify(live);
      }
      if (/ready-to-propose\.js|ready-to-propose-format/.test(content)) offenders.push(relative);
    }
  };
  for (const directory of ['sai', 'skills', 'commands', 'agents', 'bin', 'sai-state', 'docs', 'test', 'benchmark']) visit(path.join(repoRoot, directory));
  assert.deepEqual(offenders, []);
});

test('the publication skill and its providers publish documents, not blocks', () => {
  const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
  const skill = read('skills/universal/to-backlog/SKILL.md');
  assert.match(skill, /A stored change document is published as it is/);
  assert.match(skill, /the title line is the issue title and the rest is the description/);
  const slices = read('skills/universal/to-backlog/slice-set.md');
  assert.match(slices, /`documents`/);
  assert.match(slices, /plus the `sai-backlog-slices@1`\s+correspondence marker/);
  assert.doesNotMatch(slices, /Ready to Propose|`blocks`/);
  for (const provider of ['azuredevops', 'gitlab']) assert.doesNotMatch(read(`skills/universal/to-backlog/providers/${provider}.md`), /`blocks`/);
  assert.match(read('skills/universal/to-backlog/providers/azuredevops.md'), /no code fence wraps it/);
  assert.doesNotMatch(read('sai/policies/backlog-origin-transport.md'), /ready-to-propose|\*\*Backlog origin\*\*/);
});
