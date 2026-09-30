'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const POLICY_PATH = 'sai/policies/command-execution.md';

function read(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function available(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 10000 });
  return !result.error && result.status === 0;
}

function runPowerShell(script, timeout = 15000) {
  const encodedCommand = Buffer.from(script, 'utf16le').toString('base64');
  return spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand], {
    cwd: REPO_ROOT,
    encoding: null,
    timeout,
  });
}

const BASH_AVAILABLE = available('bash', ['--noprofile', '--norc', '-c', 'exit 0']);
const PWSH_AVAILABLE = available('pwsh', ['-NoProfile', '-NonInteractive', '-Command', 'exit 0']);

test('the shared command-execution policy defines portable shell and message transport', () => {
  const policy = read(POLICY_PATH);

  assert.match(policy, /supported shells are Bash and PowerShell 7/);
  assert.match(policy, /Windows PowerShell 5\.1 is not\s+supported/);
  assert.match(policy, /Do not\s+require a tool named `Bash`/);
  assert.match(policy, /Pass the complete message on standard input/);
  assert.match(policy, /adjacent Bash single-quoted segments/);
  assert.match(policy, /exact final-LF\s+state/);
  assert.match(policy, /array of single-quoted line literals joined with LF/);
  assert.doesNotMatch(policy, /\$message\s*=\s*@'/);
  assert.match(policy, /System\.Diagnostics\.ProcessStartInfo/);
  assert.match(policy, /ArgumentList/);
  assert.match(policy, /StandardInputEncoding = \[System\.Text\.UTF8Encoding\]::new\(\$false\)/);
  assert.match(policy, /StandardInput\.Write\(\$message\)/);
  assert.match(policy, /Do not pipe a PowerShell string to a native process/);
  assert.match(policy, /stop before mutation/);
  assert.match(policy, /failed or\s+unavailable command stops every dependent action/);
  assert.match(policy, /git commit -F -/);
  assert.match(policy, /Do not reuse it for\s+`\/sai-merge`/);
});

test('each affected mutation surface loads the shared execution policy', () => {
  const mutationSurfaces = [
    'sai/commands/archive/coordinator.md',
    'sai/commands/archive/worker.md',
    'sai/commands/archive/archive-commit-gate.instructions.md',
    'sai/commands/archive/retirement-declaration.md',
    'sai/commands/commit/coordinator.md',
    'sai/commands/merge/coordinator.md',
    'sai/commands/explore/steps/pipeline-direct-build.md',
    'sai/commands/meta-review/direct-build-close.md',
  ];

  for (const surface of mutationSurfaces) {
    assert.match(read(surface), /Fetch @sai\/policies\/command-execution\.md/,
      `${surface} must load the shared command-execution policy`);
  }

  const projections = JSON.parse(read('sai/install-manifest.json')).projections;
  const policyProjection = projections.find(projection => projection.id === 'sai-policies');
  assert.ok(policyProjection, 'the shared policy has a managed install projection');
  assert.equal(policyProjection.recursive, true);
  assert.deepEqual(policyProjection.harnesses, ['claude', 'opencode']);
  assert.ok(policyProjection.include.includes('**/*.md'));
});

test('archive and commit surfaces preserve operation gates without Bash-only forms', () => {
  const archiveWorker = read('sai/commands/archive/worker.md');
  const archiveGate = read('sai/commands/archive/archive-commit-gate.instructions.md');
  const retirement = read('sai/commands/archive/retirement-declaration.md');
  const commit = read('sai/commands/commit/coordinator.md');
  const merge = read('sai/commands/merge/coordinator.md');
  const explore = read('sai/commands/explore/steps/pipeline-direct-build.md');
  const metaReview = read('sai/commands/meta-review/direct-build-close.md');

  assert.match(archiveWorker, /active command-execution tool using Bash or\s+PowerShell 7/);
  assert.match(archiveWorker, /0\. \*\*Retirement declaration\*\*[\s\S]*?1\. \*\*CLI archive\*\*[\s\S]*?2\. \*\*Staging\*\*[\s\S]*?3\. \*\*Commit\*\*/);
  assert.match(archiveWorker, /pre-authorized local commit/);
  assert.match(archiveWorker, /git commit -F -/);
  assert.doesNotMatch(archiveWorker, /Bash tool|HEREDOC form/i);

  assert.match(archiveGate, /git log '\@\{push\}\.\.HEAD' --oneline/);
  assert.match(archiveGate, /git commit -F -/);
  assert.match(archiveGate, /git commit --amend --no-edit/);
  assert.match(retirement, /ordinary route, the archive worker in the Direct Build execute continuation/);
  assert.doesNotMatch(retirement, /through Bash/);

  assert.match(commit, /commit\.js` path/);
  assert.match(commit, /authorized\s+message on stdin using the literal-message procedure/);
  assert.doesNotMatch(commit, /<<'EOF'|quoted heredoc/);
  assert.match(merge, /literally on standard input to\s+`git commit -F -`/);
  assert.doesNotMatch(merge, /git commit -m|\$\(cat <<'EOF'/);
  assert.ok(explore.includes('git commit -F -'));
  assert.ok(explore.includes('@sai/policies/command-execution.md'));
  assert.doesNotMatch(explore, /HEREDOC local commit/);
  assert.match(metaReview, /git commit -F -[\s\S]*?complete message literally/);
  assert.doesNotMatch(metaReview, /HEREDOC message/);
});

const MESSAGE_BASE = [
  `feat: literal café with "double", 'single', $cash, and \`backticks`,
  '',
  'Body: 日本語 stays literal.',
  "'@",
].join('\n');

const MESSAGE_CASES = [
  { name: 'without a final LF', value: MESSAGE_BASE },
  { name: 'with a final LF', value: `${MESSAGE_BASE}\n` },
];

function bashSingleQuotedWord(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function powershellMessageAssignment(value) {
  const lines = value.split('\n')
    .map(line => `  '${line.replace(/'/g, "''")}'`)
    .join('\n');
  return [
    '$message = [string]::Join("`n", [string[]]@(',
    lines,
    '))',
  ].join('\n');
}

for (const { name, value } of MESSAGE_CASES) {
  test(`Bash printf transport preserves literal message ${name}`, {
    skip: BASH_AVAILABLE ? false : 'Bash is unavailable in this environment',
  }, () => {
    const script = [
      'set -e -o pipefail',
      `message=${bashSingleQuotedWord(value)}`,
      `printf '%s' "$message" | node -e 'process.stdin.pipe(process.stdout)'`,
    ].join('\n');
    const result = spawnSync('bash', ['--noprofile', '--norc', '-s'], {
      cwd: REPO_ROOT,
      encoding: null,
      timeout: 10000,
      input: Buffer.from(script, 'utf8'),
    });

    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr.toString('utf8'));
    assert.deepEqual(result.stdout, Buffer.from(value, 'utf8'));
  });

  test(`PowerShell 7 ProcessStartInfo preserves literal message ${name}`, {
    skip: PWSH_AVAILABLE ? false : 'PowerShell 7 is unavailable in this environment',
  }, () => {
    const script = [
      powershellMessageAssignment(value),
      "$psi = [System.Diagnostics.ProcessStartInfo]::new('node')",
      '$psi.UseShellExecute = $false',
      "$psi.WorkingDirectory = (Get-Location).Path",
      '$psi.RedirectStandardInput = $true',
      '$psi.RedirectStandardOutput = $true',
      '$psi.RedirectStandardError = $true',
      '$psi.StandardInputEncoding = [System.Text.UTF8Encoding]::new($false)',
      "$psi.ArgumentList.Add('-e')",
      "$psi.ArgumentList.Add('const chunks = []; process.stdin.on(\"data\", chunk => chunks.push(chunk)); process.stdin.on(\"end\", () => process.stdout.write(Buffer.concat(chunks).toString(\"base64\")))')",
      '$process = [System.Diagnostics.Process]::Start($psi)',
      '$stdoutTask = $process.StandardOutput.ReadToEndAsync()',
      '$stderrTask = $process.StandardError.ReadToEndAsync()',
      '$process.StandardInput.Write($message)',
      '$process.StandardInput.Close()',
      '$process.WaitForExit()',
      'if ($process.ExitCode -ne 0) { [Console]::Error.Write($stderrTask.GetAwaiter().GetResult()); exit $process.ExitCode }',
      '[Console]::Write($stdoutTask.GetAwaiter().GetResult())',
    ].join('\n');
    const result = runPowerShell(script);

    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr.toString('utf8'));
    assert.deepEqual(Buffer.from(result.stdout.toString('ascii'), 'base64'), Buffer.from(value, 'utf8'));
  });
}

test('Bash message pipeline stops dependent work and exposes a failed child status', {
  skip: BASH_AVAILABLE ? false : 'Bash is unavailable in this environment',
}, () => {
  const script = [
    'set -e -o pipefail',
    `message=${bashSingleQuotedWord(MESSAGE_BASE)}`,
    `printf '%s' "$message" | node -e 'process.stdin.resume(); process.stdin.on("end", () => process.exit(7))'`,
    `node -e 'process.stdout.write("DEPENDENT")'`,
  ].join('\n');
  const result = spawnSync('bash', ['--noprofile', '--norc', '-s'], {
    cwd: REPO_ROOT,
    encoding: null,
    timeout: 10000,
    input: Buffer.from(script, 'utf8'),
  });

  assert.ifError(result.error);
  assert.equal(result.status, 7);
  assert.equal(result.stdout.length, 0);
});

test('PowerShell ProcessStartInfo stops dependent work and exposes the child exit code', {
  skip: PWSH_AVAILABLE ? false : 'PowerShell 7 is unavailable in this environment',
}, () => {
  const script = [
    powershellMessageAssignment(MESSAGE_BASE),
    "$psi = [System.Diagnostics.ProcessStartInfo]::new('node')",
    '$psi.UseShellExecute = $false',
    "$psi.WorkingDirectory = (Get-Location).Path",
    '$psi.RedirectStandardInput = $true',
    '$psi.RedirectStandardOutput = $true',
    '$psi.RedirectStandardError = $true',
    '$psi.StandardInputEncoding = [System.Text.UTF8Encoding]::new($false)',
    "$psi.ArgumentList.Add('-e')",
    "$psi.ArgumentList.Add('process.stdin.resume(); process.stdin.on(\"end\", () => process.exit(7))')",
    '$process = [System.Diagnostics.Process]::Start($psi)',
    '$stdoutTask = $process.StandardOutput.ReadToEndAsync()',
    '$stderrTask = $process.StandardError.ReadToEndAsync()',
    '$process.StandardInput.Write($message)',
    '$process.StandardInput.Close()',
    '$process.WaitForExit()',
    'if ($process.ExitCode -ne 0) { exit $process.ExitCode }',
    "$dependent = [System.Diagnostics.ProcessStartInfo]::new('node')",
    '$dependent.UseShellExecute = $false',
    '$dependent.RedirectStandardOutput = $true',
    "$dependent.ArgumentList.Add('-e')",
    "$dependent.ArgumentList.Add('process.stdout.write(\"DEPENDENT\")')",
    '$next = [System.Diagnostics.Process]::Start($dependent)',
    '$next.WaitForExit()',
    '[Console]::Write($next.StandardOutput.ReadToEnd())',
  ].join('\n');
  const result = runPowerShell(script);

  assert.ifError(result.error);
  assert.equal(result.status, 7, result.stderr.toString('utf8'));
  assert.equal(result.stdout.length, 0);
});
