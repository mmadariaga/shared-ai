#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');
const readline = require('readline');
const { offerCodegraphInstall, probeCodegraph } = require('./install-flow.js');

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function getPathArg() {
  return process.argv[2] === 'setup' ? process.argv[3] : process.argv[2];
}

function resolvePath() {
  const arg = getPathArg();
  if (arg) {
    return path.resolve(arg);
  }
  return process.cwd();
}

function checkOpenspecCli() {
  const cmd = process.platform === 'win32' ? 'where openspec' : 'which openspec';
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch {
    console.error('openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec');
    process.exit(1);
  }
}

async function ensureOpenspecDir(projectPath, rl) {
  const openspecDir = path.join(projectPath, 'openspec');
  if (fs.existsSync(openspecDir)) {
    return;
  }
  const answer = await prompt(rl, `openspec/ not found at ${projectPath}.\n\nRun 'openspec init'? (Y/n) `);
  if (answer.trim().toLowerCase() === 'n') {
    rl.close();
    console.log('Aborted.');
    process.exit(0);
  }
  const result = spawnSync('openspec', ['init'], { cwd: projectPath, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    console.error("error", result);
    process.exit(1);
  }

  console.log(`Initialized openspec/ at ${projectPath}.\n`);
}

function ensureCodegraphIndex(projectPath, { probe = probeCodegraph, runInit, indexExists } = {}) {
  if (typeof indexExists !== 'function') {
    indexExists = () => fs.existsSync(path.join(projectPath, '.codegraph'));
  }
  if (typeof runInit !== 'function') {
    runInit = () => {
      spawnSync('codegraph', ['init'], { cwd: projectPath, stdio: 'inherit', shell: true });
    };
  }

  if (indexExists()) {
    return;
  }

  if (!probe()) {
    return;
  }

  runInit();
}

async function ensureSchemaLine(projectPath, rl) {
  const configPath = path.join(projectPath, 'openspec', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    console.error("openspec/config.yaml not found.\n\nRun 'openspec init' first.");
    process.exit(1);
  }
  let content = fs.readFileSync(configPath, 'utf8');
  if (/^schema:\s*sai-workflow\s*$/m.test(content)) {
    return;
  }
  const answer = await prompt(rl, 'Set schema: sai-workflow in openspec/config.yaml? (Y/n) ');
  if (answer.trim().toLowerCase() === 'n') {
    rl.close();
    console.log('Aborted.');
    process.exit(0);
  }
  if (/^schema:.*$/m.test(content)) {
    content = content.replace(/^schema:.*$/m, 'schema: sai-workflow');
  } else {
    content = 'schema: sai-workflow\n' + content;
  }
  fs.writeFileSync(configPath, content, 'utf8');
}

function copyDir(srcDir, destDir) {
  let count = 0;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcEntry = path.join(srcDir, entry.name);
    const destEntry = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(srcEntry, destEntry);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
      count++;
    }
  }
  return count;
}

function copySchemaTemplates(projectPath) {
  const srcPath = path.join(__dirname, '..', 'openspec', 'schemas', 'sai-workflow');
  const destPath = path.join(projectPath, 'openspec', 'schemas', 'sai-workflow');
  const count = copyDir(srcPath, destPath);
  console.log(`Copied ${count} schema file(s) to ${destPath}.`);
}

async function main() {
  const projectPath = resolvePath();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  if (!getPathArg()) {
    const answer = await prompt(rl, `Configure SAI workflow at ${projectPath}? (Y/n) `);
    if (answer.trim().toLowerCase() === 'n') {
      rl.close();
      console.log('Aborted.');
      process.exit(0);
    }
  }

  checkOpenspecCli();
  await offerCodegraphInstall();
  ensureCodegraphIndex(projectPath);
  await ensureOpenspecDir(projectPath, rl);
  await ensureSchemaLine(projectPath, rl);
  rl.close();
  copySchemaTemplates(projectPath);

  console.log(`SAI workflow configured at ${projectPath}.`);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { main, ensureCodegraphIndex };
