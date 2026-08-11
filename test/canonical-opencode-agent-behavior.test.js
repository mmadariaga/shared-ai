'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

const POLICIES = [
  { name: 'budget', fetchTarget: '@sai/policies/budget-agent.md' },
  { name: 'executor', fetchTarget: '@sai/policies/executor-agent.md' },
  { name: 'explore', fetchTarget: '@sai/policies/explore-agent.md' },
];

function policyPath(name) {
  return path.join(REPO_ROOT, 'sai', 'policies', `${name}-agent.md`);
}

function resolveFetchTarget(target) {
  assert.match(target, /^@sai\/policies\/(?:budget|executor|explore)-agent\.md$/,
    'generic-agent policies must use an exact sai policy Fetch target');
  return path.join(REPO_ROOT, target.slice(1).split('/').join(path.sep));
}

function readPolicy(name) {
  const filePath = policyPath(name);
  assert.ok(fs.existsSync(filePath), `${filePath} should exist at the exact policy path`);
  return fs.readFileSync(filePath, 'utf8');
}

test('canonical generic-agent policies resolve from their exact Fetch targets', () => {
  for (const policy of POLICIES) {
    const expectedPath = path.join(REPO_ROOT, 'sai', 'policies', `${policy.name}-agent.md`);
    assert.equal(resolveFetchTarget(policy.fetchTarget), expectedPath,
      `${policy.fetchTarget} should resolve to its matching exact file path`);
    assert.ok(fs.existsSync(expectedPath),
      `${policy.fetchTarget} should resolve to an existing policy file`);
  }
});

test('canonical generic-agent policies are behavior-only documents', () => {
  for (const policy of POLICIES) {
    const content = readPolicy(policy.name);

    assert.doesNotMatch(content, /^---\r?\n/m,
      `${policy.name} policy must not have YAML agent frontmatter`);
    assert.doesNotMatch(content,
      /^\s*(?:description|model|variant|effort|mode|temperature|reasoning|provider|permission|tools|metadata)\s*:/im,
      `${policy.name} policy must not select an agent model or metadata`);
    assert.doesNotMatch(content, /\b(?:installer|installation|install-manifest|projection|projected|destination|ownership|drift)\b/i,
      `${policy.name} policy must not contain installer or projection logic`);
    assert.doesNotMatch(content, /(?:import|require)\s+(?:[^\n]*\b)?(?:open\s*code|opencode)\b|from\s+['"](?:open\s*code|opencode)/i,
      `${policy.name} policy must not contain a native OpenCode import`);
    assert.doesNotMatch(content, /\b(?:claude|opencode|harness)\b|agent\s+registration|register(?:ed|ing)?\s+(?:an?\s+)?agent/i,
      `${policy.name} policy must not contain harness-specific registration`);
  }
});

test('budget policy preserves its bounded one-task completion contract', () => {
  const content = readPolicy('budget');

  assert.match(content, /\b(?:exactly\s+one|one|single)\s+task\b/i,
    'budget policy should require one-task execution');
  assert.match(content, /no\s+self[- ]correction|do\s+not\s+self[- ]correct|must\s+not\s+self[- ]correct/i,
    'budget policy should prohibit self-correction');
  assert.match(content, /bounded\s+output|minimal\s+output|concise\s+output|output\s+(?:length\s+)?cap/i,
    'budget policy should bound output');
  for (const field of ['status', 'actions_taken', 'failures']) {
    assert.match(content, new RegExp(`\\b${field}\\b`),
      `budget policy completion output should include ${field}`);
  }
  assert.match(content, /key\s+result/i,
    'budget policy completion output should include a key result');
  assert.match(content, /permission[- ]block(?:ed)?[\s\S]{0,100}abort|abort[\s\S]{0,100}permission[- ]block(?:ed)?/i,
    'budget policy should abort on a permission block');
  assert.match(content, /(?:approximately\s+)?(?:30|~30)[- ]?(?:tool\s+)?calls?|30[- ]call/i,
    'budget policy should preserve the approximately 30-call cap');
  assert.match(content, /cap|limit|maximum/i,
    'budget policy should describe the call bound as a cap or limit');
});

test('executor policy preserves exact narrow low-output execution and failure tallies', () => {
  const content = readPolicy('executor');

  assert.match(content, /exact[- ]command|execute\s+(?:the\s+)?exact\s+command/i,
    'executor policy should require exact-command execution');
  assert.match(content, /narrow/i,
    'executor policy should keep execution narrow');
  assert.match(content, /low[- ]output|minimal\s+output|concise\s+output/i,
    'executor policy should keep execution output low');
  assert.match(content, /parallel/i,
    'executor policy should permit parallel execution');
  assert.match(content, /independent\s+commands?|commands?[\s\S]{0,100}independent/i,
    'executor policy should identify independent commands as parallelizable');
  assert.match(content, /structured\s+failure|failure\s+details?|failures?/i,
    'executor policy should report structured failure details');
  assert.match(content, /test(?:s)?(?:\s+(?:count|tally|summary|run|pass|fail)|\s*[:=])?/i,
    'executor policy failure details should include test tallies');
  assert.match(content, /build(?:s)?(?:\s+(?:count|tally|summary|run|pass|fail)|\s*[:=])?/i,
    'executor policy failure details should include build tallies');
});

test('explore policy preserves bounded read-only research and its spawn output contract', () => {
  const content = readPolicy('explore');

  assert.match(content, /read[- ]only/i,
    'explore policy should require read-only research');
  assert.match(content, /bounded|limit|cap/i,
    'explore policy should bound research');
  assert.match(content, /caller[- ]owned|owned\s+by\s+the\s+caller/i,
    'explore policy should keep summaries caller-owned');
  assert.match(content, /structured\s+summar(?:y|ies)/i,
    'explore policy should require structured summaries');
  assert.match(content, /no\s+raw\s+output|never\s+(?:return|emit|include)\s+raw\s+(?:output|content)/i,
    'explore policy should prohibit raw output');
  assert.match(content, /(?:approximately\s+)?(?:30|~30)[- ]?(?:tool\s+)?calls?|30[- ]call/i,
    'explore policy should preserve the 30-call cap');
  assert.match(content, /cap|limit|maximum/i,
    'explore policy should describe the call bound as a cap or limit');
  assert.match(content, /output\s+contract/i,
    'explore policy should require a spawn output contract');
  assert.match(content, /exact\s+fields?/i,
    'explore spawn output contract should specify exact fields');
  assert.match(content, /length\s+cap|bounded\s+length|output\s+cap/i,
    'explore spawn output contract should specify a length cap');
  assert.match(content, /no\s+raw\s+(?:output|content)/i,
    'explore spawn output contract should prohibit raw output');
});
