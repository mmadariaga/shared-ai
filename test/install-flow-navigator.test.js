'use strict';

// Step 1 of the navigable-model-customizer change: extract the shared
// raw-readline navigator engine in bin/install-flow.js and move installer
// exit policy to main().
//
// This suite drives promptChecklist exclusively through the injected `input`
// seam (a fake EventEmitter carrying isTTY plus setRawMode()/resume()/pause()
// stubs) and asserts the discriminated outcome contract:
//   { status: 'confirmed', items } | { status: 'cancelled' } | { status: 'non-interactive' }
//
// Anchors (navigator test scenarios):
//   - shared-readline-navigator "Checklist behavior is preserved on the shared engine"
//   - "Engine reports cancellation without terminating the process"
//   - npx-installer deselect-all -> caller-owned exit 0
//   - installer parity (footer optional, omitted by the installer call site)
//   - npx-installer TTY guard (source-pinned in main())

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const { promptChecklist } = require('../bin/install-flow.js');

const INSTALLER_ITEMS = ['Claude Code', 'Opencode'];
const TTY_MESSAGE = 'Error: interactive mode requires a TTY. Run directly in a terminal.';
const FOOTER_SENTINEL = 'use arrow keys to move, space to toggle, enter to confirm';
const INTERACTION_TIMEOUT = 5000;

// --- seams ---------------------------------------------------------------

function createFakeInput(tty) {
  const input = new EventEmitter();
  input.isTTY = tty;
  input.setRawMode = () => {};
  input.resume = () => {};
  input.pause = () => {};
  return input;
}

function keyInfo(name, sequence, extra) {
  return { name, sequence, ctrl: false, shift: false, ...extra };
}

// Emit each keypress one macrotask apart, starting after any synchronous or
// microtask listener attachment, so the sequence is delivered in order.
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

async function runChecklist({ items, defaultSelected, input, footer, presses }) {
  const promise = promptChecklist(items, defaultSelected, input, footer);
  schedulePresses(input, presses || []);
  return await promise;
}

function installExitSpy() {
  const calls = [];
  const original = process.exit;
  process.exit = (...args) => {
    calls.push(args);
  };
  return {
    calls,
    restore() {
      process.exit = original;
    },
  };
}

function captureStdout() {
  const chunks = [];
  const original = process.stdout.write;
  process.stdout.write = (chunk, ...rest) => {
    chunks.push(String(chunk));
    return true;
  };
  return {
    output() {
      return chunks.join('');
    },
    restore() {
      process.stdout.write = original;
    },
  };
}

// --- checklist behavior preserved on the shared engine -------------------

test('Checklist behavior is preserved on the shared engine: down then return confirms the highlighted item', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const outcome = await runChecklist({
    items: INSTALLER_ITEMS,
    defaultSelected: ['Opencode'],
    input,
    presses: [
      ['', keyInfo('down', '\x1b[B')],
      ['\r', keyInfo('return', '\r')],
    ],
  });
  // `down` moves the `>` cursor onto the second item; Enter confirms the
  // items marked [x], which after the move is the highlighted item.
  assert.deepEqual(outcome, { status: 'confirmed', items: ['Opencode'] });
});

test('Checklist behavior is preserved on the shared engine: space toggles a second item and return confirms both toggled items', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const outcome = await runChecklist({
    items: INSTALLER_ITEMS,
    defaultSelected: ['Claude Code'],
    input,
    presses: [
      ['', keyInfo('down', '\x1b[B')],
      [' ', keyInfo('space', ' ')],
      ['\r', keyInfo('return', '\r')],
    ],
  });
  assert.deepEqual(outcome, { status: 'confirmed', items: ['Claude Code', 'Opencode'] });
});

// --- cancellation without terminating the process -------------------------

test('Engine reports cancellation without terminating the process: q keypress resolves cancelled', { timeout: INTERACTION_TIMEOUT }, async () => {
  const spy = installExitSpy();
  try {
    const input = createFakeInput(true);
    const outcome = await runChecklist({
      items: INSTALLER_ITEMS,
      defaultSelected: ['Claude Code'],
      input,
      presses: [['q', keyInfo('q', 'q')]],
    });
    assert.deepEqual(outcome, { status: 'cancelled' });
    assert.equal(spy.calls.length, 0, 'cancellation must not call process.exit');
  } finally {
    spy.restore();
  }
});

test('Engine reports cancellation without terminating the process: Ctrl-C keypress resolves cancelled', { timeout: INTERACTION_TIMEOUT }, async () => {
  const spy = installExitSpy();
  try {
    const input = createFakeInput(true);
    const outcome = await runChecklist({
      items: INSTALLER_ITEMS,
      defaultSelected: ['Claude Code'],
      input,
      presses: [['\x03', keyInfo('c', '\x03', { ctrl: true })]],
    });
    assert.deepEqual(outcome, { status: 'cancelled' });
    assert.equal(spy.calls.length, 0, 'cancellation must not call process.exit');
  } finally {
    spy.restore();
  }
});

test('Engine reports cancellation without terminating the process: non-TTY input resolves non-interactive', { timeout: INTERACTION_TIMEOUT }, async () => {
  const spy = installExitSpy();
  try {
    const input = createFakeInput(false);
    const outcome = await runChecklist({
      items: INSTALLER_ITEMS,
      defaultSelected: ['Claude Code'],
      input,
    });
    assert.deepEqual(outcome, { status: 'non-interactive' });
    assert.equal(spy.calls.length, 0, 'non-interactive outcome must not call process.exit');
  } finally {
    spy.restore();
  }
});

// --- deselect-all -> caller-owned exit 0 ----------------------------------

test('Enter with every item deselected resolves confirmed with an empty item list (caller owns exit 0)', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const outcome = await runChecklist({
    items: INSTALLER_ITEMS,
    defaultSelected: ['Claude Code'],
    input,
    presses: [
      [' ', keyInfo('space', ' ')],
      ['\r', keyInfo('return', '\r')],
    ],
  });
  assert.deepEqual(outcome, { status: 'confirmed', items: [] });
});

// --- footer (installer parity) --------------------------------------------

test('Optional footer renders beneath the item list; omitting it draws nothing (installer parity)', { timeout: INTERACTION_TIMEOUT }, async () => {
  const capture = captureStdout();
  try {
    const withFooterInput = createFakeInput(true);
    const withFooter = await runChecklist({
      items: INSTALLER_ITEMS,
      defaultSelected: ['Opencode'],
      input: withFooterInput,
      footer: FOOTER_SENTINEL,
      presses: [
        ['', keyInfo('down', '\x1b[B')],
        ['\r', keyInfo('return', '\r')],
      ],
    });
    const withFooterOutput = capture.output();
    assert.deepEqual(withFooter, { status: 'confirmed', items: ['Opencode'] });
    assert.ok(
      withFooterOutput.includes(FOOTER_SENTINEL),
      'footer line should be rendered beneath the item list'
    );
    // The engine re-renders the full frame on every keypress, writing a
    // cursor-up escape (\x1B[<N>A) followed by the new frame, so the raw
    // captured output accumulates multiple frames. In a real terminal the
    // escape moves the cursor up and overwrites, so the final visible frame
    // is the text after the last cursor-up escape. Restrict the position
    // check to that final frame: within it the item lines are written before
    // the footer, so the footer must appear after the last 'Opencode'.
    const finalFrame = withFooterOutput.split(/\x1B\[\d+A/).pop();
    assert.ok(
      finalFrame.indexOf(FOOTER_SENTINEL) > finalFrame.lastIndexOf('Opencode'),
      'footer line should appear after the item list'
    );

    capture.restore();

    // Capture the no-footer run separately: the with-footer chunks captured
    // above must not leak into the "omitting it draws nothing" check.
    const noFooterCapture = captureStdout();
    try {
      const noFooterInput = createFakeInput(true);
      await runChecklist({
        items: INSTALLER_ITEMS,
        defaultSelected: ['Opencode'],
        input: noFooterInput,
        presses: [
          ['', keyInfo('down', '\x1b[B')],
          ['\r', keyInfo('return', '\r')],
        ],
      });
      assert.ok(
        !noFooterCapture.output().includes(FOOTER_SENTINEL),
        'omitted footer must not be rendered'
      );
    } finally {
      noFooterCapture.restore();
    }
  } finally {
    capture.restore();
  }
});

// --- main() TTY guard source pin -------------------------------------------

test('main() preserves the exact non-interactive message before process.exit(1) and the message no longer lives in promptChecklist (npx-installer TTY guard)', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'bin', 'install-flow.js'), 'utf8');

  const mainSection = functionSection(source, /function\s+main\s*\(/);
  const checklistSection = functionSection(source, /function\s+promptChecklist\s*\(/);

  assert.ok(mainSection.length > 0, 'main() declaration should exist');
  assert.ok(checklistSection.length > 0, 'promptChecklist declaration should exist');

  // The non-interactive branch of main() prints the exact message before exiting 1.
  const messageIndex = mainSection.indexOf(TTY_MESSAGE);
  const exitIndex = mainSection.indexOf('process.exit(1)');
  assert.ok(messageIndex !== -1, 'main() should contain the exact TTY message');
  assert.ok(exitIndex !== -1, 'main() should call process.exit(1) for the non-interactive outcome');
  assert.ok(messageIndex < exitIndex, 'TTY message should be printed before process.exit(1)');

  // The message and any process.exit call no longer live in promptChecklist.
  assert.ok(
    !checklistSection.includes(TTY_MESSAGE),
    'TTY message must not live in the promptChecklist section'
  );
  assert.ok(
    !checklistSection.includes('process.exit'),
    'promptChecklist must never call process.exit'
  );
});

// --- helpers ---------------------------------------------------------------

// Extract the brace-balanced section of a top-level function declaration
// starting at the first match of `declaration`.
function functionSection(source, declaration) {
  const match = declaration.exec(source);
  if (!match) return '';
  const open = source.indexOf('{', match.index);
  if (open === -1) return source.slice(match.index);

  let depth = 0;
  let inString = null; // '"' | "'" | '`' | null
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && source[i + 1] === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      if (ch === '\\' && !escaped) {
        escaped = true;
        continue;
      }
      if (ch === inString && !escaped) inString = null;
      escaped = false;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, i + 1);
    }
  }
  return source.slice(match.index);
}
