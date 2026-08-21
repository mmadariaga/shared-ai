'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const reportPairs = Object.freeze([
  Object.freeze({
    id: 'review',
    scaffold: 'openspec/schemas/sai-workflow/templates/review.md',
    authority: 'sai/commands/review/review-report.template.md',
  }),
  Object.freeze({
    id: 'security',
    scaffold: 'openspec/schemas/sai-workflow/templates/security.md',
    authority: 'sai/commands/security/security-report.template.md',
  }),
  Object.freeze({
    id: 'performance',
    scaffold: 'openspec/schemas/sai-workflow/templates/performance.md',
    authority: 'sai/commands/performance/performance-report.template.md',
  }),
  Object.freeze({
    id: 'accessibility',
    scaffold: 'openspec/schemas/sai-workflow/templates/accessibility.md',
    authority: 'sai/commands/accessibility/accessibility-report.template.md',
  }),
]);

const implementationPair = Object.freeze({
  id: 'implementation',
  scaffold: 'openspec/schemas/sai-workflow/templates/implementation.md',
  authority: 'sai/commands/implement/implementation-plan.template.md',
});

const pairs = Object.freeze([...reportPairs, implementationPair]);

const reportDelegation =
  'severity vocabulary, evidence rules, finding shape, and tally line are defined in';
const implementationDelegation =
  'planning, conditional RED/GREEN, verification, STOP & COMMIT, and commit-authorization checklist are defined in';
const summaryComment =
  '<!-- Summary: use the command-owned tally line from the write-time authority; do not restate severity levels here. -->';
const retiredParityPath = 'test/report-template-parity.test.js';

function fullPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readUtf8(relativePath) {
  assert.ok(fs.existsSync(fullPath(relativePath)), `${relativePath} should exist`);
  return fs.readFileSync(fullPath(relativePath), 'utf8');
}

function findFenceRange(content) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const opener = lines[i].match(/^(\s*)```markdown\s*$/);
    if (!opener) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const closer = lines[j].match(/^(\s*)```\s*$/);
      if (closer && closer[1] === opener[1]) {
        return { start: i, end: j };
      }
    }
    return null;
  }
  return null;
}

function extractBody(content) {
  const range = findFenceRange(content);
  if (!range) return content;
  const lines = content.split(/\r?\n/);
  return lines.slice(range.start + 1, range.end).join('\n');
}

function extractHeadings(content) {
  return extractBody(content)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^#{2,5} /.test(line))
    .map(line => line.replace(/^(#{2,5})\s+/, '$1 '));
}

function extractTopHeadings(content) {
  return extractBody(content)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('## '))
    .map(line => line.slice(3).trim());
}

function extractHeaderLabels(content) {
  const labels = [];
  for (const line of extractBody(content).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) break;
    const match = trimmed.match(/^(?:-\s+)?\*\*(.+?)\*\*:/);
    if (match) labels.push(match[1].trim());
  }
  return labels;
}

function extractAuthorityComments(content) {
  const comments = [];
  const expression = /<!--\s*Write-time authority:\s*([\s\S]*?)-->/gi;
  for (const match of content.matchAll(expression)) {
    comments.push({
      raw: match[0],
      body: match[1].trim(),
      index: match.index,
    });
  }
  return comments;
}

function expectedAuthorityComment(pair, delegatedWording) {
  return `<!-- Write-time authority: ${delegatedWording} ${pair.authority} -->`;
}

function sectionBlocks(content) {
  const lines = content.split(/\r?\n/);
  const starts = [];
  lines.forEach((line, index) => {
    if (/^## /.test(line.trim())) starts.push(index);
  });
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? lines.length;
    return {
      heading: lines[start].trim().slice(3).trim(),
      body: lines.slice(start + 1, end).join('\n'),
    };
  });
}

function schemaEntryBlock(schema, id) {
  const lines = schema.split(/\r?\n/);
  const idPattern = new RegExp('^([ \\t]*)-?\\s*id:\\s*' + id + '\\s*$');
  const start = lines.findIndex(line => idPattern.test(line));
  assert.notEqual(start, -1, `schema.yaml should declare id: ${id}`);

  const entryIndent = lines[start].match(/^[ \\t]*/)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const indent = line.match(/^[ \	]*/)[0].length;
    if (indent <= entryIndent && (/^-?\s*id:\s*/.test(line.trim()) || line.trim() === 'apply:')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function schemaInstruction(schema, id) {
  const block = schemaEntryBlock(schema, id);
  const lines = block.split(/\r?\n/);
  const instructionIndex = lines.findIndex(line => /^\s*instruction:\s*\|/.test(line));
  assert.notEqual(instructionIndex, -1, `${id} should declare a literal instruction block`);

  const instructionIndent = lines[instructionIndex].match(/^[ \\t]*/)[0].length;
  const body = [];
  for (let index = instructionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim()) {
      const indent = line.match(/^[ \	]*/)[0].length;
      if (indent <= instructionIndent) break;
    }
    body.push(line.slice(Math.min(line.length, instructionIndent + 2)));
  }
  return body.join('\n').replace(/\n+$/, '');
}

function schemaApplyBlock(schema) {
  const lines = schema.split(/\r?\n/);
  const start = lines.findIndex(line => /^apply:\s*$/.test(line.trim()));
  assert.notEqual(start, -1, 'schema.yaml should declare apply:');
  return lines.slice(start).join('\n');
}

function nonInstructionGraphLines(schema, id) {
  const block = schemaEntryBlock(schema, id);
  return block
    .split(/\r?\n/)
    .filter(line => !/^\s*instruction:\s*\|/.test(line))
    .join('\n');
}

function assertFinalAuthority(pair, scaffold, delegatedWording) {
  const comments = extractAuthorityComments(scaffold);
  const expected = expectedAuthorityComment(pair, delegatedWording);

  assert.equal(
    comments.length,
    1,
    `${pair.scaffold} must contain exactly one final Write-time authority comment`,
  );
  assert.equal(comments[0].raw, expected, `${pair.scaffold} authority wording must be exact`);
  assert.equal(scaffold.trimEnd().endsWith(expected), true,
    `${pair.scaffold} authority comment must be the final non-whitespace content`);
  assert.equal(fs.existsSync(fullPath(pair.authority)), true,
    `${pair.scaffold} authority target must exist`);
}

test('schema report scaffolds use the command-owned write-time authorities', () => {
  for (const pair of reportPairs) {
    const scaffold = readUtf8(pair.scaffold);
    const authority = readUtf8(pair.authority);
    const payload = extractBody(authority);

    assertFinalAuthority(pair, scaffold, reportDelegation);
    assert.deepEqual(
      extractTopHeadings(scaffold),
      extractTopHeadings(payload),
      `${pair.id} schema scaffold and authority must retain the same top-level heading sequence`,
    );
    assert.deepEqual(
      extractHeaderLabels(scaffold),
      extractHeaderLabels(payload),
      `${pair.id} schema scaffold must retain the authority header metadata labels`,
    );

    assert.match(scaffold, /^# .+$/m, `${pair.id} scaffold must retain its report title`);
    assert.match(scaffold, /\{[^}\r\n]+\}/,
      `${pair.id} scaffold must retain at least one discoverable placeholder`);
    assert.equal(scaffold.split(summaryComment).length - 1, 1,
      `${pair.id} scaffold must contain one descriptive Summary tally comment`);

    const authorityIndex = scaffold.lastIndexOf('<!-- Write-time authority:');
    const summaryIndex = scaffold.indexOf(summaryComment);
    assert.ok(summaryIndex < authorityIndex,
      `${pair.id} Summary tally comment must precede the final authority pointer`);
    assert.equal(
      scaffold.slice(summaryIndex + summaryComment.length, authorityIndex).trim(),
      '',
      `${pair.id} Summary tally comment must be immediately before the final authority pointer`,
    );

    for (const section of sectionBlocks(scaffold)) {
      const meaningful = section.body.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      assert.match(meaningful[0] || '', /^<!-- [^\r\n]+ -->$/,
        `${pair.id} ${section.heading} must begin with one one-line HTML purpose comment`);
      const sectionComments = meaningful.filter(line => /^<!-- [^\r\n]+ -->$/.test(line));
      assert.equal(
        sectionComments.filter(line => !line.startsWith('<!-- Summary:') && !line.startsWith('<!-- Write-time authority:')).length,
        1,
        `${pair.id} ${section.heading} must have one one-line purpose comment`,
      );
    }

    const bodyStart = scaffold.indexOf('\n## ');
    const bodyEnd = scaffold.lastIndexOf('<!-- Write-time authority:');
    const descriptiveBody = bodyStart >= 0
      ? scaffold.slice(bodyStart, bodyEnd)
      : '';
    assert.doesNotMatch(descriptiveBody, /^\s*(?:-\s+)?\*\*[^*\r\n]+\*\*:/m,
      `${pair.id} schema body must not duplicate write-time field labels`);
    assert.doesNotMatch(descriptiveBody,
      /\b(?:Critical|High|Medium|Low|Informational|Question|Blocker|Major|Minor)\b/,
      `${pair.id} schema body must not restate severity levels`);
    assert.doesNotMatch(descriptiveBody,
      /\b(?:severity|evidence|finding)\s+(?:field|rule|shape|identifier|format)\b/i,
      `${pair.id} schema body must not restate normative finding/evidence rules`);
  }
});

test('implementation schema scaffold preserves the conditional plan shape and apply citation', () => {
  const scaffold = readUtf8(implementationPair.scaffold);
  const authority = readUtf8(implementationPair.authority);

  assertFinalAuthority(implementationPair, scaffold, implementationDelegation);
  assert.equal(scaffold.match(/^# \{FEATURE_NAME\}\s*$/m)?.[0].trim(), '# {FEATURE_NAME}',
    'implementation scaffold must use the canonical feature-name title shape');
  assert.deepEqual(
    extractTopHeadings(scaffold),
    ['Goal', 'Prerequisites'],
    'implementation scaffold must expose Goal and Prerequisites as its top-level sections',
  );
  for (const heading of [
    '### Step-by-Step Instructions',
    '#### Step 1: {Action}',
    '##### RED phase',
    '##### GREEN phase (only after RED is verified)',
    '##### Step 1 Verification Checklist',
    '#### Step 1 STOP & COMMIT',
  ]) {
    assert.match(scaffold, new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'),
      `implementation scaffold must preserve ${heading}`);
  }
  assert.match(scaffold, /non-testable/i,
    'implementation scaffold must describe non-testable steps');
  assert.match(scaffold, /deferred/i,
    'implementation scaffold must describe deferred steps');
  assert.match(scaffold, /without RED\/GREEN when behavior is not yet rendered/i,
    'implementation scaffold must make RED/GREEN conditional rather than universal');

  const stopIndex = scaffold.indexOf('STOP & COMMIT');
  assert.ok(stopIndex >= 0, 'implementation scaffold must describe STOP & COMMIT');
  const stopDescription = scaffold.slice(stopIndex);
  assert.match(stopDescription, /sai\/commands\/apply\/invocation\.md/,
    'STOP & COMMIT must cite the apply invocation contract');
  assert.match(stopDescription, /per-Step STOP & COMMIT gate/i,
    'STOP & COMMIT must name the per-Step gate');
  assert.match(stopDescription, /terminal documentation commit gate/i,
    'STOP & COMMIT must name the terminal documentation commit gate');
  assert.doesNotMatch(stopDescription, /sai\/commands\/apply\/instructions\.md/,
    'STOP & COMMIT must not cite the retired apply instructions path');

  const authorityHeadings = extractTopHeadings(authority);
  assert.deepEqual(
    authorityHeadings.filter(heading => heading === 'Goal' || heading === 'Prerequisites'),
    ['Goal', 'Prerequisites'],
    'implementation authority must retain the Goal/Prerequisites correspondence',
  );
  for (const heading of ['##### RED phase', '##### GREEN phase', '##### Step 1 Verification Checklist']) {
    const headingPattern = heading === '##### GREEN phase'
      ? '^##### GREEN phase(?: \\(only after RED is verified\\))?\\s*$'
      : `^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`;
    assert.match(extractBody(authority), new RegExp(headingPattern, 'm'),
      `implementation authority must retain ${heading}`);
  }
});

test('schema instructions are exact two-sentence pointers and graph/apply baselines stay immutable', () => {
  const schema = readUtf8('openspec/schemas/sai-workflow/schema.yaml');

  for (const pair of pairs) {
    const instruction = schemaInstruction(schema, pair.id).trim();
    const expected =
      `Fetch and follow ${pair.authority} exactly. This instruction is an informative reference only; it does not restate the ${pair.id === 'implementation' ? 'implementation plan' : `${pair.id} report`} contract.`;
    assert.equal(instruction, expected,
      `${pair.id} schema instruction must use the exact two-sentence informative-pointer formula`);
    assert.equal(instruction.split(/(?<=[.!?])\s+/).length, 2,
      `${pair.id} schema instruction must contain exactly two sentences`);
  }

  // These are immutable graph guards: the five artifact entries may replace only
  // their instruction blocks, never their graph identity or descriptive metadata.
  for (const pair of pairs) {
    const graph = nonInstructionGraphLines(schema, pair.id);
    assert.match(graph, new RegExp(`\\bgenerates:\\s*${pair.id}\\.md\\b`),
      `${pair.id} generates value must remain the checked-in graph value`);
    assert.match(graph, /^\s*requires:\s*(?:\[[^\]\r\n]*\]|\r?\n\s+-\s+\S.*?)\s*$/m,
      `${pair.id} requires value must remain an explicit checked-in graph value`);
    assert.match(graph, /^\s*description:\s*\S.+$/m,
      `${pair.id} description must remain a checked-in graph value`);
  }

  const apply = schemaApplyBlock(schema);
  assert.match(apply, /^\s*instruction:\s*\|[\s\S]+/m,
    'apply must retain its separate instruction block');
  assert.doesNotMatch(apply, /sai\/commands\/(?:review|security|performance|accessibility|implement)\/.*template\.md/,
    'the immutable apply instruction must not be replaced by an artifact pointer');
});

test('the retired parity test path is absent after the authority-test replacement', () => {
  assert.equal(fs.existsSync(fullPath(retiredParityPath)), false,
    'test/report-template-parity.test.js must be removed or renamed in GREEN');
});
