#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const CLAUDE_BASE = path.join(os.homedir(), '.claude');
const OPENCODE_BASE = path.join(os.homedir(), '.config', 'opencode');

if (process.argv.includes('--help')) {
  console.log(`shared-ai installer

Usage: npx github:mmadariaga/shared-ai [--help]

Interactive keys:
  ↑ / ↓     Move cursor
  Space      Toggle selection
  Enter      Confirm selection
  Ctrl-C / q Exit without installing`);
  process.exit(0);
}

function promptChecklist(items, defaultSelected) {
  if (!process.stdin.isTTY) {
    console.error('Error: interactive mode requires a TTY. Run directly in a terminal.');
    process.exit(1);
  }

  return new Promise((resolve) => {
    const selected = items.map(item => defaultSelected.includes(item));
    let cursor = 0;
    let rendered = false;

    function render() {
      if (rendered) {
        process.stdout.write(`\x1B[${items.length}A`);
      }
      items.forEach((item, i) => {
        const check = selected[i] ? '[x]' : '[ ]';
        const arrow = i === cursor ? '>' : ' ';
        process.stdout.write(`${arrow} ${check} ${item}\n`);
      });
      rendered = true;
    }

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('keypress', onKey);
    }

    function onKey(str, key) {
      if (!key) return;
      if (key.sequence === '\x03' || str === 'q') {
        cleanup();
        process.exit(0);
      }
      if (key.name === 'up') {
        cursor = Math.max(0, cursor - 1);
        render();
      } else if (key.name === 'down') {
        cursor = Math.min(items.length - 1, cursor + 1);
        render();
      } else if (str === ' ') {
        selected[cursor] = !selected[cursor];
        render();
      } else if (key.name === 'return') {
        cleanup();
        resolve(items.filter((_, i) => selected[i]));
      }
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', onKey);

    render();
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function forceCopy(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyWithWarn(src, dest) {
  console.log(`Overwriting ${dest}`);
  forceCopy(src, dest);
}

function copySkipIfExists(src, dest) {
  if (fs.existsSync(dest)) {
    console.log(`Skipping ${dest} (already exists)`);
    return;
  }
  forceCopy(src, dest);
}

function listMdFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(dir, f));
}

function installClaude(destBase) {
  const base = destBase || CLAUDE_BASE;

  listMdFiles(path.join(ROOT, 'commands', 'claude')).forEach(src => {
    forceCopy(src, path.join(base, 'commands', path.basename(src)));
  });

  listMdFiles(path.join(ROOT, 'sai', 'commands')).forEach(src => {
    forceCopy(src, path.join(base, 'sai', 'commands', path.basename(src)));
  });

  listMdFiles(path.join(ROOT, 'sai', 'instructions')).forEach(src => {
    copyWithWarn(src, path.join(base, 'sai', 'instructions', path.basename(src)));
  });

  copySkipIfExists(
    path.join(ROOT, 'skills', 'universal', 'caveman', 'SKILL.md'),
    path.join(base, 'skills', 'caveman', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(ROOT, 'skills', 'universal', 'token-efficient-languages', 'SKILL.md'),
    path.join(base, 'skills', 'token-efficient-languages', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(ROOT, 'skills', 'claude', 'budget-explorer', 'SKILL.md'),
    path.join(base, 'skills', 'budget-explorer', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(ROOT, 'skills', 'claude', 'budget-executor', 'SKILL.md'),
    path.join(base, 'skills', 'budget-executor', 'SKILL.md')
  );
  copySkipIfExists(
    path.join(ROOT, 'skills', 'claude', 'fetch', 'SKILL.md'),
    path.join(base, 'skills', 'fetch', 'SKILL.md')
  );
}
function installOpencode(destBase) {}
function copyOpencodeConfig(destBase) {}

module.exports = {
  ensureDir,
  forceCopy,
  copyWithWarn,
  copySkipIfExists,
  listMdFiles,
  installClaude,
  installOpencode,
  copyOpencodeConfig,
};
