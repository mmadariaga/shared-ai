'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { expandInstallManifest } = require('../bin/install-manifest');
const manifest = require('../sai/install-manifest.json');
const repoRoot = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const format = read('skills/universal/to-backlog/issue-format.md');
const skill = read('skills/universal/to-backlog/SKILL.md');

// Inspect instruction regions, not issue drafts: these tests enforce the source
// contract and make no claim to execute or validate model behavior.
function region(text, heading) {
  const lines = text.split('\n');
  const starts = lines.flatMap((line, index) => line === heading ? [index] : []);
  assert.equal(starts.length, 1, `one authoritative region for ${heading}`);
  const depth = heading.match(/^#+/)[0].length;
  const start = starts[0] + 1;
  const end = lines.findIndex((line, index) => index >= start
    && new RegExp(`^#{1,${depth}} `).test(line));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

test('optional-section omission is consistent locally and in the mandatory skeleton', () => {
  const optional = ['Edge cases', 'Implementation notes', 'Decisions', 'Research leads'];
  const skeleton = format.match(/```markdown\n([\s\S]*?)\n```/)[1];
  for (const name of optional) {
    const local = region(format, `### ${name} — optional`);
    assert.match(local, /\b[Oo]mit when\s+empty\b/, name);
    assert.doesNotMatch(skeleton, new RegExp(`^## ${name}$`, 'm'), name);
    assert.doesNotMatch(local, /(?:retain|include|add|keep|show) (?:an? )?empty (?:section|heading)/i);
    assert.doesNotMatch(local, /(?:use|write|insert) `(?:None\.|Not agreed yet\.)`/i);
  }
  const order = region(format, '## Description order');
  const declaredOptional = order.match(/Optional ([\s\S]*?) appear between/)[1];
  assert.deepEqual([...declaredOptional.matchAll(/\*\*([^*]+)\*\*/g)].map(match => match[1]), optional);
  assert.match(region(format, '### Edge cases — optional'),
    /agreed\s+empty set permits `Edge cases agreed` without an empty Edge cases section/);
  assert.match(region(format, '## Final drafting checks'), /empty optional sections are\s+omitted/);
});

test('research-lead authority is consistent across agreement, local rules and completion', () => {
  const agreement = region(format, '## Agreement and update boundary');
  const research = region(format, '### Research leads — optional');
  const completion = region(format, '## Final drafting checks');
  assert.match(agreement, /\*\*Research leads\*\* is the explicitly non-authoritative exception/);
  assert.match(research, /non-authoritative starting points/);
  assert.match(research, /establish no requirement or verified fact/);
  assert.match(completion, /non-authoritative Research\s+leads/);
  assert.doesNotMatch(research, /(?:treat|use|accept|promote) [^.!\n]*(?:as requirements|as verified facts|as authoritative)/i);
  assert.doesNotMatch(research, /(?:references|leads) (?:are|establish|define) (?:agreed |verified )?(?:requirements|facts)/i);
  assert.match(region(format, '### Decisions — optional'), /evidence alone does not establish agreement/);
});

test('update preservation governs drafting and completion without historical normalization', () => {
  const boundary = region(format, '## Agreement and update boundary');
  const prepare = region(skill, '## 2. Prepare one item');
  assert.match(boundary, /For creation, apply the whole format\. For update, apply the agreed refinement/);
  assert.match(boundary, /preserve unaffected description content verbatim/);
  assert.match(boundary, /retaining existing section structure outside the edit boundary/);
  assert.match(prepare, /preserving unrelated description content\s+verbatim/);
  assert.match(region(format, '## Final drafting checks'), /On update, confirm unaffected content is unchanged/);
  for (const source of [format, prepare, read('skills/universal/to-backlog/update.md')]) {
    assert.doesNotMatch(source, /(?:^|[.!]\s+|\n- )(?:Migrate|Normalize|Rewrite|Reformat) (?:all |the entire |unaffected |unrelated )?(?:historical issues|baseline|description|content)/im);
    assert.doesNotMatch(source, /(?:replace|discard|remove) (?:unaffected|unrelated) (?:description )?content/i);
  }
  assert.match(boundary, /Do not migrate or normalize historical issues/);
});

test('identifier allocation uses retained history rather than remaining-list length', () => {
  const identifiers = region(format, '## Stable identifiers');
  const questions = region(format, '### Open questions — mandatory');
  const comment = /<!-- backlog-id-counters: E=(\d+) I=(\d+) Q=(\d+) -->/g;
  const examples = [...format.matchAll(comment)];
  assert.equal(examples.length, 2, 'one skeleton and one metadata example');
  assert.deepEqual(examples[0].slice(1), ['0', '0', '0']);
  assert.deepEqual(examples[1].slice(1), ['3', '2', '5']);
  assert.match(identifiers, /take each maximum from both existing identifiers and the\s+stored counter; allocate new identifiers above the corresponding maximum/);
  assert.match(identifiers, /Counters never decrease after deletion or resolution/);
  assert.match(questions, /new identifier where applicable; retain the used Q counter/);
  assert.match(identifiers, /Never renumber or\s+reuse removed identifiers; gaps are valid/);
  assert.match(region(format, '## Final drafting checks'), /preserved identifiers and maximum-used counters/);
  assert.doesNotMatch(identifiers, /(?:reset|decrement|reduce|lower|recycle|recalculate) (?:the |each |stored )?(?:counter|maximum|identifier)/i);
  assert.doesNotMatch(identifiers, /(?:allocate|assign|number)[^.;\n]*(?:list length|remaining count|first gap|lowest available)/i);
  assert.doesNotMatch(questions, /(?:reuse|retain|keep) (?:the |its )?Q# (?:in|as|for) (?:Edge cases|Implementation notes)/i);
});

test('both drafting branches must load the same installed reference before drafting', () => {
  const prepare = skill.split('## 2. Prepare one item')[1].split('## 3. Review and confirm')[0];
  assert.match(prepare, /For both \*\*create\*\* and \*\*update\*\*, read `issue-format\.md`/);
  assert.match(prepare, /from this skill's\s+directory before drafting/);
  assert.match(prepare, /final drafting checks pass/);
  assert.ok(prepare.indexOf('read `issue-format.md`') < prepare.indexOf('Draft only a title'));
  assert.match(skill, /Wait for an explicit answer/);
  assert.match(skill, /A prior general grant, unattended mode,\s+or command invocation is not confirmation/);
});

test('canonical format co-locates section rules and supplies ordered mandatory skeleton', () => {
  const sections = [...format.matchAll(/^### (.+) — (mandatory|optional)$/gm)]
    .map(match => [match[1], match[2]]);
  assert.deepEqual(sections, [
    ['Problem', 'mandatory'], ['Goal', 'mandatory'], ['Scope', 'mandatory'],
    ['Non-goals', 'mandatory'], ['Edge cases', 'optional'],
    ['Implementation notes', 'optional'], ['Decisions', 'optional'],
    ['Research leads', 'optional'], ['Open questions', 'mandatory'], ['Maturity', 'mandatory'],
  ]);
  const skeleton = format.match(/```markdown\n([\s\S]*?)\n```/)[1];
  assert.deepEqual([...skeleton.matchAll(/^## (.+)$/gm)].map(match => match[1]),
    ['Problem', 'Goal', 'Scope', 'Non-goals', 'Open questions', 'Maturity']);
  for (const section of ['Problem', 'Goal', 'Scope', 'Non-goals', 'Maturity']) {
    assert.ok(skeleton.includes(`## ${section}\nNot agreed yet.`));
  }
  assert.ok(skeleton.includes('## Open questions\nNone.'));
  assert.match(format, /imperative, outcome-focused title with no type prefix/);
  assert.match(format, /verifiable statements/);
  assert.match(format, /rather\s+than a duplicate acceptance-criteria section/);
  assert.match(format, /omit them when empty/);
  assert.match(format, /repository-wide conventions\s+only for a concrete exception or risk/);
});

test('agreement, tentative proposals and research evidence have distinct boundaries', () => {
  assert.match(format, /explicitly accepted by the user/);
  assert.match(format, /recommendations, user silence, and draft existence are insufficient/);
  assert.match(format, /unconfirmed behaviors, constraints, and decisions in \*\*Open questions\*\*/);
  assert.match(format, /outside that section must be agreed/);
  assert.match(format, /non-authoritative starting points\s+requiring investigation/);
  assert.match(format, /establish no requirement or verified fact/);
  assert.match(format, /evidence alone does not establish agreement/);
  assert.match(format, /Publication approval is a separate explicit step/);
  assert.match(format, /Publish results rather than template instructions/);
});

test('maturity is cumulative, evidence-based and can decrease after invalidation', () => {
  for (const value of ['Idea', 'Scope agreed', 'Edge cases agreed', 'Ready to propose']) {
    assert.ok(format.includes(`- \`${value}\`:`));
  }
  assert.match(format, /Require all preceding levels/);
  assert.match(format, /not implementation status/);
  assert.match(format, /reviewed and agreed edge cases, including an agreed\s+empty set/);
  assert.match(format, /reviewed and agreed necessary implementation details/);
  assert.match(format, /no proposal-blocking questions/);
  assert.match(format, /deferral is explicitly agreed/);
  assert.match(format, /Section presence does not establish maturity/);
  assert.match(format, /invalidates an earlier agreement[\s\S]*?lower Maturity/);
  assert.match(format, /If even the Idea criteria are unsupported, use `Not agreed yet\.`/);
});

test('updates preserve unaffected history and retain maximum-used identifier metadata', () => {
  assert.match(format, /preserve unaffected description content verbatim/);
  assert.match(format, /Do not migrate or normalize historical issues/);
  assert.match(format, /Preserve existing E#, I#, and Q# identifiers/);
  assert.match(format, /Never renumber or\s+reuse removed identifiers; gaps are valid/);
  assert.ok(format.includes('<!-- backlog-id-counters: E=3 I=2 Q=5 -->'));
  assert.match(format, /both existing identifiers and the\s+stored counter/);
  assert.match(format, /above the corresponding maximum/);
  assert.match(format, /Counters never decrease after deletion or resolution/);
  assert.match(format, /new identifier where applicable; retain the used Q counter/);
  assert.match(format, /without counters,\s+initialize from its existing identifiers/);
  assert.match(format, /Show the comment literally in the complete publication-approval draft/);
  assert.match(format, /retain it as agreed metadata in the published description/);
});

test('both harness projections install the canonical companion as managed content', () => {
  const reference = manifest.projections.find(item => item.id === 'to-backlog-references');
  assert.ok(reference.include.includes('issue-format.md'));
  assert.deepEqual(reference.harnesses, ['claude', 'opencode']);
  assert.equal(reference.ownership, 'managed');
  assert.equal(reference.drift, 'content');
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), `issue-format-projection-${harness}`);
    const destinationRoot = Object.fromEntries(
      ['commands', 'agents', 'sai', 'skills', 'config', 'root'].map(key => [key, path.join(base, key)])
    );
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const matches = projections.filter(item =>
      item.destinationPath === path.join(destinationRoot.skills, 'to-backlog/issue-format.md'));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].sourcePath, path.join(repoRoot, 'skills/universal/to-backlog/issue-format.md'));
    assert.equal(read(path.relative(repoRoot, matches[0].sourcePath)), format);
  }
});
