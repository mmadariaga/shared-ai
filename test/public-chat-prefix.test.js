'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const policy = fs.readFileSync(path.join(__dirname, '../sai/policies/public-chat.md'), 'utf8');
const prefix = policy.split('## Message prefix\n')[1]?.split('\n## ')[0];

test('shared public-chat policy covers all explanatory messages with a language-independent prefix', () => {
  assert.ok(prefix);
  assert.match(prefix, /In Claude Code and opencode/);
  assert.match(prefix, /exactly `➡️` followed by one space, regardless of language/);
  assert.match(prefix, /every user-facing explanatory message/);
  assert.match(prefix, /progress updates, questions, and summaries, not only messages that require a reply/);
});

test('the author marks user-facing fields once and presenters preserve them', () => {
  assert.match(prefix, /one leading marker per message, not per paragraph or forwarded passage/);
  assert.match(prefix, /author adds it at the source/);
  assert.match(prefix, /user-facing `question`, `message`, and `summary` string values/);
  assert.match(prefix, /presenting agent forwards that text unchanged without adding a second marker/);
});

test('prefix exceptions preserve exact text and protected content', () => {
  assert.match(prefix, /not its internal content/);
  assert.match(prefix, /code, documents, structured data outside those user-facing string values, picker options, and internal agent communications/);
  assert.match(prefix, /Existing exact-text exceptions prevail/);
  assert.match(prefix, /prohibits prefixes or requires an exact first line/);
  assert.match(prefix, /without prepending the marker/);
  assert.match(policy, /Where exact protocol wording and this policy conflict, the protocol wording wins/);
});
