'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Shared by the installer, customizer, and coordinator.
const CATEGORY_AGENTS = Object.freeze({ 'frontend-ui': 'ui', 'frontend-code': 'frontend', backend: 'backend', data: 'backend', infra: 'infra', docs: 'other', other: 'other' });
const AGENTS = Object.freeze(['ui', 'frontend', 'backend', 'infra', 'other']);
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');

function taskSteps(text) {
  const lines = text.split('\n');
  const steps = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^## Step (\d+)\b/);
    if (!heading) continue;
    const number = Number(heading[1]);
    if (number < 1 || steps.some(step => step.number === number)) throw new Error(`Duplicate or invalid Step ${number}`);
    let end = lines.findIndex((line, index) => index > i && /^## /.test(line));
    if (end < 0) end = lines.length;
    const routing = lines.slice(i + 1, end).filter(line => /^\*\*Routing\*\*:/.test(line));
    const categories = [...(routing[0] || '').matchAll(/\bcategory=([^\s·]+)/g)];
    const category = categories[0]?.[1];
    if (routing.length !== 1 || categories.length !== 1 || !Object.hasOwn(CATEGORY_AGENTS, category)) throw new Error(`Step ${number}: missing or invalid category`);
    steps.push({ number, category, agent: CATEGORY_AGENTS[category] });
  }
  if (!steps.length) throw new Error('tasks.md contains no Steps');
  return steps;
}

function inputHashes(changeDir) {
  const files = ['proposal.md', 'design.md', 'tasks.md', 'interfaces.md', 'implementation.md', 'review.md', 'security.md', 'performance.md', 'accessibility.md'];
  function specs(dir, prefix) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isDirectory()) specs(file, `${prefix}${name}/`);
      else files.push(`${prefix}${name}`);
    }
  }
  specs(path.join(changeDir, 'specs'), 'specs/');
  return Object.fromEntries(files.map(file => [file, fs.existsSync(path.join(changeDir, file)) ? digest(fs.readFileSync(path.join(changeDir, file))) : null]));
}

function start(cwd, change) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(change)) throw new Error('Invalid change name');
  const changeDir = path.join(cwd, 'openspec', 'changes', change);
  for (const file of ['proposal.md', 'design.md', 'tasks.md']) read(path.join(changeDir, file));
  const steps = taskSteps(read(path.join(changeDir, 'tasks.md')));
  const parent = path.join(changeDir, '.planning-parts');
  fs.mkdirSync(parent, { recursive: true });
  const runDir = fs.mkdtempSync(path.join(parent, 'run-'));
  const run = { version: 1, change, inputs: inputHashes(changeDir), steps };
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n', { flag: 'wx' });
  return { run: path.relative(cwd, runDir), assignments: AGENTS.filter(agent => steps.some(step => step.agent === agent)).map(agent => ({ agent, worker: `sai-3-${agent}-worker`, steps: steps.filter(step => step.agent === agent).map(step => step.number), artifact: path.relative(cwd, path.join(runDir, `${agent}.json`)) })) };
}

function loadRun(cwd, runPath) {
  const runDir = path.resolve(cwd, runPath);
  const relative = path.relative(cwd, runDir);
  if (!/^openspec[\\/]changes[\\/][a-z0-9-]+[\\/]\.planning-parts[\\/]run-[^\\/]+$/.test(relative)) throw new Error('Invalid owned run path');
  const run = JSON.parse(read(path.join(runDir, 'run.json')));
  const changeDir = path.join(cwd, 'openspec', 'changes', run.change);
  if (path.dirname(path.dirname(runDir)) !== changeDir) throw new Error('Run identity mismatch');
  if (JSON.stringify(inputHashes(changeDir)) !== JSON.stringify(run.inputs)) throw new Error('Planning inputs changed; retain parts and start a new run');
  if (JSON.stringify(taskSteps(read(path.join(changeDir, 'tasks.md')))) !== JSON.stringify(run.steps)) throw new Error('Run assignment mismatch');
  return { run, runDir, changeDir };
}

function assemble(cwd, runPath) {
  const { run, runDir } = loadRun(cwd, runPath);
  const sections = new Map();
  for (const agent of AGENTS.filter(agent => run.steps.some(step => step.agent === agent))) {
    const part = JSON.parse(read(path.join(runDir, `${agent}.json`)));
    if (part.run !== runPath || part.agent !== agent || JSON.stringify(part.inputs) !== JSON.stringify(run.inputs)) throw new Error(`${agent}: part identity mismatch`);
    const assigned = run.steps.filter(step => step.agent === agent).map(step => step.number);
    if (!Array.isArray(part.steps) || JSON.stringify(part.steps.map(step => step.number)) !== JSON.stringify(assigned)) throw new Error(`${agent}: incomplete, duplicate, or wrong Step ownership`);
    for (const step of part.steps) {
      if (typeof step.content !== 'string' || !step.content.startsWith(`#### Step ${step.number}:`) || (step.content.match(/^#### Step \d+:/gm) || []).length !== 1) throw new Error(`${agent}: malformed Step ${step.number}`);
      sections.set(step.number, step.content.trim());
    }
  }
  const header = read(path.join(runDir, 'header.md'));
  const tail = fs.existsSync(path.join(runDir, 'tail.md')) ? read(path.join(runDir, 'tail.md')) : '';
  if (/^#### Step \d+:/m.test(header)) throw new Error('Step in plan header');
  const highest = Math.max(...run.steps.map(step => step.number));
  const tailSteps = [...tail.matchAll(/^#### Step (\d+): (.*)$/gm)];
  for (let i = 0; i < tailSteps.length; i++) {
    const number = Number(tailSteps[i][1]);
    const kind = tailSteps[i][2].match(/^Address (review|security|performance|accessibility) findings$/)?.[1];
    if (number !== highest + i + 1 || !kind) throw new Error('Invalid coordinator audit Step coverage or order');
  }
  const candidate = [header.trim(), ...run.steps.map(step => sections.get(step.number)), tail.trim()].filter(Boolean).join('\n\n') + '\n';
  const validationRoot = path.join(runDir, 'validation');
  const target = path.join(validationRoot, 'openspec', 'changes', run.change);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'implementation.md'), candidate);
  fs.copyFileSync(path.join(cwd, 'openspec', 'changes', run.change, 'tasks.md'), path.join(target, 'tasks.md'));
  fs.writeFileSync(path.join(runDir, 'candidate.md'), candidate);
  return { candidate: path.relative(cwd, path.join(runDir, 'candidate.md')), validation_cwd: path.relative(cwd, validationRoot), sha256: digest(candidate) };
}

function publish(cwd, runPath, expectedHash) {
  const { run, runDir, changeDir } = loadRun(cwd, runPath);
  const candidate = read(path.join(runDir, 'candidate.md'));
  if (digest(candidate) !== expectedHash) throw new Error('Verified candidate changed');
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'apply-step.js'), 'preflight', '--change', run.change, '--cwd', path.join(runDir, 'validation'), '--json'], { encoding: 'utf8' });
  if (result.status !== 0 || JSON.parse(result.stdout).ok !== true) throw new Error(`Candidate preflight failed: ${result.stdout || result.stderr}`);
  if (read(path.join(runDir, 'validation', 'openspec', 'changes', run.change, 'implementation.md')) !== candidate) throw new Error('Validation candidate mismatch');
  const next = path.join(runDir, 'publish.md');
  fs.writeFileSync(next, candidate, { flag: 'wx' });
  fs.renameSync(next, path.join(changeDir, 'implementation.md'));
  const owned = ['run.json', 'header.md', 'tail.md', 'candidate.md', ...AGENTS.filter(agent => run.steps.some(step => step.agent === agent)).map(agent => `${agent}.json`)];
  for (const file of owned) if (fs.existsSync(path.join(runDir, file))) fs.unlinkSync(path.join(runDir, file));
  for (const file of ['implementation.md', 'tasks.md']) fs.unlinkSync(path.join(runDir, 'validation', 'openspec', 'changes', run.change, file));
  return { published: `openspec/changes/${run.change}/implementation.md`, cleaned: owned };
}

if (require.main === module) {
  try {
    const [verb, ...args] = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 2) options[args[i]] = args[i + 1];
    const cwd = path.resolve(options['--cwd'] || process.cwd());
    let result;
    if (verb === 'start') result = start(cwd, options['--change']);
    else if (verb === 'assemble') result = assemble(cwd, options['--run']);
    else if (verb === 'publish') result = publish(cwd, options['--run'], options['--sha256']);
    else throw new Error('Use start, assemble, or publish');
    console.log(JSON.stringify(result));
  } catch (error) { console.log(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; }
}

module.exports = { CATEGORY_AGENTS, AGENTS, taskSteps, start, assemble, publish };
