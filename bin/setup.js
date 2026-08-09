#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { spawnSync } = childProcess;
const readline = require('readline');
const { offerCodegraphInstall, probeCodegraph, offerOpenspecInstall } = require('./install-flow.js');

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function getPathArg(argv) {
  return argv[2] === 'setup' ? argv[3] : argv[2];
}

function resolvePath(argv) {
  const arg = getPathArg(argv);
  if (arg) {
    return path.resolve(arg);
  }
  return process.cwd();
}

async function ensureOpenspecDir(projectPath, rl) {
  const openspecDir = path.join(projectPath, 'openspec');
  if (fs.existsSync(openspecDir)) {
    return 'success';
  }
  const answer = await prompt(rl, `openspec/ not found at ${projectPath}.\n\nRun 'openspec init'? (Y/n) `);
  if (answer.trim().toLowerCase() === 'n') {
    rl.close();
    console.log('Aborted.');
    return 'aborted';
  }
  const result = spawnSync('openspec', ['init'], { cwd: projectPath, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    console.error("error", result);
    rl.close();
    return 'required-failure';
  }

  console.log(`Initialized openspec/ at ${projectPath}.\n`);
  return 'success';
}

function ensureCodegraphIndex(projectPath, { probe = probeCodegraph, runInit, indexExists } = {}) {
  if (typeof indexExists !== 'function') {
    indexExists = () => fs.existsSync(path.join(projectPath, '.codegraph'));
  }
  if (typeof runInit !== 'function') {
    runInit = () => {
      childProcess.spawnSync('codegraph', ['init'], { cwd: projectPath, stdio: 'inherit', shell: true });
    };
  }

  if (indexExists()) {
    return;
  }

  if (!probe()) {
    return;
  }

  runInit(projectPath);
}

async function ensureSchemaLine(projectPath, rl) {
  const configPath = path.join(projectPath, 'openspec', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    console.error("openspec/config.yaml not found.\n\nRun 'openspec init' first.");
    rl.close();
    return 'required-failure';
  }
  let content = fs.readFileSync(configPath, 'utf8');
  if (/^schema:\s*sai-workflow\s*$/m.test(content)) {
    return 'success';
  }
  const answer = await prompt(rl, 'Set schema: sai-workflow in openspec/config.yaml? (Y/n) ');
  if (answer.trim().toLowerCase() === 'n') {
    rl.close();
    console.log('Aborted.');
    return 'aborted';
  }
  if (/^schema:.*$/m.test(content)) {
    content = content.replace(/^schema:.*$/m, 'schema: sai-workflow');
  } else {
    content = 'schema: sai-workflow\n' + content;
  }
  fs.writeFileSync(configPath, content, 'utf8');
  return 'success';
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

async function main(options = {}) {
  const {
    argv = process.argv,
    createReadline = () => readline.createInterface({ input: process.stdin, output: process.stdout }),
    postSetupWorkflow = async () => {},
  } = options;

  const projectPath = resolvePath(argv);
  const rl = createReadline();

  if (!getPathArg(argv)) {
    const answer = await prompt(rl, `Configure SAI workflow at ${projectPath}? (Y/n) `);
    if (answer.trim().toLowerCase() === 'n') {
      rl.close();
      console.log('Aborted.');
      return 'aborted';
    }
  }

  if (!(await offerOpenspecInstall())) {
    rl.close();
    return 'required-failure';
  }
  await offerCodegraphInstall();
  ensureCodegraphIndex(projectPath);
  const openspecOutcome = await ensureOpenspecDir(projectPath, rl);
  if (openspecOutcome !== 'success') {
    return openspecOutcome;
  }
  const schemaOutcome = await ensureSchemaLine(projectPath, rl);
  if (schemaOutcome !== 'success') {
    return schemaOutcome;
  }

  try {
    copySchemaTemplates(projectPath);
    await postSetupWorkflow({ projectPath, readline: rl });
  } catch (err) {
    rl.close();
    console.error(err);
    return 'post-setup-failure';
  }
  rl.close();

  console.log(`SAI workflow configured at ${projectPath}.`);
  return 'success';
}

if (require.main === module) {
  main().then(outcome => {
    process.exit(outcome === 'success' || outcome === 'aborted' ? 0 : 1);
  }).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { main, ensureCodegraphIndex };
