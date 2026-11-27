'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const toolPath = path.join(repoRoot, 'sai', 'tools', 'change-document.js');
const doc = require(toolPath);
const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/issue-format.md'), 'utf8');
const hygienePolicy = fs.readFileSync(path.join(repoRoot, 'sai/policies/block-hygiene-judgment.md'), 'utf8');

const EXPLORE = 'claude 88a1341a-aab7-4efe-82d8-58de66098f65';

function change(lines = ['Change name: greeting-banner']) {
  return ['## Change', '', ...lines.map((line) => `- ${line}`), ''].join('\n');
}

/** A dispatchable document; `overrides` replace a section body by heading, `null` drops the section. */
function documentText(overrides = {}) {
  const bodies = {
    Problem: 'The greeting is easy to miss.',
    Goal: 'Show the greeting in a banner.',
    Scope: '- The banner shows the greeting text.',
    'Non-goals': 'None.',
    'Edge cases': '- E1: An empty greeting shows no banner.',
    'Implementation notes': '- I1: The banner reuses the existing renderer.',
    'Open questions': 'None.',
    Maturity: 'Ready to propose',
    Change: null,
  };
  const order = doc.SECTIONS.map((section) => section.name);
  const parts = ['# Show the greeting in a banner', ''];
  for (const name of order) {
    if (name === 'Change') {
      parts.push(overrides.Change === null ? '' : (overrides.Change ?? change()));
      continue;
    }
    const body = name in overrides ? overrides[name] : bodies[name];
    if (body === null || body === undefined) continue;
    parts.push(`## ${name}`, body, '');
  }
  return `${parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

function problems(result) {
  return result.violations.map((entry) => entry.problem);
}

test('a complete document is dispatchable and exposes its change metadata', () => {
  const text = documentText({ Change: change(['Change name: greeting-banner', 'Depends on: None', `Explore origin: ${EXPLORE}`, 'Specs: none — documentation only']) });
  const result = doc.checkDocument(text);
  assert.deepEqual(result.violations, []);
  assert.equal(result.dispatchable, true);
  assert.equal(result.name, 'greeting-banner');
  assert.equal(result.title, 'Show the greeting in a banner');
  assert.deepEqual(result.change.explore_origin, ['88a1341a-aab7-4efe-82d8-58de66098f65']);
  assert.equal(result.change.skip_specs, true);
  assert.deepEqual(result.edge_cases, ['E1']);
  assert.deepEqual(result.implementation_notes, ['I1']);
  assert.match(result.hash, /^[0-9a-f]{64}$/);
});

test('E1: Maturity, Open questions, Not agreed yet, and the Change section decide dispatchability and each failure is named', () => {
  assert.ok(problems(doc.checkDocument(documentText({ Maturity: 'Scope agreed' }))).includes('MATURITY_NOT_READY'));
  assert.ok(problems(doc.checkDocument(documentText({ 'Open questions': '- Q1: Which banner colour?' }))).includes('OPEN_QUESTIONS_PRESENT'));
  assert.ok(problems(doc.checkDocument(documentText({ Scope: 'Not agreed yet.' }))).includes('NOT_AGREED'));
  assert.ok(problems(doc.checkDocument(documentText({ Goal: 'Not agreed yet.' }))).includes('NOT_AGREED'));
  const noChange = doc.checkDocument(documentText({ Change: null }));
  assert.ok(problems(noChange).includes('MISSING_CHANGE_SECTION'));
  assert.ok(problems(noChange).includes('MISSING_CHANGE_NAME'));
  const noName = doc.checkDocument(documentText({ Change: change(['Depends on: None']) }));
  assert.deepEqual(problems(noName), ['MISSING_CHANGE_NAME']);
  const several = doc.checkDocument(documentText({ Maturity: 'Idea', 'Open questions': '- Q1: open', Change: null }));
  assert.ok(several.violations.length >= 4, 'every failed check is named, not only the first');
  assert.equal(several.dispatchable, false);
  for (const entry of several.violations) assert.ok(entry.detail && entry.line > 0);
});

test('E2: an unknown heading, sections out of order, and an empty optional section are named', () => {
  const unknown = doc.checkDocument(`${documentText().trimEnd()}\n\n## Rationale\nsome text\n`);
  const unknownEntry = unknown.violations.find((entry) => entry.problem === 'UNKNOWN_SECTION');
  assert.ok(unknownEntry);
  assert.match(unknownEntry.detail, /Rationale/);
  const lines = documentText().split('\n');
  const problemAt = lines.indexOf('## Problem');
  const goalAt = lines.indexOf('## Goal');
  const reordered = [...lines.slice(0, problemAt), ...lines.slice(goalAt, goalAt + 3), ...lines.slice(problemAt, goalAt), ...lines.slice(goalAt + 3)].join('\n');
  const outOfOrder = doc.checkDocument(reordered).violations.find((entry) => entry.problem === 'WRONG_SECTION_ORDER');
  assert.ok(outOfOrder);
  assert.match(outOfOrder.detail, /Problem/);
  const empty = doc.checkDocument(documentText({ Decisions: '' }));
  const emptyEntry = empty.violations.find((entry) => entry.problem === 'EMPTY_SECTION');
  assert.ok(emptyEntry);
  assert.match(emptyEntry.detail, /Decisions/);
  assert.ok(problems(doc.checkDocument(documentText({ Decisions: 'None.' }))).includes('EMPTY_SECTION'));
  assert.ok(problems(doc.checkDocument(`${documentText()}\n## Goal\nagain\n`)).includes('DUPLICATE_SECTION'));
  assert.ok(problems(doc.checkDocument(documentText({ Problem: null }))).includes('MISSING_SECTION'));
});

test('E3: headings and --- lines inside a fenced code block are ignored, and --- outside a fence separates nothing', () => {
  const fenced = documentText({ Scope: '- The banner shows the greeting text:\n\n```markdown\n## Not a section\n---\n# Not a title\n```\n\n---\n\nStill the Scope section.' });
  const result = doc.checkDocument(fenced);
  assert.deepEqual(result.violations, []);
  assert.equal(result.dispatchable, true);
  const tilde = documentText({ Scope: '~~~\n## Hidden\n~~~' });
  assert.deepEqual(doc.checkDocument(tilde).violations, []);
  const longFence = documentText({ Scope: '````\n```\n## Hidden\n````' });
  assert.deepEqual(doc.checkDocument(longFence).violations, []);
  const rule = documentText({ Scope: '- one\n---\n- two' });
  const parsed = doc.parseIssueSections(rule);
  assert.equal(parsed.first('scope').body.filter((line) => line === '---').length, 1);
  assert.equal(doc.checkDocument(rule).dispatchable, true);
});

test('E4: an absent Edge cases or Implementation notes section is agreed empty, but a slice owes one I#', () => {
  const bare = documentText({ 'Edge cases': null, 'Implementation notes': null });
  assert.equal(doc.checkDocument(bare).dispatchable, true);
  const sliced = doc.checkDocument(bare, { sliced: true });
  assert.ok(problems(sliced).includes('NO_IMPLEMENTATION_ITEM'));
  assert.equal(sliced.dispatchable, false);
  assert.equal(doc.checkDocument(documentText(), { sliced: true }).dispatchable, true);
  const set = doc.checkSet([bare, documentText({ Change: change(['Change name: second-slice']) })]);
  assert.equal(set.ok, false);
  assert.ok(set.documents[0].violations.some((entry) => entry.problem === 'NO_IMPLEMENTATION_ITEM'));
  assert.deepEqual(set.documents[1].violations, []);
  assert.equal(doc.checkSet([bare]).ok, true, 'a single change owes no I#');
});

test('identifiers: list items need E#/I# and an I# appears once', () => {
  assert.ok(problems(doc.checkDocument(documentText({ 'Edge cases': '- an empty greeting shows no banner' }))).includes('UNIDENTIFIED_ITEM'));
  assert.ok(problems(doc.checkDocument(documentText({ 'Implementation notes': '- I1: a\n- I1: b' }))).includes('DUPLICATE_IMPLEMENTATION_ITEM'));
  const across = documentText({ 'Out-of-scope implementation notes': '- I1: moved to a later slice' });
  assert.ok(problems(doc.checkDocument(across)).includes('DUPLICATE_IMPLEMENTATION_ITEM'));
  const owned = doc.checkSet([
    documentText({ 'Out-of-scope implementation notes': '- I2: belongs to the second slice', Change: change(['Change name: first-slice']) }),
    documentText({ 'Implementation notes': '- I2: second slice detail', Change: change(['Change name: second-slice', 'Depends on: first-slice']) }),
  ]);
  assert.deepEqual(owned.violations, []);
  assert.deepEqual(owned.order, ['first-slice', 'second-slice']);
  const unowned = doc.checkSet([
    documentText({ 'Out-of-scope implementation notes': '- I9: nobody owns this', Change: change(['Change name: first-slice']) }),
    documentText({ Change: change(['Change name: second-slice']) }),
  ]);
  assert.ok(unowned.violations.some((entry) => entry.problem === 'UNOWNED_IMPLEMENTATION_ITEM'));
});

test('set rules: unique names, present dependencies, no cycle', () => {
  const named = (name, depends) => documentText({ Change: change([`Change name: ${name}`, ...(depends ? [`Depends on: ${depends}`] : [])]) });
  assert.ok(doc.checkSet([named('same-name'), named('same-name')]).violations.some((entry) => entry.problem === 'DUPLICATE_CHANGE_NAME'));
  assert.ok(doc.checkSet([named('first-slice', 'absent-slice'), named('second-slice')]).violations.some((entry) => entry.problem === 'MISSING_DEPENDENCY'));
  assert.ok(doc.checkSet([named('first-slice', 'second-slice'), named('second-slice', 'first-slice')]).violations.some((entry) => entry.problem === 'DEPENDENCY_CYCLE'));
});

test('E5: a file without a title line, with an empty title, or with two documents fails verify-file naming the reason', () => {
  const transfer = require('../sai/tools/transfer');
  const opened = transfer.open('claude');
  try {
    const verify = (name, text, hash) => {
      const file = path.join(opened.dir, name);
      fs.writeFileSync(file, text);
      return spawnSync(process.execPath, [toolPath, 'verify-file', '--document-file', file, '--document-hash', hash ?? doc.hashDocument(text)], { encoding: 'utf8' });
    };
    const good = documentText();
    const accepted = verify('good.md', good);
    assert.equal(accepted.status, 0, accepted.stderr + accepted.stdout);
    assert.equal(JSON.parse(accepted.stdout).ok, true);
    const mismatch = verify('mismatch.md', good, '0'.repeat(64));
    assert.equal(mismatch.status, 1);
    assert.match(JSON.parse(mismatch.stdout).error, /does not match its hash/);
    const cases = [
      ['untitled.md', good.replace(/^# .*\n/, ''), /first line must be "# <title>"/],
      ['empty-title.md', good.replace(/^# .*\n/, '# \n'), /title after "# " must not be empty/],
      ['two.md', `${good}\n# Second change\n\n## Problem\nx\n`, /more than one document/],
    ];
    for (const [name, text, reason] of cases) {
      const before = fs.readFileSync(path.join(opened.dir, 'good.md'), 'utf8');
      const result = verify(name, text);
      assert.equal(result.status, 1, name);
      assert.match(JSON.parse(result.stdout).error, reason, name);
      assert.equal(fs.readFileSync(path.join(opened.dir, name), 'utf8'), text, 'verify changes nothing');
      assert.equal(before, good);
    }
    const relative = spawnSync(process.execPath, [toolPath, 'verify-file', '--document-file', 'good.md', '--document-hash', doc.hashDocument(good)], { encoding: 'utf8', cwd: opened.dir });
    assert.equal(relative.status, 1);
  } finally {
    transfer.close(opened.dir);
  }
  assert.ok(problems(doc.checkDocument('## Problem\nno title\n')).includes('MISSING_TITLE'));
  assert.ok(problems(doc.checkDocument(`${documentText()}\n# Another\n`)).includes('MULTIPLE_DOCUMENTS'));
  assert.ok(!problems(doc.checkDocument(documentText({ Scope: '```\n# not a title\n```' }))).includes('MULTIPLE_DOCUMENTS'));
});

test('E6: CRLF line endings hash like the LF text, and the hash covers the whole file', () => {
  const text = documentText();
  assert.equal(doc.hashDocument(text.replace(/\n/g, '\r\n')), doc.hashDocument(text));
  assert.equal(doc.checkDocument(text.replace(/\n/g, '\r\n')).hash, doc.checkDocument(text).hash);
  assert.notEqual(doc.hashDocument(`${text}\nextra`), doc.hashDocument(text));
  assert.deepEqual(doc.checkDocument(text.replace(/\n/g, '\r\n')).violations, []);
});

test('E8: an unknown Change key or an invalid value makes the document not dispatchable', () => {
  const bad = (lines) => doc.checkDocument(documentText({ Change: change(lines) }));
  assert.ok(problems(bad(['Change name: ok-name', 'Owner: someone'])).includes('UNKNOWN_CHANGE_KEY'));
  assert.ok(problems(bad(['Change name: Not Kebab'])).includes('INVALID_CHANGE_NAME'));
  assert.ok(problems(bad(['Change name: ok-name', 'Explore origin: claude not-a-uuid'])).includes('INVALID_EXPLORE_ORIGIN'));
  assert.ok(problems(bad(['Change name: ok-name', 'Specs: none'])).includes('INVALID_SPECS_FIELD'));
  assert.ok(problems(bad(['Change name: ok-name', 'Specs: none —'])).includes('EMPTY_SPECS_REASON'));
  assert.ok(problems(bad(['Change name: ok-name', 'Specs: some'])).includes('INVALID_SPECS_FIELD'));
  assert.ok(problems(bad(['Change name: ok-name', 'Backlog origin: https://example.com/not-an-issue'])).includes('INVALID_BACKLOG_ORIGIN'));
  assert.ok(problems(bad(['Change name: ok-name', 'Depends on: Bad Name'])).includes('DEPENDENCY_FORMAT'));
  assert.ok(problems(bad(['Change name: ok-name', 'Depends on: ok-name'])).includes('SELF_DEPENDENCY'));
  assert.ok(problems(bad(['Change name: ok-name', 'Change name: other-name'])).includes('DUPLICATE_CHANGE_KEY'));
  const proseLine = doc.checkDocument(documentText({ Change: '## Change\n\nChange name: ok-name\nthis is not a key line\n' }));
  assert.ok(problems(proseLine).includes('INVALID_CHANGE_LINE'));
  assert.equal(bad(['Change name: ok-name', 'Depends on: first-slice, second-slice']).dispatchable, true);
  assert.ok(doc.parseExploreOrigin(`claude 88a1341a-aab7-4efe-82d8-58de66098f65, 11111111-2222-3333-4444-555555555555`));
  assert.equal(doc.parseExploreOrigin('opencode 88a1341a-aab7-4efe-82d8-58de66098f65'), null);
});

test('the lexical pre-filter and the verdicts run over the whole document', () => {
  const text = documentText({ Scope: '- The banner shows the greeting text.\n- The change documents what git commit does for reviewers.' });
  const result = doc.checkDocument(text);
  assert.equal(result.ok, true);
  assert.equal(result.dispatchable, false);
  assert.deepEqual(result.flagged.map((entry) => entry.clause), ['mutating-git']);
  const line = result.flagged[0].line;
  assert.equal(text.split('\n')[line - 1].includes('git commit'), true, 'the flagged line number is the document line');
  const cleared = doc.checkDocument(text, { verdicts: [{ clause: 'mutating-git', line, evidence: 'the line documents the command', verdict: 'context' }] });
  assert.equal(cleared.dispatchable, true);
  const violation = doc.checkDocument(text, { verdicts: [{ clause: 'mutating-git', line, evidence: 'asks to run it', verdict: 'violation' }] });
  assert.equal(violation.dispatchable, false);
  assert.equal(violation.judgment.violations.length, 1);
  const unknown = doc.checkDocument(text, { verdicts: [{ clause: 'mutating-git', line, evidence: 'e', verdict: 'context' }, { clause: 'mutating-git', line: 1, evidence: 'e', verdict: 'context' }] });
  assert.equal(unknown.dispatchable, false);
  assert.equal(unknown.judgment.unknown.length, 1);
  const malformed = doc.checkDocument(text, { verdicts: [{ clause: 'mutating-git', line, verdict: 'context' }] });
  assert.equal(malformed.judgment.invalid.length, 1);
  const everyClause = documentText({ 'Implementation notes': '- I1: write tasks.md\n- I2: dispatch a worker\n- I3: edit openspec/specs/x/spec.md' });
  assert.deepEqual(doc.checkDocument(everyClause).flagged.map((entry) => entry.clause), ['planning-artifact', 'subagent-dispatch', 'published-spec-edit']);
  const metadataLine = doc.checkDocument(documentText({ Change: change(['Change name: ok-name', 'Specs: none — covers git push wording']) }));
  assert.deepEqual(metadataLine.flagged.map((entry) => entry.clause), ['mutating-git'], 'the Change section is not exempt');
});

test('the hygiene clause ids match the judgment policy', () => {
  const ids = doc.HYGIENE_CLAUSES.map((clause) => clause.id);
  assert.deepEqual(ids, ['planning-artifact', 'mutating-git', 'subagent-dispatch', 'published-spec-edit']);
  for (const id of ids) assert.ok(hygienePolicy.includes(`\`${id}\``), id);
});

test('compare reports metadata only when just the origin lines of Change changed', () => {
  const stored = documentText({ Change: change(['Change name: ok-name']) });
  const withOrigins = documentText({ Change: change(['Change name: ok-name', `Explore origin: ${EXPLORE}`]) });
  assert.deepEqual(doc.compareDocuments(stored, withOrigins), { amend_kind: 'metadata', changed_fields: ['Change: Explore origin'] });
  assert.equal(doc.compareDocuments(stored, stored).amend_kind, 'metadata');
  assert.deepEqual(doc.compareDocuments(stored, stored).changed_fields, []);
  const edited = documentText({ Goal: 'A different goal.', Change: change(['Change name: ok-name']) });
  assert.deepEqual(doc.compareDocuments(stored, edited), { amend_kind: 'content', changed_fields: ['Goal'] });
  const renamed = documentText({ Change: change(['Change name: other-name']) });
  assert.equal(doc.compareDocuments(stored, renamed).amend_kind, 'content');
  assert.equal(doc.compareDocuments(stored, stored.replace('# Show', '# Display')).amend_kind, 'content');
});

test('the issue-intake section reading keeps its stage state, open questions, and seed', () => {
  const read = doc.readIssue(documentText({ 'Open questions': '- Q1: Does E1 hold for an empty greeting?', Maturity: 'Edge cases agreed' }));
  assert.equal(read.maturity, 'Edge cases agreed');
  assert.equal(read.ready_to_propose_form, false);
  assert.equal(read.sections['explore-change'].status, 'present');
  assert.equal(read.sections['review-edge-cases'].status, 'present');
  assert.equal(read.open_questions.length, 1);
  assert.equal(read.seed.sections['review-edge-cases'].state, 'open');
  assert.deepEqual(read.seed.sections['implementation-details'].list, ['I1']);
  assert.equal(doc.readIssue(documentText()).ready_to_propose_form, true);
  const html = doc.readIssue('<h2>Problem</h2><p>p</p><h2>Goal</h2><p>g</p><h2>Scope</h2><ul><li>s</li></ul><h2>Maturity</h2><p>Ready to propose.</p>');
  assert.equal(html.ready_to_propose_form, true);
  const empty = doc.readIssue('## Problem\nNot agreed yet.\n');
  assert.equal(empty.sections['explore-change'].status, 'absent');
});

test('the command line checks, hashes, compares, and reads sections', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'change-document-'));
  try {
    const file = path.join(dir, 'doc.md');
    const text = documentText();
    fs.writeFileSync(file, text);
    const run = (args, input) => spawnSync(process.execPath, [toolPath, ...args], { encoding: 'utf8', input });
    const check = run(['check', '--document-file', file]);
    assert.equal(check.status, 0, check.stdout);
    assert.equal(JSON.parse(check.stdout).dispatchable, true);
    const hashed = run(['hash', '--document-file', file]);
    assert.equal(JSON.parse(hashed.stdout).hash, doc.hashDocument(text));
    const bad = path.join(dir, 'bad.md');
    fs.writeFileSync(bad, documentText({ Maturity: 'Idea' }));
    const failed = run(['check', '--document-file', bad]);
    assert.equal(failed.status, 1);
    assert.ok(JSON.parse(failed.stdout).violations.some((entry) => entry.problem === 'MATURITY_NOT_READY'));
    const flaggedFile = path.join(dir, 'flagged.md');
    const flaggedText = documentText({ Scope: '- The change documents git push for reviewers.' });
    fs.writeFileSync(flaggedFile, flaggedText);
    const pending = run(['check', '--document-file', flaggedFile]);
    assert.equal(pending.status, 1);
    const line = JSON.parse(pending.stdout).flagged[0].line;
    const verdicts = path.join(dir, 'verdicts.json');
    fs.writeFileSync(verdicts, JSON.stringify([{ clause: 'mutating-git', line, evidence: 'documents the command', verdict: 'context' }]));
    assert.equal(run(['check', '--document-file', flaggedFile, '--verdicts-file', verdicts]).status, 0);
    fs.writeFileSync(verdicts, 'not json');
    const unparseable = run(['check', '--document-file', flaggedFile, '--verdicts-file', verdicts]);
    assert.equal(unparseable.status, 1);
    assert.ok(JSON.parse(unparseable.stdout).violations.some((entry) => entry.problem === 'VERDICTS_UNPARSEABLE'));
    const set = run(['check-set', '--document-file', file, '--document-file', bad]);
    assert.equal(set.status, 1);
    const compared = run(['compare', '--stored-file', file, '--document-file', file]);
    assert.equal(JSON.parse(compared.stdout).amend_kind, 'metadata');
    const sections = run(['sections'], '## Problem\np\n\n## Goal\ng\n\n## Scope\n- s\n\n## Maturity\nIdea\n');
    assert.equal(JSON.parse(sections.stdout).maturity, 'Idea');
    assert.equal(run(['check']).status, 2);
    assert.equal(run(['check', '--document-file', path.join(dir, 'missing.md')]).status, 2);
    assert.equal(run(['unknown']).status, 2);
    assert.equal(run(['check', '--nope']).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('compose writes the literal issue text with the settled Change lines', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'change-document-'));
  try {
    const issue = documentText({ Change: null });
    const issueFile = path.join(dir, 'issue.md');
    const outputFile = path.join(dir, 'composed.md');
    fs.writeFileSync(issueFile, issue);
    const run = (args) => spawnSync(process.execPath, [toolPath, ...args], { encoding: 'utf8' });
    const result = run([
      'compose', '--input-file', issueFile,
      '--backlog-origin', 'https://github.com/owner/repo/issues/12',
      '--change-name', 'greeting-banner',
      '--explore-origin', EXPLORE,
      '--explore-origin', 'opencode ses_de1c29264fferEp1LOli9vp1In',
      '--specs', 'none — documentation only',
      '--declared-clean',
      '--output-file', outputFile,
    ]);
    assert.equal(result.status, 0, result.stderr);
    const reference = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(reference).sort(), ['document_file', 'hash']);
    assert.equal(reference.document_file, outputFile);
    const composed = fs.readFileSync(outputFile, 'utf8');
    assert.equal(reference.hash, doc.hashDocument(composed));
    assert.match(composed, /## Additional notes\n\nThe user declared that the issue has no drift from the current code without validating it\.\n/);
    assert.match(composed, /- Change name: greeting-banner\n- Depends on: None\n- Backlog origin: https:\/\/github\.com\/owner\/repo\/issues\/12\n- Explore origin: claude 88a1341a-aab7-4efe-82d8-58de66098f65, opencode ses_de1c29264fferEp1LOli9vp1In\n- Specs: none — documentation only\n$/);
    assert.equal(composed.indexOf('## Additional notes') < composed.indexOf('## Open questions'), true);
    const checked = doc.checkDocument(composed);
    assert.deepEqual(checked.violations, []);
    assert.equal(checked.dispatchable, true);
    assert.equal(checked.name, 'greeting-banner');
    assert.deepEqual(checked.change.explore_origin, ['88a1341a-aab7-4efe-82d8-58de66098f65', 'ses_de1c29264fferEp1LOli9vp1In']);
    assert.equal(checked.change.skip_specs, true);
    assert.match(composed, /## Problem\nThe greeting is easy to miss\./);
    assert.match(composed, /## Scope\n- The banner shows the greeting text\./);
    assert.match(composed, /## Maturity\nReady to propose/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('compose replaces an existing Change section, keeps its Depends on, and omits absent options', () => {
  const issue = documentText({ Change: change(['Change name: existing-name', 'Depends on: earlier-slice', `Explore origin: ${EXPLORE}`]) });
  const composed = doc.composeChangeDocument(issue, { backlogOrigin: 'https://github.com/owner/repo/issues/12' });
  assert.equal((composed.match(/## Change/g) || []).length, 1);
  assert.ok(composed.startsWith(issue.slice(0, issue.indexOf('## Change')).trimEnd()), 'the text before Change stays literal');
  assert.match(composed, /- Change name: existing-name\n- Depends on: earlier-slice\n- Backlog origin: https:\/\/github\.com\/owner\/repo\/issues\/12\n$/);
  assert.doesNotMatch(composed, /Specs:/);
  assert.doesNotMatch(composed, /Additional notes/);
  assert.equal(doc.checkDocument(composed).dispatchable, true);
  const appended = doc.composeChangeDocument(documentText({ 'Additional notes': 'Existing context.' }), {
    backlogOrigin: 'https://github.com/owner/repo/issues/12',
    changeName: 'greeting-banner',
    declaredClean: true,
  });
  assert.match(appended, /## Additional notes\nExisting context\.\n\nThe user declared that the issue has no drift from the current code without validating it\./);
});

test('compose without a backlog origin writes no Backlog origin line, for an issue pasted or read from a file', () => {
  const composed = doc.composeChangeDocument(documentText({ Change: null }), { changeName: 'greeting-banner' });
  assert.match(composed, /- Change name: greeting-banner\n- Depends on: None\n$/);
  assert.doesNotMatch(composed, /Backlog origin:/);
  assert.equal(doc.checkDocument(composed).dispatchable, true);
});

test('compose rejects an invalid origin, name, Explore origin, and Specs value as usage errors', () => {
  const issue = documentText({ Change: null });
  const usage = (options) => assert.throws(() => doc.composeChangeDocument(issue, options), (error) => error.usage === true);
  usage({ backlogOrigin: 'https://example.com/not-an-issue', changeName: 'greeting-banner' });
  usage({ backlogOrigin: 'https://github.com/owner/repo/issues/12', changeName: 'Not Kebab' });
  usage({ backlogOrigin: 'https://github.com/owner/repo/issues/12', changeName: 'greeting-banner', exploreOrigins: ['claude not-a-uuid'] });
  usage({ backlogOrigin: 'https://github.com/owner/repo/issues/12', changeName: 'greeting-banner', specs: 'none' });
  usage({ backlogOrigin: 'https://github.com/owner/repo/issues/12', changeName: 'greeting-banner', specs: 'none —' });
  usage({ backlogOrigin: 'https://github.com/owner/repo/issues/12', changeName: 'greeting-banner', specs: 'Specs: none — documentation only' });
});

test('issue-format.md defines the change document format the tool enforces', () => {
  const headings = [...policy.matchAll(/^### (.+) — (mandatory|optional)$/gm)].map((match) => match[1]);
  const expected = doc.SECTIONS.filter((section) => section.name !== 'Change').map((section) => section.name);
  assert.deepEqual(headings, expected);
  for (const key of doc.CHANGE_KEYS) assert.ok(policy.includes(`\`${key}:\``), key);
  assert.match(policy, /^## Change document/m);
  assert.match(policy, /sai\/tools\/change-document\.js/);
  assert.match(policy, /^### Change — required to dispatch$/m);
  for (const value of doc.MATURITY_VALUES) assert.ok(policy.includes(`- \`${value}\`:`), value);
  for (const name of doc.MANDATORY_SECTIONS) assert.ok(policy.includes(`### ${name} — mandatory`), name);
});
