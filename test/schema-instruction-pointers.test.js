'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const schemaDir = 'openspec/schemas/sai-workflow';
const citedFilePattern = /(?<![\w./-])@?(sai\/[\w./-]+\.md)(?![\w-])/g;

function citedInstructionFiles(content) {
  return [...content.matchAll(citedFilePattern)].map(match => match[1]);
}

function missingCitedFiles(content, exists) {
  return [...new Set(citedInstructionFiles(content))].filter(cited => !exists(cited));
}

function existsInRepo(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function schemaSources() {
  const templates = fs.readdirSync(path.join(repoRoot, schemaDir, 'templates'))
    .filter(name => name.endsWith('.md'))
    .map(name => `${schemaDir}/templates/${name}`);
  return [`${schemaDir}/schema.yaml`, ...templates];
}

test('every instruction file cited by the sai-workflow schema and templates exists', () => {
  for (const source of schemaSources()) {
    const content = fs.readFileSync(path.join(repoRoot, source), 'utf8');
    assert.deepEqual(missingCitedFiles(content, existsInRepo), [],
      `${source} cites an instruction file that does not exist`);
  }
});

test('the schema design, tasks, and interfaces instructions cite their design step files', () => {
  const schema = fs.readFileSync(path.join(repoRoot, schemaDir, 'schema.yaml'), 'utf8');
  for (const id of ['design', 'tasks', 'interfaces']) {
    assert.ok(citedInstructionFiles(schema).includes(`sai/commands/design/steps/${id}.md`),
      `schema.yaml should cite sai/commands/design/steps/${id}.md`);
  }
});

test('the pointer check reports a cited instruction file that does not exist', () => {
  const retired = 'sai/commands/design/instructions.md';
  const content = [
    `Fetch and follow ${retired} section ## Generate design.md exactly.`,
    '<!-- Write-time authority: sai/commands/design/steps/design.md ## Generate design.md -->',
  ].join('\n');

  assert.deepEqual(missingCitedFiles(content, existsInRepo), [retired]);
});
