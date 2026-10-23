'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const identity = require('../sai/tools/backlog-slice-identity');
const detector = require('../sai/tools/ready-to-propose');
const { digest } = require('../sai/tools/to-backlog-github');
const { bind } = require('../sai/tools/backlog-set-update');

function block(name) {
  return ['## Ready to Propose', ...detector.STRICT_FIELDS.filter(field => !field.optional || field.label === 'Depends on').map(field => `**${field.label}**: ${field.label === 'Change name' ? name : field.inline ? 'None' : '\n- I1: source'}`), '---'].join('\n');
}
function fixture(t, provider) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-set-update-')); fs.chmodSync(directory, 0o700);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const url = n => provider === 'github' ? `https://github.com/owner/repo/issues/${n}` : provider === 'gitlab' ? `https://gitlab.example/group/repo/-/issues/${n}` : `https://dev.azure.com/org/project/_workitems/edit/${n}`;
  const marker = { version: 1, platform: provider, role: 'parent', parent: url(1), slices: ['one', 'two'].map((change_name, i) => ({ change_name, issue: url(i + 2), depends_on: [] })) };
  const encode = provider === 'azuredevops' ? identity.encodeHtml : identity.encode;
  const rows = [1, 2, 3].map((n, i) => ({ status: 'complete', repository: 'destination', actor: 'actor', issue: { id: n, number: n, url: url(n) }, baseline: { title: `old-${n}`, description: `old\n${encode(i ? { ...marker, role: 'child', change_name: marker.slices[i - 1].change_name } : marker)}` } }));
  const state = { writes: [], fail: null, lost: null, after: null, reads: [] };
  const adapter = {
    'read-update': request => {
      const row = rows.find(row => row.issue.url === request.reference);
      if (!row) throw new Error('missing child');
      state.reads.push(row.issue.number);
      return structuredClone(row);
    },
    'query-update': request => {
      const row = adapter['read-update'](request);
      if (digest(row.baseline) !== digest(request.baseline)) return { status: 'needs_input', reason: 'stale-baseline' };
      const proposal = { ...row, title: request.title, description: request.description };
      return { status: row.baseline.title === request.title && row.baseline.description === request.description ? 'no_changes' : 'ready', proposal, confirmation: digest(proposal) };
    },
    update: request => {
      const ready = adapter['query-update'](request);
      assert.equal(request.confirmation, ready.confirmation);
      fs.writeFileSync(request.receipt, JSON.stringify(request), { flag: 'wx' });
      const row = rows.find(row => row.issue.url === request.reference);
      if (state.fail === row.issue.number) return { status: 'pending', message: 'injected failure' };
      row.baseline = { title: request.title, description: request.description };
      state.writes.push(row.issue.number);
      if (state.after) state.after(row);
      return { status: state.lost === row.issue.number ? 'uncertain' : 'complete' };
    },
    'recover-update': request => {
      const saved = JSON.parse(fs.readFileSync(request.receipt, 'utf8'));
      const current = adapter['read-update'](saved);
      return { status: current.baseline.title === saved.title && current.baseline.description === saved.description ? 'complete' : 'pending' };
    }
  };
  const tool = bind(provider, () => adapter), request = { origin: url(1), title: 'refined parent', description: 'refined objective', blocks: block('two') + '\n' + block('one') };
  return { tool, request, rows, state, file: path.join(directory, 'update.json') };
}
for (const provider of ['github', 'gitlab', 'azuredevops']) {
  test(`${provider}: adopted parents still require unambiguous matching upper correspondence`, t => {
    const f = fixture(t, provider), child = identity.decode(f.rows[1].baseline.description);
    const encode = provider === 'azuredevops' ? identity.encodeHtml : identity.encode;
    const nested = { version: 1, platform: provider, role: 'parent', parent: f.rows[1].issue.url,
      slices: [{ change_name: 'descendant', issue: f.rows[0].issue.url.replace(/1$/, '4'), depends_on: [] }], child_of: child };
    // A valid local parent marker alone cannot prove membership in the upper set.
    const { child_of, ...unlinked } = nested;
    f.rows[1].baseline.description = encode(unlinked);
    assert.throws(() => f.tool['query-set-update'](f.request), /correspondence/);
    const incompatible = structuredClone(nested);
    incompatible.child_of.slices[1].depends_on = ['one'];
    f.rows[1].baseline.description = encode(incompatible);
    assert.throws(() => f.tool['query-set-update'](f.request), /correspondence/);
    f.rows[1].baseline.description = encode(nested) + '\n' + encode(nested);
    assert.throws(() => f.tool['query-set-update'](f.request), /ambiguous|Ambiguous/);
    assert.deepEqual(f.state.writes, []);
    assert.equal(fs.existsSync(f.file), false);
  });
  test(`${provider}: set approval binds exact content and baseline, rejection causes no writes`, t => {
    const f = fixture(t, provider), ready = f.tool['query-set-update'](f.request);
    for (const patch of [{ confirmation: 'wrong' }, { description: 'unapproved', confirmation: ready.confirmation }]) {
      assert.equal(f.tool['update-set']({ ...f.request, receipt: f.file, ...patch }).status, 'failure_before_publication');
    }
    f.rows[2].baseline.title = 'concurrent edit';
    assert.equal(f.tool['update-set']({ ...f.request, receipt: f.file, confirmation: ready.confirmation }).status, 'failure_before_publication');
    assert.deepEqual(f.state.writes, []);
    assert.equal(fs.existsSync(f.file), false);
  });
  test(`${provider}: missing or ambiguous child correspondence blocks the entire set`, t => {
    const f = fixture(t, provider);
    const mismatched = f.request.blocks.replace('**What**:', `**Backlog origin**: ${f.rows[0].issue.url}\n**What**:`);
    assert.throws(() => f.tool['query-set-update']({ ...f.request, blocks: mismatched }), /Block origin/);
    f.rows[2].baseline.description = f.rows[1].baseline.description;
    assert.throws(() => f.tool['query-set-update'](f.request), /correspondence/);
    f.rows.pop();
    assert.throws(() => f.tool['query-set-update'](f.request), /missing child/);
    assert.deepEqual(f.state.writes, []);
  });
  test(`${provider}: partial failure is durable and recovery skips applied updates`, t => {
    const f = fixture(t, provider), ready = f.tool['query-set-update'](f.request);
    f.state.fail = 2;
    const result = f.tool['update-set']({ ...f.request, receipt: f.file, confirmation: ready.confirmation });
    assert.equal(result.status, 'partial_failure');
    assert.deepEqual(result.updated.map(row => row.number), [1]);
    assert.deepEqual(result.pending.map(row => row.issue.number), [2, 3]);
    const recovered = f.tool['recover-set-update']({ receipt: f.file });
    assert.deepEqual(f.state.writes, [1]);
    f.state.fail = null;
    assert.equal(f.tool['continue-set-update']({ receipt: f.file, confirmation: recovered.continuation, automatic_retry: true }).status, 'complete');
    assert.deepEqual(f.state.writes, [1, 2, 3]);
    assert.equal(f.tool['recover-set-update']({ receipt: f.file }).status, 'complete');
  });
  test(`${provider}: edits during a partial update stop pending writes and renewal is required`, t => {
    const f = fixture(t, provider), ready = f.tool['query-set-update'](f.request);
    f.state.after = row => { if (row.issue.number === 1) f.rows[2].baseline.title = 'remote edit'; };
    const result = f.tool['update-set']({ ...f.request, receipt: f.file, confirmation: ready.confirmation });
    assert.equal(result.status, 'partial_failure');
    assert.deepEqual(result.updated.map(row => row.number), [1]);
    assert.deepEqual(f.state.writes, [1]);
    const recovered = f.tool['recover-set-update']({ receipt: f.file });
    assert.equal(recovered.continuation, undefined);
    assert.match(recovered.message, /renew/);
    assert.equal(f.tool['continue-set-update']({ receipt: f.file, confirmation: ready.confirmation }).status, 'partial_failure');
    assert.deepEqual(f.state.writes, [1]);
  });
  test(`${provider}: lost update response is reconciled without repeating the write`, t => {
    const f = fixture(t, provider), ready = f.tool['query-set-update'](f.request);
    f.state.lost = 1;
    assert.equal(f.tool['update-set']({ ...f.request, receipt: f.file, confirmation: ready.confirmation }).status, 'complete');
    assert.deepEqual(f.state.writes, [1, 2, 3]);
    assert.equal(f.tool['recover-set-update']({ receipt: f.file }).status, 'complete');
    assert.deepEqual(f.state.writes, [1, 2, 3]);
  });
}
