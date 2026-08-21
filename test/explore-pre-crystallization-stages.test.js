'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function readArtifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

const explore = () => readArtifact('sai/commands/explore/instructions.md');
const opencodeBinding = () => readArtifact('sai/adapters/opencode/idea-list-render.md');
const claudeBinding = () => readArtifact('sai/adapters/claude/idea-list-render.md');
const opencodePanel = () => readArtifact('sai/adapters/opencode/panel-render.md');
const claudePanel = () => readArtifact('sai/adapters/claude/panel-render.md');

const MATURITY_TRACE_FIXTURES = [
  {
    response: 'review-edge-cases',
    askMode: 'ask_mode: false',
    events: ['text-question-emitted', 'selector-presented', 'selector-option-received', 'edge-case-writing-prompt-emitted'],
  },
  {
    response: 'keep-iterating',
    askMode: 'ask_mode: true',
    events: ['text-question-emitted', 'selector-presented', 'selector-option-received'],
  },
  {
    response: 'maturity-selector free text',
    askMode: 'ask_mode: true',
    events: ['text-question-emitted', 'selector-presented', 'selector-free-text-received'],
  },
];

test('the explore instructions render the four stage labels in order', () => {
  const source = explore();
  const labels = ['Explore change', 'Review edge cases', 'Implementation details', 'Crystallize'];
  let previous = -1;
  for (const label of labels) {
    const position = source.indexOf(label);
    assert.ok(position > previous, `${label} should appear after the preceding stage label`);
    previous = position;
  }
});

test('stage advancement fires only on the literal next-step token with intent recognition', () => {
  const source = explore();
  assert.match(source, /the literal token `next-step`/);
  assert.match(source, /Mere containment of the string `next-step` SHALL NOT fire the token/);
  assert.match(source, /dominant intent/);
});

test('phase-navigation questions fall through while substantive uncertainty remains genuine', () => {
  const source = explore();
  assert.match(source, /question whose dominant purpose is only to navigate[\s\S]{0,500}fall through to the stage-aware reminder/i);
  assert.match(source, /question that contains substantive uncertainty capable of changing the idea remains a genuine unresolved question/i);
});

test('the Ready to Propose block template orders Edge Cases, Implementation Details, Overview language', () => {
  const source = explore();
  const edgeCases = source.indexOf('**Edge Cases**');
  assert.ok(edgeCases >= 0, 'the template should carry **Edge Cases**');
  const implementationDetails = source.indexOf('**Implementation Details**', edgeCases);
  assert.ok(implementationDetails > edgeCases, '**Implementation Details** should follow **Edge Cases**');
  const overviewLanguage = source.indexOf('**Overview language**', implementationDetails);
  assert.ok(overviewLanguage > implementationDetails, '**Overview language** should follow **Implementation Details**');
});

test('gate 9 is opt-in, puts the do-not-create choice first, and has no Recommended marker', () => {
  const source = explore();
  const selectorStart = source.search(/(?:Gate 9|gate-9|overview[- ]language selector)/i);
  assert.ok(selectorStart >= 0, 'the opt-in overview-language selector should be specified');

  const selector = source.slice(selectorStart);
  assert.match(selector, /(?:None\s*(?:—|-)\s*do[- ]not[- ]create|do[- ]not[- ]create[\s\S]{0,120}None)/i);
  assert.doesNotMatch(source, /emitted first and carrying the `Recommended` marker/);
  assert.doesNotMatch(source, /emitted second, carrying no marker/);
});

test('Ready to Propose records the selected overview language or literal None', () => {
  const source = explore();
  const fields = source.match(/\*\*Overview language\*\*:\s*[^\n]*/g) || [];

  assert.ok(fields.length > 0, 'Ready to Propose should include an Overview language field');
  for (const field of fields) {
    assert.match(field, /(?:None|<[^>\n]*(?:selected|overview language|language)[^>\n]*>)/i);
  }
});

test('both bindings carry the idea-list marker in their pinned machine-readable field', () => {
  const opencode = opencodeBinding();
  const claude = claudeBinding();

  assert.match(opencode, /`priority` field, with value `sai-idea-list:<change-name>`/);
  assert.match(claude, /`description` field, with value `sai-idea-list:<change-name>`/);
});

test('both render bindings retain the shared idea-list surface policy', () => {
  const opencode = opencodeBinding();
  const claude = claudeBinding();

  const sharedFragments = [
    'sai-idea-list:<change-name>',
    'pending | in_progress | completed',
    'active review item',
    'coordinator session',
  ];
  for (const fragment of sharedFragments) {
    assert.ok(opencode.includes(fragment), `opencode binding should carry: ${fragment}`);
    assert.ok(claude.includes(fragment), `Claude binding should carry: ${fragment}`);
  }
});

test('the chat-start clear removes exactly entries bearing either marker prefix', () => {
  const exploreSource = explore();
  const opencode = opencodePanel();
  const claude = claudePanel();

  assert.match(exploreSource, /start clear removes entries bearing either marker prefix/);
  assert.match(exploreSource, /read covers the markers only and never derives list content/);
  for (const binding of [opencode, claude]) {
    assert.match(binding, /start clear/);
    assert.match(binding, /removes the entries bearing that surface's marker/);
    assert.match(binding, /read never derives list content/);
  }
});

test('optional maturity selectors are additive, text-first, localized, and capability-gated', () => {
  const source = explore();
  const textQuestion = source.indexOf('After the unchanged existing maturity text question has been emitted');
  const selector = source.indexOf('a supported capability may present one maturity selector', textQuestion);

  assert.ok(textQuestion >= 0, 'the unchanged maturity text question must remain authoritative');
  assert.ok(selector > textQuestion, 'the maturity selector must follow the unchanged text question');
  assert.match(source, /NativeStageSelectorCapability\s*=\s*\{ available: boolean, supportsFreeText: boolean, present\(selector, orderedOptions\) -> SelectorResponse \}/);
  assert.match(source, /SelectorResponse\s*=\s*\{ selector: maturity\|later, kind: option\|free-text, value: review-edge-cases\|keep-iterating\|next-step\|discuss-ideas-feedback\|null, text: string\|null \}/);
  assert.match(source, /only when both `available: true` and `supportsFreeText: true`/);
  assert.match(source, /missing capability response, `available: false`, or `supportsFreeText: false`[\s\S]{0,180}text-only fallback[\s\S]{0,120}cannot advance/i);

  const spanishReview = source.indexOf('Revisar edge cases');
  const spanishIterate = source.indexOf('Seguir iterando');
  assert.ok(spanishReview > selector, 'Spanish review option should be part of the maturity selector');
  assert.ok(spanishIterate > spanishReview, 'Spanish maturity options must preserve their order');
  assert.match(source, /review edge cases \(`review-edge-cases`\)[\s\S]{0,260}keep iterating \(`keep-iterating`\)[\s\S]{0,160}free-text/i);
  assert.match(source, /For `kind: option`, `value` is the stable protocol value and `text` is `null`/);
});

test('maturity selector responses preserve staged ask mode and review-entry gates', () => {
  const source = explore();

  assert.match(source, /Selecting `review-edge-cases` enters the existing edge-case writing prompt/);
  assert.match(source, /records `ask_mode: false` for that interaction/);
  assert.match(source, /does not agree the proposed list, run implementation details, crystallize, or advance beyond that prompt/);
  assert.match(source, /Selecting `keep-iterating` or submitting maturity-selector free text keeps `ask_mode: true`/);
  assert.match(source, /preserves the current stage and agreed lists/);
  assert.match(source, /performs no automatic progression/);
  assert.match(source, /advances only on a later explicit `next-step` request or equivalent natural-language advancement/);

  assert.match(source, /Contract tests may observe the harness-neutral trace vocabulary[\s\S]{0,320}crystallization-requested/);
  for (const fixture of MATURITY_TRACE_FIXTURES) {
    assert.match(source, new RegExp(fixture.response.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')),
      `${fixture.response} should be represented by the maturity selector contract`);
    assert.match(source, new RegExp(fixture.askMode.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')),
      `${fixture.response} should preserve its ask mode`);
    let previous = -1;
    for (const event of fixture.events) {
      const position = source.indexOf(event);
      assert.ok(position > previous, `${fixture.response} trace should keep ${event} in order`);
      previous = position;
    }
  }
  for (const event of [
    'text-question-emitted',
    'selector-presented',
    'selector-option-received',
    'selector-free-text-received',
    'edge-case-writing-prompt-emitted',
    'explicit-advancement-received',
    'stage-advanced',
    'material-reset',
    'crystallization-requested',
  ]) {
    assert.match(source, new RegExp(`\\b${event}\\b`), `trace vocabulary should include ${event}`);
  }
  assert.match(source, /stage: string, ask_mode: true\|false, emitted_prompt: string\|null/);
  assert.match(source, /This vocabulary is test observation only and is not a production response field/);
});

test('material changes reset every pending selector and staged state before classification', () => {
  const source = explore();

  assert.match(source, /Material-change detection runs before selector-response classification/);
  assert.match(source, /reset wins: clear the pending maturity or later selector response, staged progression, pending crystallization request, and both agreed lists/);
  assert.match(source, /return the new active-uncrystallized lifecycle to `Explore change`/);
  assert.match(source, /do not emit an edge-case prompt, later selector, crystallization, or advancement automatically/);
  assert.match(source, /The new idea waits for explicit intent under the existing staged-progression rules/);
});

test('selector flows keep overview opt-out and renderer ownership unchanged', () => {
  const source = explore();

  assert.match(source, /Selectors never select or infer an `Overview language`/);
  assert.match(source, /Without a separately supported explicit overview opt-in/);
  assert.match(source, /literal `\*\*Overview language\*\*: None`/);
  assert.match(source, /dispatches no overview generation/);
  assert.match(source, /Selectors never select or infer[\s\S]{0,700}panel ownership/);
  assert.match(source, /selector semantics are not duplicated in wrappers, panel renderers, installation projections, or `remember\.md`/);
  assert.match(source, /Claude Code and opencode consume this shared contract/);
  for (const renderer of [opencodeBinding(), claudeBinding(), opencodePanel(), claudePanel()]) {
    assert.doesNotMatch(renderer, /NativeStageSelectorCapability|keep-iterating|discuss-ideas-feedback|selector-presented|selector-option-received|selector-free-text-received/);
  }
});
