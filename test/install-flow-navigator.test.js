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

const { promptChecklist, promptSelect, runNavigator, INPUT_CLOSED, BACK } = require('../bin/install-flow.js');

const INSTALLER_ITEMS = ['Claude Code', 'Opencode'];
const TTY_MESSAGE = 'Error: interactive mode requires a TTY. Run directly in a terminal.';
const FOOTER_SENTINEL = 'use arrow keys to move, space to toggle, enter to confirm';
const SELECT_LEGEND = 'Up/Down move · Space/Enter confirm · ←/Esc back · q/Ctrl-C cancel';
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

async function runChecklist({ items, defaultSelected, input, footer, navigatorOptions, presses }) {
  const promise = promptChecklist(items, defaultSelected, input, footer, navigatorOptions);
  schedulePresses(input, presses || []);
  return await promise;
}

async function runSelect({ question, options, input, footer, presses }) {
  const promise = footer === undefined
    ? promptSelect(question, options, input)
    : promptSelect(question, options, input, footer);
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

for (const event of ['end', 'close', 'error']) {
  test(`terminal input ${event} settles a pending navigator and removes its listeners`, { timeout: INTERACTION_TIMEOUT }, async () => {
    const input = createFakeInput(true);
    const promise = promptChecklist(INSTALLER_ITEMS, [], input);
    input.emit(event, event === 'error' ? new Error('input failed') : undefined);
    assert.deepEqual(await promise, { status: 'input-closed' });
    for (const name of ['keypress', 'end', 'close', 'error']) {
      assert.equal(input.listenerCount(name), 0, `${name} listener must be removed`);
    }
    // A second terminal event after settlement cannot change the result.
    input.emit('close');
  });
}

test('selector distinguishes closed input from q cancellation and back navigation', { timeout: INTERACTION_TIMEOUT }, async () => {
  const closedInput = createFakeInput(true);
  const closed = promptSelect('Pick:', INSTALLER_ITEMS, closedInput, undefined, true);
  closedInput.emit('end');
  assert.equal(await closed, INPUT_CLOSED);

  const cancelInput = createFakeInput(true);
  assert.equal(await runSelect({ question: 'Pick:', options: INSTALLER_ITEMS, input: cancelInput,
    presses: [['q', keyInfo('q', 'q')]] }), null);
  const backInput = createFakeInput(true);
  assert.equal(await runSelect({ question: 'Pick:', options: INSTALLER_ITEMS, input: backInput,
    presses: [['', keyInfo('left', '\x1b[D')]] }), BACK);
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

test('preventEmptyConfirm keeps a multi-select navigator open after Enter with no marked items', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const promise = runNavigator({
    mode: 'multi',
    question: 'Pick:',
    options: INSTALLER_ITEMS,
    defaultSelected: [],
    input,
    preventEmptyConfirm: true,
  });
  schedulePresses(input, [
    ['\r', keyInfo('return', '\r')],
    ['q', keyInfo('q', 'q')],
  ]);

  assert.deepEqual(await promise, { status: 'cancelled' },
    'Enter must not confirm an empty selection when the guard is enabled');
});

for (const [label, extra] of [
  ['omitted', {}],
  ['false', { preventEmptyConfirm: false }],
]) {
  test(`multi-select empty confirmation remains unchanged when preventEmptyConfirm is ${label}`, { timeout: INTERACTION_TIMEOUT }, async () => {
    const input = createFakeInput(true);
    const promise = runNavigator({
      mode: 'multi',
      question: 'Pick:',
      options: INSTALLER_ITEMS,
      defaultSelected: [],
      input,
      ...extra,
    });
    schedulePresses(input, [['\r', keyInfo('return', '\r')]]);

    assert.deepEqual(await promise, { status: 'confirmed', items: [] });
  });
}

test('Ctrl+A sets every selectable checkbox from the first checkbox in a mixed selection', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const items = ['first', '', 'second', 'third'];
  const outcome = await runChecklist({
    items,
    defaultSelected: ['second'],
    input,
    navigatorOptions: { toggleAll: true },
    presses: [
      ['\x01', keyInfo('a', '\x01', { ctrl: true })],
      ['\r', keyInfo('return', '\r')],
    ],
  });

  assert.deepEqual(outcome, { status: 'confirmed', items: ['first', 'second', 'third'] },
    'an unchecked first selectable row makes Ctrl+A check every selectable row and skip separators');
});

test('two Ctrl+A presses restore an all-checked default selection', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const items = ['first', '', 'second', 'third'];
  const selectableItems = ['first', 'second', 'third'];
  const outcome = await runChecklist({
    items,
    defaultSelected: selectableItems,
    input,
    navigatorOptions: { toggleAll: true },
    presses: [
      ['\x01', keyInfo('a', '\x01', { ctrl: true })],
      ['\x01', keyInfo('a', '\x01', { ctrl: true })],
      ['\r', keyInfo('return', '\r')],
    ],
  });

  assert.deepEqual(outcome, { status: 'confirmed', items: selectableItems });
});

test('Ctrl+A clears a mixed selection from a checked first row and empty confirmation stays guarded', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const outcome = await runChecklist({
    items: ['first', '', 'second', 'third'],
    defaultSelected: ['first', 'third'],
    input,
    navigatorOptions: { toggleAll: true, preventEmptyConfirm: true },
    presses: [
      ['\x01', keyInfo('a', '\x01', { ctrl: true })],
      ['\r', keyInfo('return', '\r')],
      [' ', keyInfo('space', ' ')],
      ['\r', keyInfo('return', '\r')],
    ],
  });

  assert.deepEqual(outcome, { status: 'confirmed', items: ['first'] },
    'Ctrl+A clears all rows, Enter remains blocked, and Space toggles the unchanged cursor row');
});

test('Ctrl+A stays inactive in ordinary checklists and single-choice menus', { timeout: INTERACTION_TIMEOUT }, async () => {
  const checklistInput = createFakeInput(true);
  const checklistOutcome = await runChecklist({
    items: INSTALLER_ITEMS,
    defaultSelected: ['Claude Code'],
    input: checklistInput,
    presses: [
      ['\x01', keyInfo('a', '\x01', { ctrl: true })],
      ['\r', keyInfo('return', '\r')],
    ],
  });
  assert.deepEqual(checklistOutcome, { status: 'confirmed', items: ['Claude Code'] });

  const selectInput = createFakeInput(true);
  const selectOutcome = await runSelect({
    question: 'Choose one:',
    options: INSTALLER_ITEMS,
    input: selectInput,
    presses: [
      ['\x01', keyInfo('a', '\x01', { ctrl: true })],
      ['\r', keyInfo('return', '\r')],
    ],
  });
  assert.equal(selectOutcome, 'Claude Code');
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

// --- header block ----------------------------------------------------------

test('navigator header renders between the question and the options without affecting cursor or selection', { timeout: INTERACTION_TIMEOUT }, async () => {
  const capture = captureStdout();
  try {
    const input = createFakeInput(true);
    const promise = runNavigator({
      mode: 'multi',
      question: 'Pick:',
      options: INSTALLER_ITEMS,
      defaultSelected: ['Claude Code'],
      input,
      footer: FOOTER_SENTINEL,
      header: ['TYPE  TARGET', '────  ──────'],
    });
    schedulePresses(input, [
      ['', keyInfo('down', '\x1b[B')],
      ['\r', keyInfo('return', '\r')],
    ]);
    const outcome = await promise;
    assert.deepEqual(outcome, { status: 'confirmed', items: ['Claude Code'] },
      'cursor movement and selection behave identically with a header present');

    const finalFrame = capture.output().split(/\x1B\[\d+A/).pop();
    const questionIndex = finalFrame.indexOf('Pick:');
    const headerIndex = finalFrame.indexOf('TYPE  TARGET');
    const firstOptionIndex = finalFrame.indexOf('[x] Claude Code');
    const secondOptionIndex = finalFrame.indexOf('[ ] Opencode');
    assert.ok(headerIndex !== -1, 'the header renders inside the frame');
    assert.ok(
      questionIndex !== -1
        && headerIndex > questionIndex
        && headerIndex < firstOptionIndex
        && firstOptionIndex < secondOptionIndex,
      'header lines sit above the option rows'
    );
    assert.ok(finalFrame.includes('> [ ] Opencode'),
      'the cursor arrow lands on the second option, skipping the non-selectable header rows');

    // Redraw bookkeeping: frame one holds question(1) + header(2) + options(2)
    // + footer(1) = 6 physical rows, so the second paint moves up exactly 6.
    assert.ok(capture.output().includes('\x1B[6A'),
      'header rows are included in the cursor-up redraw accounting');
  } finally {
    capture.restore();
  }
});

test('promptChecklist forwards a navigatorOptions header into the rendered frame', { timeout: INTERACTION_TIMEOUT }, async () => {
  const capture = captureStdout();
  try {
    const input = createFakeInput(true);
    const promise = promptChecklist(INSTALLER_ITEMS, ['Claude Code'], input, FOOTER_SENTINEL, {
      header: ['TYPE  TARGET'],
    });
    schedulePresses(input, [['q', keyInfo('q', 'q')]]);
    const outcome = await promise;
    assert.deepEqual(outcome, { status: 'cancelled' });
    assert.ok(capture.output().includes('TYPE  TARGET'),
      'promptChecklist passes the header through to the navigator frame');
  } finally {
    capture.restore();
  }
});

test('a non-TTY input with a header resolves non-interactive before painting anything', { timeout: INTERACTION_TIMEOUT }, async () => {
  const capture = captureStdout();
  try {
    const input = createFakeInput(false);
    const outcome = await runNavigator({
      mode: 'multi',
      options: INSTALLER_ITEMS,
      defaultSelected: [],
      input,
      header: ['TYPE  TARGET'],
    });
    assert.deepEqual(outcome, { status: 'non-interactive' });
    assert.equal(capture.output(), '', 'no frame (header included) may be painted for a non-TTY input');
  } finally {
    capture.restore();
  }
});

// --- height-bounded rendering ----------------------------------------------

function createSizedOutput(columns, rows) {
  const output = new EventEmitter();
  output.columns = columns;
  output.rows = rows;
  output.frames = [];
  output.write = chunk => {
    if (chunk.includes('\x1B[0J')) output.frames.push(chunk);
    return true;
  };
  output.resize = (nextColumns, nextRows) => {
    output.columns = nextColumns;
    output.rows = nextRows;
    output.emit('resize');
  };
  return output;
}

function frameText(frame) {
  return frame.slice(frame.indexOf('\x1B[0J') + 4).replace(/\x1B\[[0-9;]*[A-Za-z]/g, '').replace(/[\r\n]+$/, '');
}

function physicalRows(text, width) {
  return text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / width)), 0);
}

test('a fitting menu retains the complete frame and its physical-row redraw count', async () => {
  const input = createFakeInput(true);
  const output = createSizedOutput(80, 8);
  const promise = runNavigator({ mode: 'single', question: 'Pick:', header: ['Header'],
    options: ['one', 'two'], defaultSelected: [], footer: 'Help', input, output });
  assert.equal(output.frames[0], '\x1B[0JPick:\nHeader\n>    one\n     two\nHelp\n');
  input.emit('keypress', '', keyInfo('down', '\x1b[B'));
  assert.ok(output.frames[1].startsWith('\x1B[5A\x1B[0J'));
  input.emit('keypress', '\r', keyInfo('return', '\r'));
  assert.deepEqual(await promise, { status: 'confirmed', items: ['two'] });
});

test('oversized menus scroll both ways, skip separators, and retain offscreen checks', async () => {
  const input = createFakeInput(true);
  const output = createSizedOutput(40, 6);
  const options = ['one', '', 'two', 'three', 'four', 'five', 'six'];
  const promise = runNavigator({ mode: 'multi', question: 'Pick:', header: ['Header'],
    options, defaultSelected: ['one'], footer: 'Help', input, output, toggleAll: true });
  for (let i = 0; i < 5; i += 1) input.emit('keypress', '', keyInfo('down', '\x1b[B'));
  assert.match(frameText(output.frames.at(-1)), /> \[ \] six/);
  assert.doesNotMatch(frameText(output.frames.at(-1)), /\bone\b/);
  input.emit('keypress', ' ', keyInfo('space', ' '));
  for (let i = 0; i < 5; i += 1) input.emit('keypress', '', keyInfo('up', '\x1b[A'));
  assert.match(frameText(output.frames.at(-1)), /> \[x\] one/);
  for (const frame of output.frames) {
    assert.ok(physicalRows(frameText(frame), output.columns) <= output.rows - 1);
    const up = /\x1B\[(\d+)A/.exec(frame);
    if (up) assert.ok(Number(up[1]) <= output.rows - 1);
  }
  input.emit('keypress', '\r', keyInfo('return', '\r'));
  assert.deepEqual(await promise, { status: 'confirmed', items: ['one', 'six'] });
  assert.equal(output.listenerCount('resize'), 0);
});

test('wrapped title, headers, instructions and option rows share the height budget', async () => {
  const input = createFakeInput(true);
  const output = createSizedOutput(12, 9);
  const promise = runNavigator({ mode: 'single', question: 'A wrapped title',
    header: ['A wrapped header'], footer: 'Wrapped instructions',
    options: ['long option text', 'second', 'third', 'fourth'], defaultSelected: [], input, output });
  assert.match(frameText(output.frames[0]), /A wrapped header/);
  assert.doesNotMatch(frameText(output.frames[0]), /second/);
  input.emit('keypress', '', keyInfo('down', '\x1b[B'));
  assert.match(frameText(output.frames.at(-1)), />    second/);
  for (const frame of output.frames) assert.ok(physicalRows(frameText(frame), 12) <= 8);
  input.emit('keypress', ' ', keyInfo('space', ' '));
  assert.deepEqual(await promise, { status: 'confirmed', items: ['second'] });
});

test('bounded redraws overwrite the visible screen instead of accumulating frames in scrollback', async () => {
  const input = createFakeInput(true);
  const output = createSizedOutput(16, 5);
  let screen = Array.from({ length: output.rows }, () => '');
  let row = output.rows - 1;
  let column = 0;
  let scrolled = 0;
  const capture = output.write;
  const advance = () => {
    row += 1;
    if (row === output.rows) {
      screen.shift();
      screen.push('');
      row -= 1;
      scrolled += 1;
    }
  };
  // Model delayed terminal wrapping and the cursor/erase operations used by
  // the renderer. Starting on the bottom row also exercises the first paint.
  output.write = chunk => {
    capture(chunk);
    for (const token of chunk.match(/\x1B\[[0-9;?]*[A-Za-z]|[\s\S]/g) || []) {
      if (token.startsWith('\x1B[')) {
        const up = /^\x1B\[(\d+)A$/.exec(token);
        if (up) row = Math.max(0, row - Number(up[1]));
        else if (token === '\x1B[H') { row = 0; column = 0; }
        else if (token === '\x1B[2J') screen = screen.map(() => '');
        else if (token === '\x1B[0J') {
          screen[row] = screen[row].slice(0, column);
          for (let i = row + 1; i < screen.length; i += 1) screen[i] = '';
        }
      } else if (token === '\r') column = 0;
      else if (token === '\n') { advance(); column = 0; }
      else {
        if (column === output.columns) { advance(); column = 0; }
        screen[row] = screen[row].padEnd(column, ' ').slice(0, column) + token;
        column += 1;
      }
    }
    return true;
  };
  const options = Array.from({ length: 20 }, (_, i) => `option-${i}`);
  const promise = runNavigator({ mode: 'single', options, question: 'Pick:',
    defaultSelected: [], input, output });
  const initialScroll = scrolled;
  for (let i = 1; i < options.length; i += 1) {
    input.emit('keypress', '', keyInfo('down', '\x1b[B'));
    assert.equal(scrolled, initialScroll, 'later redraws must not add scrollback');
    assert.equal(screen.filter(line => line.startsWith('>')).length, 1);
    assert.ok(screen.includes(`>    option-${i}`));
  }
  // A real resize changes the grid before emitting its event.
  screen = Array.from({ length: 3 }, () => '');
  row = 0;
  column = 0;
  output.resize(10, 3);
  const resizeScroll = scrolled;
  for (let i = options.length - 2; i >= 0; i -= 1) {
    input.emit('keypress', '', keyInfo('up', '\x1b[A'));
    assert.equal(scrolled, resizeScroll);
    assert.ok(screen[0].startsWith('>    optio'));
  }
  input.emit('keypress', '\r', keyInfo('return', '\r'));
  assert.deepEqual(await promise, { status: 'confirmed', items: ['option-0'] });
});

test('resize reduces auxiliary content in order and restores it without changing selection', async () => {
  const input = createFakeInput(true);
  const output = createSizedOutput(40, 10);
  const promise = runNavigator({ mode: 'multi', question: 'Title', header: ['Header 1', 'Header 2'],
    footer: 'Help', options: ['one', 'two', 'three'], defaultSelected: ['one'], input, output });
  input.emit('keypress', '', keyInfo('down', '\x1b[B'));
  input.emit('keypress', ' ', keyInfo('space', ' '));
  for (const [rows, expected, absent] of [
    [5, ['Title', 'Header 1', 'Help'], ['Header 2']],
    [3, ['Title'], ['Header 1', 'Help']],
    [2, [], ['Title', 'Help', 'Header 1']],
    [1, [], ['Title', 'Help', 'Header 1']],
    [10, ['Title', 'Header 1', 'Header 2', 'Help'], []],
  ]) {
    output.resize(40, rows);
    const frame = output.frames.at(-1);
    assert.ok(frame.startsWith('\x1B[2J\x1B[H'), 'resize establishes a new screen origin');
    assert.doesNotMatch(frame, /\x1B\[\d+A/, 'resize never seeks vanished old rows');
    const text = frameText(frame);
    assert.match(text, /> \[x\] two/);
    for (const line of expected) assert.ok(text.includes(line));
    for (const line of absent) assert.ok(!text.includes(line));
    assert.ok(physicalRows(text, 40) <= Math.max(1, rows - 1));
  }
  input.emit('keypress', '\r', keyInfo('return', '\r'));
  assert.deepEqual(await promise, { status: 'confirmed', items: ['one', 'two'] });
  assert.equal(output.listenerCount('resize'), 0);
});

test('a selected option taller than the window is clipped, including embedded newlines and ANSI', async () => {
  const input = createFakeInput(true);
  const output = createSizedOutput(10, 3);
  const promise = runNavigator({ mode: 'single', question: 'Title', footer: 'Help',
    options: ['\x1B[32mvery long option with more text\x1B[0m\nextra line', 'two'],
    defaultSelected: [], input, output });
  const text = frameText(output.frames[0]);
  assert.ok(text.startsWith('>    very long'));
  assert.ok(physicalRows(text, 10) <= 2);
  assert.doesNotMatch(text, /Title|Help|extra/);
  output.resize(8, 1);
  assert.ok(physicalRows(frameText(output.frames.at(-1)), 8) <= 1);
  input.emit('keypress', '', keyInfo('down', '\x1b[B'));
  assert.equal(frameText(output.frames.at(-1)), '>    two');
  input.emit('keypress', '\r', keyInfo('return', '\r'));
  assert.deepEqual(await promise, { status: 'confirmed', items: ['two'] });
});

test('Ctrl+A still toggles options outside the visible area', async () => {
  const input = createFakeInput(true);
  const output = createSizedOutput(40, 2);
  const promise = runNavigator({ mode: 'multi', options: ['one', '', 'two', 'three'],
    defaultSelected: ['two'], input, output, toggleAll: true, preventEmptyConfirm: true });
  input.emit('keypress', '\x01', keyInfo('a', '\x01', { ctrl: true }));
  input.emit('keypress', '\r', keyInfo('return', '\r'));
  assert.deepEqual(await promise, { status: 'confirmed', items: ['one', 'two', 'three'] });
});

for (const exit of ['q', 'ctrl-c', 'escape', 'end', 'close', 'error']) {
  test(`height-bounded navigator removes resize handling on ${exit}`, async () => {
    const input = createFakeInput(true);
    const output = createSizedOutput(20, 2);
    const promise = runNavigator({ mode: 'single', options: ['one', 'two', 'three'],
      defaultSelected: [], input, output });
    assert.equal(output.listenerCount('resize'), 1);
    if (['end', 'close', 'error'].includes(exit)) input.emit(exit);
    else if (exit === 'ctrl-c') input.emit('keypress', '\x03', keyInfo('c', '\x03', { ctrl: true }));
    else input.emit('keypress', exit === 'q' ? 'q' : '', keyInfo(exit, ''));
    const outcome = await promise;
    assert.equal(outcome.status, ['end', 'close', 'error'].includes(exit) ? 'input-closed'
      : exit === 'escape' ? 'back' : 'cancelled');
    assert.equal(output.listenerCount('resize'), 0);
    const count = output.frames.length;
    output.resize(30, 10);
    assert.equal(output.frames.length, count);
  });
}

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

// --- promptSelect single-select on the shared engine -----------------------

// Step 2 of the navigable-model-customizer change: add the exported
// promptSelect(question, options, input?) single-select on the shared engine.
// Anchors (navigator test scenarios):
//   - "Arrow keys move the cursor and Enter confirms"
//   - "Space confirms the highlighted option"
//   - "promptSelect resolves a selected option string"
//   - "Engine reports cancellation without terminating the process"

test('promptSelect: down then return resolves the option highlighted at confirmation time', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const result = await runSelect({
    question: 'Select a model:',
    options: INSTALLER_ITEMS,
    input,
    presses: [
      ['', keyInfo('down', '\x1b[B')],
      ['\r', keyInfo('return', '\r')],
    ],
  });
  // `down` moves the `>` cursor onto the second option; Enter confirms it.
  assert.equal(result, 'Opencode');
});

test('promptSelect: space with one option highlighted resolves that option value', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const result = await runSelect({
    question: 'Select a model:',
    options: INSTALLER_ITEMS,
    input,
    presses: [[' ', keyInfo('space', ' ')]],
  });
  // Space confirms the initially highlighted (first) option.
  assert.equal(result, 'Claude Code');
});

test('promptSelect: resolves the option string, never its index', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(true);
  const result = await runSelect({
    question: 'Select a model:',
    options: INSTALLER_ITEMS,
    input,
    presses: [
      ['', keyInfo('down', '\x1b[B')],
      ['\r', keyInfo('return', '\r')],
    ],
  });
  assert.equal(typeof result, 'string', 'resolution must be the option string, not an index');
  assert.equal(result, 'Opencode');
  assert.notEqual(result, 1);
});

test('promptSelect: q keypress resolves null without terminating the process', { timeout: INTERACTION_TIMEOUT }, async () => {
  const spy = installExitSpy();
  try {
    const input = createFakeInput(true);
    const result = await runSelect({
      question: 'Select a model:',
      options: INSTALLER_ITEMS,
      input,
      presses: [['q', keyInfo('q', 'q')]],
    });
    assert.equal(result, null);
    assert.equal(spy.calls.length, 0, 'cancellation must not call process.exit');
  } finally {
    spy.restore();
  }
});

test('promptSelect: Ctrl-C keypress resolves null without terminating the process', { timeout: INTERACTION_TIMEOUT }, async () => {
  const spy = installExitSpy();
  try {
    const input = createFakeInput(true);
    const result = await runSelect({
      question: 'Select a model:',
      options: INSTALLER_ITEMS,
      input,
      presses: [['\x03', keyInfo('c', '\x03', { ctrl: true })]],
    });
    assert.equal(result, null);
    assert.equal(spy.calls.length, 0, 'cancellation must not call process.exit');
  } finally {
    spy.restore();
  }
});

test('promptSelect: non-TTY input resolves null', { timeout: INTERACTION_TIMEOUT }, async () => {
  const input = createFakeInput(false);
  const result = await runSelect({
    question: 'Select a model:',
    options: INSTALLER_ITEMS,
    input,
  });
  assert.equal(result, null);
});

test('promptSelect without a footer forwards the default single-select legend', { timeout: INTERACTION_TIMEOUT }, async () => {
  const capture = captureStdout();
  try {
    const input = createFakeInput(true);
    await runSelect({
      question: 'Select a model:',
      options: INSTALLER_ITEMS,
      input,
      presses: [['q', keyInfo('q', 'q')]],
    });
    assert.ok(capture.output().includes(SELECT_LEGEND),
      'promptSelect should pass the default legend through to the shared navigator');
  } finally {
    capture.restore();
  }
});

test('promptSelect with an explicit null footer forwards no footer', { timeout: INTERACTION_TIMEOUT }, async () => {
  const capture = captureStdout();
  try {
    const input = createFakeInput(true);
    await runSelect({
      question: 'Select a model:',
      options: INSTALLER_ITEMS,
      input,
      footer: null,
      presses: [['q', keyInfo('q', 'q')]],
    });
    assert.equal(capture.output().includes(SELECT_LEGEND), false,
      'an explicit null footer should suppress the default legend');
  } finally {
    capture.restore();
  }
});

test('installer main() omits the empty-confirm guard from its promptChecklist call', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'bin', 'install-flow.js'), 'utf8');
  const mainSection = functionSection(source, /function\s+main\s*\(/);
  const calls = [...mainSection.matchAll(/promptChecklist\s*\(/g)];

  assert.equal(calls.length, 1, 'installer main() should have one promptChecklist call');
  const callWindow = mainSection.slice(calls[0].index, calls[0].index + 600);
  assert.doesNotMatch(callWindow, /preventEmptyConfirm\s*:/,
    'the installer call must preserve empty-confirm behavior by omitting the guard');
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

test('group headers render their visible text, are never under the cursor, and never confirm', async () => {
  const options = ['-- Explore --', 'chat', 'overview', '-- Backlog --', 'provider', 'Done'];
  const displayOptions = ['-- Explore --', 'Chat: ask', 'Overview: ask', '-- Backlog --', 'Provider: ask', 'Done'];
  const run = async presses => {
    const input = createFakeInput(true);
    const writes = [];
    const promise = runNavigator({
      mode: 'single', question: 'Q:', options, defaultSelected: [], input, output: { write: text => writes.push(text) },
      displayOptions, groupHeaders: ['-- Explore --', '-- Backlog --'],
    });
    schedulePresses(input, presses);
    const outcome = await promise;
    const cursorRows = writes.join('').split('\n').filter(line => /^\s*>/.test(line.replace(/\x1B\[[0-9;?]*[A-Za-z]/g, '')));
    return { outcome, cursorRows: cursorRows.map(line => line.replace(/\x1B\[[0-9;?]*[A-Za-z]/g, '')) };
  };
  const enter = ['\r', keyInfo('return', '\r')];
  const down = ['', keyInfo('down', '\x1B[B')];
  const up = ['', keyInfo('up', '\x1B[A')];

  const first = await run([enter]);
  assert.deepEqual(first.outcome, { status: 'confirmed', items: ['chat'] });

  const crossing = await run([down, down, enter]);
  assert.deepEqual(crossing.outcome, { status: 'confirmed', items: ['provider'] });

  const backUp = await run([down, down, up, enter]);
  assert.deepEqual(backUp.outcome, { status: 'confirmed', items: ['overview'] });

  const topStop = await run([up, up, enter]);
  assert.deepEqual(topStop.outcome, { status: 'confirmed', items: ['chat'] });

  const walk = await run([down, down, down, up, up, up, enter]);
  assert.equal(walk.cursorRows.some(row => /-- (Explore|Backlog) --/.test(row)), false, 'the cursor never lands on a header');
  assert.ok(walk.cursorRows.some(row => row.includes('Provider: ask')));

  const input = createFakeInput(true);
  const writes = [];
  const promise = runNavigator({
    mode: 'single', question: 'Q:', options, defaultSelected: [], input, output: { write: text => writes.push(text) },
    displayOptions, groupHeaders: ['-- Explore --', '-- Backlog --'],
  });
  schedulePresses(input, [enter]);
  await promise;
  const frame = writes.join('').replace(/\x1B\[[0-9;?]*[A-Za-z]/g, '');
  assert.match(frame, /^ {2}-- Explore --$/m);
  assert.match(frame, /^ {2}-- Backlog --$/m);
  assert.match(frame, /^> {4}Chat: ask$/m);
});

test('promptSelect without group headers behaves as before', async () => {
  const input = createFakeInput(true);
  const promise = promptSelect('Q:', ['a', 'b'], input);
  schedulePresses(input, [['', keyInfo('down', '\x1B[B')], ['\r', keyInfo('return', '\r')]]);
  assert.equal(await promise, 'b');
});
