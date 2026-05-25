#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');
const readline = require('readline');

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
  // stub — implemented in Step 3
}

async function ensureOpenspecDir(projectPath, rl) {
  // stub — implemented in Step 4
}

async function ensureSchemaLine(projectPath, rl) {
  // stub — implemented in Step 5
}

function copySchemaTemplates(projectPath) {
  // stub — implemented in Step 6
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
  await ensureOpenspecDir(projectPath, rl);
  await ensureSchemaLine(projectPath, rl);
  rl.close();
  copySchemaTemplates(projectPath);

  console.log(`SAI workflow configured at ${projectPath}.`);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { main };
