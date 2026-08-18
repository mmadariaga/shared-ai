'use strict';

// Consecutive navigator screens must share one raw-input session.
//
// Tearing raw mode down and immediately back up in the same tick leaves the
// Windows console in line mode: the next screen receives no keypress until a
// line completes, so the user has to press Enter twice to move between
// screens. These tests pin the deferred-release contract that prevents it.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { promptSelect } = require('../bin/install-flow.js');

// A fake stdin that records the raw-mode lifecycle in call order.
function createRecordingInput() {
  const input = new EventEmitter();
  const log = [];
  input.isTTY = true;
  input.setRawMode = value => { log.push(`raw:${value}`); };
  input.resume = () => { log.push('resume'); };
  input.pause = () => { log.push('pause'); };
  input.log = log;
  return input;
}

function pressEnter(input) {
  setImmediate(() => {
    input.emit('keypress', '\r', { name: 'return', sequence: '\r', ctrl: false, shift: false });
  });
}

function nextImmediate() {
  return new Promise(resolve => setImmediate(resolve));
}

test('a second screen opened in the await continuation keeps stdin in raw mode', async () => {
  const input = createRecordingInput();

  const first = promptSelect('Post-setup customization:', ['Customize models', 'Exit'], input);
  pressEnter(input);
  const firstChoice = await first;

  // Snapshot taken in the same continuation the real screen loop uses.
  const betweenScreens = input.log.slice();

  const second = promptSelect('Choose a harness:', ['OpenCode', 'Claude Code'], input);
  pressEnter(input);
  const secondChoice = await second;

  assert.equal(firstChoice, 'Customize models');
  assert.equal(secondChoice, 'OpenCode');
  assert.deepEqual(betweenScreens, ['raw:true', 'resume']);
  assert.ok(
    !input.log.includes('raw:false') && !input.log.includes('pause'),
    `stdin left raw mode between screens: ${input.log.join(', ')}`
  );
});

test('the deferred release runs once the flow stops opening screens', async () => {
  const input = createRecordingInput();

  const screen = promptSelect('Choose a harness:', ['OpenCode', 'Claude Code'], input);
  pressEnter(input);
  await screen;

  assert.ok(!input.log.includes('pause'), 'release must not run before the next tick');

  await nextImmediate();

  assert.deepEqual(input.log, ['raw:true', 'resume', 'raw:false', 'pause']);
});

test('the pending release is flushed against its own stream when another takes over', async () => {
  const first = createRecordingInput();
  const second = createRecordingInput();

  const screen = promptSelect('Choose a harness:', ['OpenCode', 'Claude Code'], first);
  pressEnter(first);
  await screen;

  const takeover = promptSelect('Choose a customization scope:', ['Workers', 'Commands', 'Both'], second);
  pressEnter(second);
  await takeover;

  // The first stream is released immediately rather than stranded in raw mode.
  assert.deepEqual(first.log, ['raw:true', 'resume', 'raw:false', 'pause']);

  await nextImmediate();

  assert.deepEqual(second.log, ['raw:true', 'resume', 'raw:false', 'pause']);
});
