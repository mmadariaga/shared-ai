'use strict';

// Runs inside a benchmark container, before the agents start: installs the mounted
// shared-ai checkout's SAI for one harness, writes the configuration's models as
// agent-file tunables in the project, and records the project as the git baseline.
//
//   node container-setup.js <setup.json>
//
// setup.json: { harness, project, checkout, models: { <worker>: { model, effort|variant } } }

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function git(project, ...args) {
  execFileSync('git', ['-c', 'user.name=benchmark', '-c', 'user.email=benchmark@example.invalid', ...args], { cwd: project, stdio: 'inherit' });
}

function installSai({ harness, project, checkout }) {
  const install = require(path.join(checkout, 'bin', 'install-flow.js'));
  if (harness === 'claude') {
    install.installClaude(undefined, { projectPath: project });
    return install.CLAUDE_BASE;
  }
  const base = install.resolveOpencodeBase();
  install.installOpencode(base, { projectPath: project });
  return base;
}

function main(setupFile) {
  const setup = JSON.parse(fs.readFileSync(setupFile, 'utf8'));
  const { harness, project, checkout, models } = setup;
  const globalRoot = installSai(setup);

  const schemaSource = path.join(checkout, 'openspec', 'schemas', 'sai-workflow');
  fs.cpSync(schemaSource, path.join(project, 'openspec', 'schemas', 'sai-workflow'), { recursive: true });

  const { materializeLocalOverride } = require(path.join(checkout, 'bin', 'model-customization.js'));
  for (const [agentName, settings] of Object.entries(models)) {
    const outcome = materializeLocalOverride({
      agentName,
      settings,
      projectPath: project,
      globalAgentRoot: path.join(globalRoot, 'agents'),
      globalCommandRoot: path.join(globalRoot, 'commands'),
      harness,
    });
    if (outcome.status !== 'persisted') throw new Error(outcome.diagnostic || `Could not write the model of ${agentName}`);
  }

  if (!fs.existsSync(path.join(project, '.git'))) git(project, 'init', '--quiet');
  git(project, 'add', '-A');
  git(project, 'commit', '--quiet', '--allow-empty', '-m', 'benchmark baseline');
}

main(process.argv[2]);
