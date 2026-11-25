'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseYaml, readRequest, normalizeRequestText } = require('../sai/tools/yaml-subset');
const validator = require('../sai/tools/worker-report-validator');

const root = path.resolve(__dirname, '..');
const toPr = path.join(root, 'sai', 'tools', 'to-pr.js');
const toBacklog = path.join(root, 'sai', 'tools', 'to-backlog.js');
const prRegistry = path.join(root, 'skills', 'universal', 'to-pr', 'providers', 'registry.json');
const backlogRegistry = path.join(root, 'skills', 'universal', 'to-backlog', 'providers', 'registry.json');

const MARKDOWN = [
  '# Heading',
  '',
  '- item: with colon',
  '  # not a comment',
  '',
  'key: value',
  '```sh',
  'echo "$HOME"  # still text',
  '```',
].join('\n');
const indent = (text) => text.split('\n').map((line) => (line === '' ? '' : `  ${line}`)).join('\n');
const yamlRequest = (title, description) => `provider: github\ntitle: ${title}\ndescription: |\n${indent(description)}\n`;
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function tempFile(name, text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-request-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, text);
  return file;
}

function run(script, operation, registry, text, name = 'request.yaml') {
  const file = tempFile(name, text);
  try {
    const result = spawnSync(process.execPath, [script, operation, registry, '--input-file', file], { cwd: root, encoding: 'utf8' });
    return { status: result.status, out: JSON.parse(result.stdout.trim().split('\n').pop()) };
  } finally {
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
}

test('I1: the validator reads worker reports through the shared YAML subset module', () => {
  const report = 'status: completed\nsummary: ok\nchanged_files: []\n';
  assert.deepEqual(parseYaml(report), { status: 'completed', summary: 'ok', changed_files: [] });
  assert.equal(validator.parsePayloadText(report).payload.status, 'completed');
  assert.equal(typeof validator.parseYaml, 'undefined');
});

test('I2/E2: a file starting with { is read as JSON only, anything else as YAML', () => {
  assert.deepEqual(readRequest('  \n{"title": "a", "n": 1}'), { title: 'a', n: 1 });
  assert.throws(() => readRequest('{"title": "a",}'), (error) => error instanceof SyntaxError && !/^line \d+:/.test(error.message));
  assert.throws(() => readRequest('{title: a}'), SyntaxError);
  assert.deepEqual(readRequest('title: "a"\n'), { title: 'a' });
});

test('E3: content outside the YAML subset is rejected with the line it sits on', () => {
  assert.throws(() => readRequest('title: "a"\ntitle: "b"\n'), /line 2: duplicate key: title/);
  assert.throws(() => readRequest('title: &anchor a\n'), /line 1: unsupported YAML construct: &/);
  assert.throws(() => readRequest('title: !tag a\n'), /line 1: unsupported YAML construct: !/);
  assert.throws(() => readRequest('title: *alias\n'), /line 1: unsupported YAML construct: \*/);
  assert.throws(() => readRequest('title: a\n   extra: b\n'), /line 2: unexpected indentation/);
  assert.throws(() => readRequest('- a\n- b\n'), /mapping/);
});

test('E4: Markdown in a block scalar reaches the request unchanged', () => {
  const request = normalizeRequestText(readRequest(yamlRequest('"feat: x"', MARKDOWN)));
  assert.equal(request.description, MARKDOWN);
  assert.equal(request.title, 'feat: x');
});

test('E5: a block scalar line less indented than its first line is rejected with its line number', () => {
  const text = 'title: "t"\ndescription: |\n    first\n  second\n';
  assert.throws(() => readRequest(text), /line 4: block scalar line is less indented/);
  const unindented = 'title: "t"\ndescription: |\n  first\nsecond line\n';
  assert.throws(() => readRequest(unindented), /line 4/);
});

test('E6: a title or description that YAML reads as a number, boolean, or null is rejected as a wrong type', () => {
  for (const [text, kind] of [['title: 2026\n', 'number'], ['title: true\n', 'boolean'], ['title:\n', 'null'], ['title: ~\n', 'null']]) {
    assert.throws(() => normalizeRequestText(readRequest(text)), new RegExp(`"title" must be a string, got ${kind}`));
  }
  assert.throws(() => normalizeRequestText(readRequest('title: "t"\ndescription: 12\n')), /"description" must be a string/);
  assert.throws(() => normalizeRequestText({ title: 'ok', description: ['a'] }), /"description" must be a string, got a list/);
  assert.equal(normalizeRequestText(readRequest('title: "2026"\n')).title, '2026');
});

test('E7/I4: the same text gives the same value and binding as YAML or JSON, trailing line breaks removed', () => {
  const fromYaml = normalizeRequestText(readRequest(yamlRequest('"feat: x"', MARKDOWN)));
  const fromJson = normalizeRequestText(readRequest(JSON.stringify({ provider: 'github', title: 'feat: x', description: MARKDOWN })));
  const fromJsonBreak = normalizeRequestText(readRequest(JSON.stringify({ provider: 'github', title: 'feat: x\n', description: `${MARKDOWN}\n\n` })));
  assert.deepEqual(fromYaml, fromJson);
  assert.deepEqual(fromJsonBreak, fromJson);
  assert.equal(digest(fromYaml), digest(fromJson));
  const kept = normalizeRequestText(readRequest('title: "t"\ndescription: |+\n  body\n\n\n'));
  assert.equal(kept.description, 'body');
});

test('E1: a request without title and description is untouched', () => {
  const request = { explicit: { provider: 'github' } };
  assert.deepEqual(normalizeRequestText(readRequest(JSON.stringify(request))), request);
});

test('to-backlog.js accepts a YAML request and keeps accepting JSON', () => {
  const yaml = run(toBacklog, 'resolve-origin', backlogRegistry, 'provider: github\n');
  const json = run(toBacklog, 'resolve-origin', backlogRegistry, '{"provider":"github"}', 'request.json');
  assert.equal(yaml.status, 0);
  assert.equal(yaml.out.status, 'resolved');
  assert.deepEqual(yaml.out, json.out);
});

test('to-backlog.js rejects a wrong-typed title and a malformed YAML request before any provider call', () => {
  const type = run(toBacklog, 'query', backlogRegistry, 'provider: github\nrepository: code/repo\ntitle: 2026\ndescription: |\n  body\n');
  assert.equal(type.status, 2);
  assert.match(type.out.message, /"title" must be a string, got number/);
  const indentation = run(toBacklog, 'query', backlogRegistry, 'provider: github\ntitle: "t"\ndescription: |\n    a\n  b\n');
  assert.equal(indentation.status, 2);
  assert.match(indentation.out.message, /line 5/);
  const json = run(toBacklog, 'query', backlogRegistry, '{"title": }', 'request.json');
  assert.equal(json.status, 2);
  assert.doesNotMatch(json.out.message, /line \d+:/);
});

test('to-pr.js rejects a wrong-typed title and a malformed YAML request before any provider call', () => {
  const type = run(toPr, 'query', prRegistry, 'provider: github\ntitle: 2026\ndescription: |\n  body\n');
  assert.equal(type.status, 2);
  assert.equal(type.out.status, 'blocked');
  assert.match(type.out.message, /"title" must be a string, got number/);
  const duplicate = run(toPr, 'query', prRegistry, 'provider: github\ntitle: "a"\ntitle: "b"\n');
  assert.equal(duplicate.status, 2);
  assert.match(duplicate.out.message, /line 3: duplicate key: title/);
});

test('the instructions write the request as YAML and the policy names both tools', () => {
  const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
  assert.match(read('skills/universal/to-pr/SKILL.md'), /description: \|/);
  assert.match(read('skills/universal/to-pr/description-format.md'), /description: \|/);
  for (const file of ['github', 'gitlab', 'azuredevops']) {
    assert.match(read('skills/universal/to-backlog/providers', `${file}.md`), /description: \|/);
  }
  assert.match(read('sai/policies/tool-resolution.md'), /`to-pr\.js` and `to-backlog\.js`, may be written as YAML/);
});
