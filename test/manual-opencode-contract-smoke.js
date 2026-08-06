'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WORKER_NAME = 'sai-6-security-worker';
const SENTINEL = 'SAI_CONTRACT_SMOKE_SENTINEL';
const LOCAL_MARKER = 'SAI_PROJECT_LOCAL_CONTRACT_MARKER';
const GLOBAL_MARKER = 'SAI_ISOLATED_GLOBAL_CONTRACT_MARKER';
const REGISTRATION_PROMPT = `Fetch @sai/orchestration/workers/${WORKER_NAME}.md and follow it exactly.`;

function writeMarkerContract(contractPath, marker) {
  fs.mkdirSync(path.dirname(contractPath), { recursive: true });
  fs.writeFileSync(contractPath, [
    `# ${marker}`,
    '',
    `When the user message contains ${SENTINEL}, print ${marker} on its own line before printing ${SENTINEL}.`,
    'Do not print the other marker.',
    '',
  ].join('\n'));
}

function writeIsolatedConfiguration(globalOpencodeRoot) {
  fs.mkdirSync(globalOpencodeRoot, { recursive: true });
  fs.writeFileSync(path.join(globalOpencodeRoot, 'opencode.jsonc'), JSON.stringify({
    agent: {
      [WORKER_NAME]: {
        mode: 'subagent',
        model: 'opencode-go/glm-5.2',
        variant: 'high',
        prompt: REGISTRATION_PROMPT,
      },
    },
    permission: {
      external_directory: {
        '~/.config/opencode/sai/**': 'allow',
      },
    },
  }, null, 2) + '\n');
}

function isolatedEnvironment(homeRoot) {
  return {
    ...process.env,
    HOME: homeRoot,
    USERPROFILE: homeRoot,
    XDG_CONFIG_HOME: path.join(homeRoot, '.config'),
    APPDATA: path.join(homeRoot, 'AppData', 'Roaming'),
  };
}

function combinedOutput(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function isRuntimeUnavailable(result, output) {
  if (result.error || result.status === null) return true;
  return result.status !== 0 && /(opencode|provider|model|authentication|unauthorized|api key|network|connect|timed out|not found)/i.test(output);
}

function runWorker(projectRoot, environment) {
  const result = childProcess.spawnSync(
    'opencode',
    ['run', '--agent', WORKER_NAME, '--format', 'json', SENTINEL],
    { cwd: projectRoot, env: environment, encoding: 'utf8' },
  );
  const output = combinedOutput(result);
  if (isRuntimeUnavailable(result, output)) {
    const error = new Error(output.trim() || 'opencode runtime or model is unavailable');
    error.code = 'RUNTIME_UNAVAILABLE';
    throw error;
  }
  if (result.status !== 0) {
    throw new Error(`opencode exited ${result.status}: ${output.trim()}`);
  }
  return output;
}

function assertMarkerOrder(output, expectedMarker, forbiddenMarker) {
  const markerIndex = output.indexOf(expectedMarker);
  const sentinelIndex = output.indexOf(SENTINEL);
  assert.notEqual(markerIndex, -1, `missing expected contract marker ${expectedMarker}`);
  assert.notEqual(sentinelIndex, -1, 'missing sentinel envelope in opencode transcript');
  assert.ok(markerIndex < sentinelIndex, `${expectedMarker} must appear before ${SENTINEL}`);
  assert.equal(output.includes(forbiddenMarker), false, `unexpected contract marker ${forbiddenMarker}`);
}

function main() {
  const disposableRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-contract-smoke-'));
  try {
    const projectRoot = path.join(disposableRoot, 'project');
    const homeRoot = path.join(disposableRoot, 'home');
    const globalOpencodeRoot = path.join(homeRoot, '.config', 'opencode');
    const projectContract = path.join(projectRoot, '.opencode', 'sai', 'orchestration', 'workers', `${WORKER_NAME}.md`);
    const globalContract = path.join(globalOpencodeRoot, 'sai', 'orchestration', 'workers', `${WORKER_NAME}.md`);
    const environment = isolatedEnvironment(homeRoot);

    fs.mkdirSync(projectRoot, { recursive: true });
    writeIsolatedConfiguration(globalOpencodeRoot);
    writeMarkerContract(globalContract, GLOBAL_MARKER);
    writeMarkerContract(projectContract, LOCAL_MARKER);

    const localTranscript = runWorker(projectRoot, environment);
    assertMarkerOrder(localTranscript, LOCAL_MARKER, GLOBAL_MARKER);

    fs.rmSync(projectContract, { force: true });
    const fallbackTranscript = runWorker(projectRoot, environment);
    assertMarkerOrder(fallbackTranscript, GLOBAL_MARKER, LOCAL_MARKER);

    console.log('opencode registration prompt loaded project-local contract before the sentinel and fell back to the isolated global contract.');
  } catch (error) {
    if (error.code === 'RUNTIME_UNAVAILABLE') {
      console.error(`RUNTIME_UNAVAILABLE: ${error.message}`);
      process.exitCode = 2;
      return;
    }
    console.error(`CONTRACT_RESOLUTION_FAILURE: ${error.stack || error.message}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(disposableRoot, { recursive: true, force: true });
  }
}

if (require.main === module && !process.env.NODE_TEST_CONTEXT) main();
