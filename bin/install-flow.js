#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const REPOSITORY_ROOT = path.join(__dirname, '..');
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

function copy(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyWithWarn(src, dest) {
  if (fs.existsSync(dest)) {
    console.log(`Overwriting ${dest}`);
  } else {
    console.log(`Creating ${dest}`);
  }

  copy(src, dest);
}

function copySkipIfExists(src, dest) {
  if (fs.existsSync(dest)) {
    console.log(`Skipping ${dest} (already exists)`);
    return;
  }
  copy(src, dest);
}

function listMdFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(dir, f));
}

function installClaude(destBase) {
  const targetPath = destBase || CLAUDE_BASE;

  listMdFiles(path.join(REPOSITORY_ROOT, 'commands', 'claude')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'commands')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'instructions')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'instructions', path.basename(src)));
  });

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'budget', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget', 'SKILL.md')
  );

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'sai-commands', 'SKILL.md'),
    path.join(targetPath, 'skills', 'sai-commands', 'SKILL.md')
  );

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'token-efficient-languages', 'SKILL.md'),
    path.join(targetPath, 'skills', 'token-efficient-languages', 'SKILL.md')
  );
  
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'claude', 'budget-explorer', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-explorer', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'claude', 'budget-executor', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-executor', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'claude', 'budget-subagent', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-subagent', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'claude', 'fetch', 'SKILL.md'),
    path.join(targetPath, 'skills', 'fetch', 'SKILL.md')
  );

}

function installOpencode(destBase) {
  const targetPath = destBase || OPENCODE_BASE;

  listMdFiles(path.join(REPOSITORY_ROOT, 'commands', 'opencode')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'commands')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'commands', path.basename(src)));
  });

  listMdFiles(path.join(REPOSITORY_ROOT, 'sai', 'instructions')).forEach(src => {
    copyWithWarn(src, path.join(targetPath, 'sai', 'instructions', path.basename(src)));
  });

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'budget', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget', 'SKILL.md')
  );

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'sai-commands', 'SKILL.md'),
    path.join(targetPath, 'skills', 'sai-commands', 'SKILL.md')
  );

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'universal', 'token-efficient-languages', 'SKILL.md'),
    path.join(targetPath, 'skills', 'token-efficient-languages', 'SKILL.md')
  );

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-explorer', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-explorer', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-executor', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-executor', 'SKILL.md')
  );
  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-subagent', 'SKILL.md'),
    path.join(targetPath, 'skills', 'budget-subagent', 'SKILL.md')
  );

  copyWithWarn(
    path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'fetch', 'SKILL.md'),
    path.join(targetPath, 'skills', 'fetch', 'SKILL.md')
  );
}

function copyOpencodeConfig(destBase) {
  const base = destBase || OPENCODE_BASE;
  const hasJson = fs.existsSync(path.join(base, 'opencode.json'));
  const hasJsonc = fs.existsSync(path.join(base, 'opencode.jsonc'));

  if (!hasJson && !hasJsonc) {
    copy(path.join(REPOSITORY_ROOT, 'configs', 'opencode.jsonc'), path.join(base, 'opencode.jsonc'));
    return;
  }

  console.log('\nOpencode config already exists. Verify that you have these settings properly configured:\n');
  console.log('  "agent": {');
  console.log('    "explore": {');
  console.log('      "mode": "subagent",');
  console.log('      // Your trusted low-cost model below');
  console.log('      "model": "opencode-go/deepseek-v4-flash"');
  console.log('    },');
  console.log('    "executor": {');
  console.log('      "mode": "subagent",');
  console.log('      // Your trusted low-cost model below');
  console.log('      "model": "opencode-go/deepseek-v4-flash"');
  console.log('    },');
  console.log('    "cheap": {');
  console.log('      "mode": "subagent",');
  console.log('      // Your trusted low-cost model below');
  console.log('      "model": "opencode-go/deepseek-v4-flash"');
  console.log('    }');
  console.log('  }');
  console.log('\nAdjust the model to your preferred low-cost provider.');
}

async function main() {
  const choices = await promptChecklist(
    ['Claude Code', 'Opencode'],
    ['Opencode']
  );

  if (choices.length === 0) {
    console.log('Nothing selected. Exiting.');
    process.exit(0);
  }

  if (choices.includes('Claude Code')) {
    installClaude();
  }

  if (choices.includes('Opencode')) {
    installOpencode();
    copyOpencodeConfig();
  }

  console.log(
    "\nReminder: run 'npx github:mmadariaga/shared-ai setup' in each project to configure the SAI workflow."
  );
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  ensureDir,
  copy,
  copyWithWarn,
  copySkipIfExists,
  listMdFiles,
  installClaude,
  installOpencode,
  copyOpencodeConfig,
  main,
};
