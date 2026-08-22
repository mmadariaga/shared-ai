'use strict';

// Two behaviors pinned here:
//
//   1. Frame redraw arithmetic. runNavigator repaints by moving the cursor up
//      and overwriting. The move must count *physical* terminal rows (a label
//      wider than the terminal wraps onto several) and the old frame must be
//      erased, or leftover text from the previous frame survives underneath the
//      new one.
//   2. Back navigation. Left/Backspace/Escape step out of a screen into its
//      predecessor, which is distinct from cancelling the whole flow.
//
// Both suites drive the engine through the injected `input` seam (a fake
// EventEmitter carrying isTTY plus setRawMode()/resume()/pause() stubs) and,
// for the redraw assertions, an injected `output` with a fixed column width.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  runNavigator,
  promptChecklist,
  promptSelect,
  BACK,
} = require('../bin/install-flow.js');

const modelCustomization = require('../bin/model-customization.js');
const { runPostSetupMenu, createOpencodeAdapter } = modelCustomization;

const INTERACTION_TIMEOUT = 5000;
const ITEMS = ['Claude Code', 'Opencode'];

const CURSOR_UP = /\x1B\[(\d+)A/g;
const ERASE_BELOW = '\x1B[0J';
const HIDE_CURSOR = '\x1B[?25l';
const SHOW_CURSOR = '\x1B[?25h';

// --- seams ---------------------------------------------------------------

function createFakeInput(tty = true) {
  const input = new EventEmitter();
  input.isTTY = tty;
  input.setRawMode = () => {};
  input.resume = () => {};
  input.pause = () => {};
  return input;
}

function createFakeOutput(columns) {
  const chunks = [];
  return {
    columns,
    write(chunk) {
      chunks.push(String(chunk));
      return true;
    },
    text() {
      return chunks.join('');
    },
  };
}

function keyInfo(name, sequence, extra) {
  return { name, sequence, ctrl: false, shift: false, ...extra };
}

function schedulePresses(input, presses) {
  let index = 0;
  const step = () => {
    if (index >= presses.length) return;
    const [str, info] = presses[index];
    index += 1;
    input.emit('keypress', str, info);
    setImmediate(step);
  };
  setImmediate(step);
}

function cursorUpCounts(text) {
  return [...text.matchAll(CURSOR_UP)].map(match => Number(match[1]));
}

const DOWN = ['', keyInfo('down', '\x1b[B')];
const RETURN = ['\r', keyInfo('return', '\r')];
const LEFT = ['', keyInfo('left', '\x1b[D')];
const BACKSPACE = ['\x7f', keyInfo('backspace', '\x7f')];
const ESCAPE = ['\x1b', keyInfo('escape', '\x1b')];

// --- redraw arithmetic ----------------------------------------------------

test('redraw moves the cursor up one row per rendered line when nothing wraps', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput();
  const output = createFakeOutput(80);
  const promise = runNavigator({
    mode: 'single',
    question: 'Select a model:',
    options: ITEMS,
    defaultSelected: [],
    input,
    output,
  });
  schedulePresses(input, [DOWN, RETURN]);
  await promise;

  // question + 2 options = 3 rows, all comfortably inside 80 columns.
  assert.deepEqual(cursorUpCounts(output.text()), [3],
    'the single redraw should move up exactly the three rows the frame occupies');
});

test('redraw counts the physical rows a wrapped option occupies, not its logical line', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput();
  const output = createFakeOutput(20);
  // '> [ ] ' prefix is 6 columns; a 30-character label therefore renders 36
  // columns wide, wrapping onto ceil(36 / 20) = 2 rows per option.
  const wide = ['A'.repeat(30), 'B'.repeat(30)];
  const promise = runNavigator({
    mode: 'multi',
    question: 'Pick:',
    options: wide,
    defaultSelected: [],
    input,
    output,
  });
  schedulePresses(input, [DOWN, RETURN]);
  await promise;

  // question (1) + two wrapped options (2 + 2) = 5 physical rows.
  assert.deepEqual(cursorUpCounts(output.text()), [5],
    'a wrapped option must contribute every physical row it occupies to the redraw offset');
});

test('every redraw erases the previous frame so shorter lines leave no tail behind', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput();
  const output = createFakeOutput(80);
  const promise = runNavigator({
    mode: 'multi',
    question: 'Pick:',
    options: ITEMS,
    defaultSelected: [],
    input,
    output,
  });
  schedulePresses(input, [DOWN, DOWN, RETURN]);
  await promise;

  const text = output.text();
  const frames = text.split(ERASE_BELOW).length - 1;
  const redraws = cursorUpCounts(text).length;
  assert.equal(frames, redraws + 1,
    'the initial frame and each redraw should erase everything below the cursor');
});

test('the cursor is hidden while a frame is live and restored when the prompt settles', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput();
  const output = createFakeOutput(80);
  const promise = runNavigator({
    mode: 'single',
    question: 'Select a model:',
    options: ITEMS,
    defaultSelected: [],
    input,
    output,
  });
  schedulePresses(input, [RETURN]);
  await promise;

  const text = output.text();
  assert.ok(text.indexOf(HIDE_CURSOR) !== -1, 'the cursor should be hidden before the first frame');
  assert.ok(text.indexOf(HIDE_CURSOR) < text.indexOf(SHOW_CURSOR),
    'the cursor should be hidden before it is restored');
  assert.ok(text.endsWith(SHOW_CURSOR), 'the terminal cursor must be restored on the way out');
});

// --- back navigation on the engine ---------------------------------------

for (const [label, press] of [['Left arrow', LEFT], ['Backspace', BACKSPACE], ['Escape', ESCAPE]]) {
  test(`${label} resolves the checklist as back, distinct from cancelled`, { timeout: INTERACTION_TIMEOUT }, async () => {
    const input = createFakeInput();
    const promise = promptChecklist(ITEMS, ITEMS, input);
    schedulePresses(input, [press]);
    assert.deepEqual(await promise, { status: 'back' });
  });

  test(`${label} resolves promptSelect to the BACK sentinel, never null and never an option`, { timeout: INTERACTION_TIMEOUT }, async () => {
    const input = createFakeInput();
    const promise = promptSelect('Select a model:', ITEMS, input);
    schedulePresses(input, [press]);
    const result = await promise;
    assert.equal(result, BACK, 'stepping back must be reported with the BACK sentinel');
    assert.notEqual(result, null, 'back must be distinguishable from cancellation');
  });
}

test('back is reported without terminating the process and after cursor restoration', { timeout: INTERACTION_TIMEOUT }, async () => {
  const originalExit = process.exit;
  const exitCalls = [];
  process.exit = (...args) => { exitCalls.push(args); };
  try {
    const input = createFakeInput();
    const output = createFakeOutput(80);
    const promise = runNavigator({
      mode: 'multi',
      question: 'Pick:',
      options: ITEMS,
      defaultSelected: [],
      input,
      output,
    });
    schedulePresses(input, [LEFT]);
    assert.deepEqual(await promise, { status: 'back' });
    assert.equal(exitCalls.length, 0, 'stepping back must never call process.exit');
    assert.ok(output.text().endsWith(SHOW_CURSOR), 'stepping back must restore the terminal cursor');
  } finally {
    process.exit = originalExit;
  }
});

test('a non-TTY input still resolves non-interactive and never back', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(false);
  assert.deepEqual(await promptChecklist(ITEMS, ITEMS, input), { status: 'non-interactive' });
});

// --- back navigation through the post-setup menu --------------------------

function makeFakeAdapter(agents, ops, settings = { model: 'opencode-go/test-model' }) {
  return {
    enumerateWorkers() {
      ops.enumerate += 1;
      return agents;
    },
    async selectSettings(label) {
      ops.select.push(label);
      return typeof settings === 'function' ? settings(ops.select.length) : settings;
    },
    createLocalOverride(target, chosen) {
      const name = typeof target === 'string' ? target : target.name;
      ops.create.push({ target, settings: chosen });
      return { status: 'persisted', agent: name, destination: `/tmp/${name}.md` };
    },
  };
}

function patchFactory(name, replacement) {
  const original = modelCustomization[name];
  modelCustomization[name] = replacement;
  return function restore() {
    modelCustomization[name] = original;
  };
}

const AGENTS = ['sai-1-spec-proposal-worker', 'sai-2-design-worker'];

// Answers the menu screens in order. BACK entries step backwards, exercising
// the re-prompt path.
function scriptedChoice(answers, questions) {
  return async (question) => {
    questions.push(question);
    return answers.shift();
  };
}

test('back at the harness picker re-opens the main menu instead of cancelling', { timeout: INTERACTION_TIMEOUT }, async () => {
  const ops = { select: [], create: [], enumerate: 0 };
  const restore = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(AGENTS, ops));
  const questions = [];
  try {
    const result = await runPostSetupMenu({
      isTTY: true,
      // menu -> harness (back) -> menu -> harness -> scope -> targets
      promptChoice: scriptedChoice(['Customize models', BACK, 'Customize models', 'OpenCode', 'Workers', 'Exit'], questions),
      promptChecklist: async (items) => ({ status: 'confirmed', items }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(questions, [
      'Post-setup customization:',
      'Choose a harness:',
      'Post-setup customization:',
      'Choose a harness:',
      'Choose a customization scope:',
      'Post-setup customization:',
    ], 'stepping back from the harness picker should redisplay the main menu, then the picker again');
  } finally {
    restore();
  }
});

test('back at the target checklist re-opens the scope screen and then the harness picker, re-enumerating the chosen harness', { timeout: INTERACTION_TIMEOUT }, async () => {
  const opencodeOps = { select: [], create: [], enumerate: 0 };
  const claudeOps = { select: [], create: [], enumerate: 0 };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(AGENTS, claudeOps, { model: 'sonnet', effort: 'low' }));
  const questions = [];
  let checklistCalls = 0;
  try {
    const result = await runPostSetupMenu({
      isTTY: true,
      // menu -> OpenCode -> Workers -> checklist (back) -> scope (back) -> harness -> Claude Code -> Workers -> checklist
      promptChoice: scriptedChoice(['Customize models', 'OpenCode', 'Workers', BACK, 'Claude Code', 'Workers', 'Exit'], questions),
      promptChecklist: async (items) => {
        checklistCalls += 1;
        return checklistCalls === 1 ? { status: 'back' } : { status: 'confirmed', items };
      },
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(checklistCalls, 2, 'the checklist should be reopened after the harness is re-picked');
    assert.deepEqual(questions, [
      'Post-setup customization:',
      'Choose a harness:',
      'Choose a customization scope:',
      'Choose a customization scope:',
      'Choose a harness:',
      'Choose a customization scope:',
      'Post-setup customization:',
    ], 'stepping back from the checklist should return to the scope screen, then back to the harness picker');
    assert.equal(claudeOps.create.length, AGENTS.length,
      'the corrected harness should be the one that gets configured');
    assert.equal(opencodeOps.create.length, 0,
      'the abandoned harness must never persist an override');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('back at the settings screen re-opens the target checklist without persisting anything', { timeout: INTERACTION_TIMEOUT }, async () => {
  const ops = { select: [], create: [], enumerate: 0 };
  const restore = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(
    AGENTS,
    ops,
    call => (call === 1 ? BACK : { model: 'opencode-go/test-model' })
  ));
  const checklistSelections = [];
  try {
    const result = await runPostSetupMenu({
      isTTY: true,
      promptChoice: scriptedChoice(['Customize models', 'OpenCode', 'Workers', 'Exit'], []),
      promptChecklist: async (items) => {
        // First pass confirms both targets, second pass narrows to one.
        const picked = checklistSelections.length === 0 ? items : [items[1]];
        checklistSelections.push(picked);
        return { status: 'confirmed', items: picked };
      },
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(checklistSelections.length, 2,
      'stepping back from the settings screen should reopen the checklist');
    assert.deepEqual(ops.select, [AGENTS.map(name => `worker:${name}`).join(', '), `worker:${AGENTS[1]}`],
      'the second settings screen should describe the corrected subset');
    assert.deepEqual(ops.create.map(entry => entry.target.name), [AGENTS[1]],
      'only the corrected subset should be persisted, exactly once');
  } finally {
    restore();
  }
});

test('back at the main menu redraws it rather than exiting the flow', { timeout: INTERACTION_TIMEOUT }, async () => {
  const ops = { select: [], create: [], enumerate: 0 };
  const restore = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(AGENTS, ops));
  const questions = [];
  try {
    const result = await runPostSetupMenu({
      isTTY: true,
      promptChoice: scriptedChoice([BACK, BACK, 'Customize models', 'OpenCode', 'Workers', 'Exit'], questions),
      promptChecklist: async (items) => ({ status: 'confirmed', items }),
    });
    assert.equal(result.status, 'skipped',
      'the first screen has no predecessor, so back must not abandon the flow');
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(questions.slice(0, 3), [
      'Post-setup customization:',
      'Post-setup customization:',
      'Post-setup customization:',
    ], 'back on the first screen should simply redisplay it');
  } finally {
    restore();
  }
});

// --- back navigation through the opencode provider -> model -> variant chain

function makeCatalogRunner(catalog, verbose) {
  const calls = [];
  const runner = (executable, args) => {
    calls.push({ executable, args });
    return args.includes('--verbose')
      ? { stdout: verbose, stderr: '', status: 0 }
      : { stdout: catalog, stderr: '', status: 0 };
  };
  runner.calls = calls;
  return runner;
}

const CATALOG = 'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\nopenai/gpt-5.4\n';
const VERBOSE = 'opencode-go/deepseek-v4-flash\n{\n  "variants": { "low": {}, "high": {} }\n}\n';

test('back at the model screen re-opens the provider screen without re-querying the catalog', { timeout: INTERACTION_TIMEOUT }, async () => {
  const questions = [];
  const answers = ['opencode-go', BACK, 'openai', BACK, 'opencode-go', 'deepseek-v4-flash', 'high'];
  const runner = makeCatalogRunner(CATALOG, VERBOSE);
  const adapter = createOpencodeAdapter({
    promptChoice: async (question) => {
      questions.push(question.split(' for ')[0]);
      return answers.shift();
    },
    runCommand: runner,
  });

  const settings = await adapter.selectSettings('two agents');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'high' });
  assert.deepEqual(questions, ['Provider', 'Model', 'Provider', 'Model', 'Provider', 'Model', 'Variant'],
    'each back should reopen the preceding screen of the dependent chain');
  assert.equal(runner.calls.filter(call => !call.args.includes('--verbose')).length, 1,
    'the model catalog should be queried once and reused across back steps');
});

test('back at the variant screen re-opens the model screen', { timeout: INTERACTION_TIMEOUT }, async () => {
  const questions = [];
  const answers = ['opencode-go', 'deepseek-v4-flash', BACK, 'deepseek-v4-flash', 'low'];
  const adapter = createOpencodeAdapter({
    promptChoice: async (question) => {
      questions.push(question.split(' for ')[0]);
      return answers.shift();
    },
    runCommand: makeCatalogRunner(CATALOG, VERBOSE),
  });

  const settings = await adapter.selectSettings('two agents');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'low' });
  assert.deepEqual(questions, ['Provider', 'Model', 'Variant', 'Model', 'Variant'],
    'stepping back from the variant screen should return to the model screen');
});

test('back at the provider screen hands control back to the caller as BACK', { timeout: INTERACTION_TIMEOUT }, async () => {
  const adapter = createOpencodeAdapter({
    promptChoice: async () => BACK,
    runCommand: makeCatalogRunner(CATALOG, VERBOSE),
  });

  assert.equal(await adapter.selectSettings('two agents'), BACK,
    'the first screen of the chain should propagate back to the menu, not resolve settings');
});

test('back at the Claude combined settings screen propagates BACK to the caller', { timeout: INTERACTION_TIMEOUT }, async () => {
  const adapter = modelCustomization.createClaudeAdapter({
    promptChoice: async () => BACK,
  });

  assert.equal(await adapter.selectSettings('two agents'), BACK,
    'the Claude settings screen should propagate back rather than resolving a model');
});
