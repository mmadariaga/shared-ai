#!/usr/bin/env node

'use strict';

/**
 * status — deterministic engine for OpenSpec change status panel and bulk table.
 *
 * Replaces the prose algorithm in sai/commands/status/body.md with a pure
 * read-plus-decision-table tool that renders both the single-change panel
 * and the bulk-changes table. The panel is a pure read-plus-decision-table
 * with no judgement in it — decided here by code so no consumer re-derives
 * it from prose.
 *
 * Sub-commands:
 *   panel <name>               Render the status panel for one change.
 *   bulk                       Render the status table for all changes.
 *
 * Usage:
 *   node sai/tools/status.js panel <name> [--json] [--cwd <dir>]
 *   node sai/tools/status.js bulk [--json] [--cwd <dir>]
 *
 * Exit codes: 0 = panel/table rendered successfully; 1 = refused, the change
 * does not exist or no active changes found; 2 = usage error or CLI/IO failure.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, execFile } = require('child_process');
const { readOpenspecYaml } = require('./openspec-yaml');

// The eleven sai-workflow artifacts in canonical order
const ARTIFACTS = ['proposal', 'specs', 'design', 'tasks', 'interfaces', 'change-overview', 'implementation', 'review', 'security', 'performance', 'accessibility'];
const AUDITS = ['review', 'security', 'performance', 'accessibility'];
const NOT_APPLICABLE_HEADING = '## Not Applicable';

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/** A refusal: the action is not performed and nothing was mutated. */
class Refusal extends Error {
  constructor(reason, message, extra = {}) {
    super(message);
    this.reason = reason;
    this.extra = extra;
  }
}

/**
 * On Windows an npm-installed CLI is a `.cmd` shim, which `spawnSync` cannot
 * execute without a shell. The arguments are fixed literals, so the shell hop
 * introduces no quoting hazard.
 */
function run(command, args, cwd) {
  const useShell = process.platform === 'win32';
  const result = useShell
    ? spawnSync([command, ...args].join(' '), { cwd, encoding: 'utf8', windowsHide: true, shell: true })
    : spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error && result.error.code === 'ENOENT') {
    return { available: false, status: null, stdout: '', stderr: '' };
  }
  if (result.error) return { available: false, status: null, stdout: '', stderr: result.error.message };
  return {
    available: true,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function pathExists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (err) {
    return false;
  }
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch (err) {
    return false;
  }
}


/**
 * Detect if change is archived by checking archive directory.
 * Returns { archived: true, archiveDate: 'YYYY-MM-DD', archivePath } or { archived: false }
 */
function detectArchived(changeName, cwd) {
  try {
    const archiveDir = path.join(cwd, 'openspec', 'changes', 'archive');
    if (!isDirectory(archiveDir)) {
      return { archived: false };
    }

    const entries = fs.readdirSync(archiveDir);
    for (const entry of entries) {
      // Look for directories ending with -{changeName}
      if (entry.endsWith(`-${changeName}`)) {
        const archivePath = path.join(archiveDir, entry);
        if (isDirectory(archivePath)) {
          // Extract date from directory name
          const dateMatch = entry.match(/^(\d{4}-\d{2}-\d{2})-/);
          const archiveDate = dateMatch ? dateMatch[1] : 'unknown';
          return { archived: true, archiveDate, archivePath };
        }
      }
    }
  } catch (err) {
    // Directory error - just continue as not archived
  }
  return { archived: false };
}

/**
 * Check if file contains "## Not Applicable" heading (exact match, case-sensitive).
 * Must be "## " followed by exactly "Not Applicable" (case-sensitive).
 */
function hasNotApplicableHeading(filePath) {
  if (!pathExists(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match the exact heading: "## Not Applicable" on its own line
    return /^## Not Applicable(?:\n|$)/m.test(content);
  } catch (err) {
    return false;
  }
}

/**
 * Count implementation progress: checked / total tasks
 * Returns "X/Y" or empty string if file doesn't exist
 */
function countImplementationProgress(filePath) {
  if (!pathExists(filePath)) return '';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const checked = (content.match(/- \[x\]/g) || []).length;
    const total = (content.match(/- \[(x| )\]/g) || []).length;
    return total > 0 ? `${checked}/${total}` : '';
  } catch (err) {
    return '';
  }
}

/**
 * Get artifact status from CLI output
 * CLI returns "done" or "ready" or "blocked"
 * We map: done -> true (present), ready/blocked -> false (absent)
 */
function getArtifactStatuses(cwd, changeName) {
  const result = run('openspec', ['status', '--change', changeName, '--json'], cwd);
  if (!result.available) {
    throw new ToolError('the `openspec` binary is not available on PATH');
  }
  if (result.status !== 0) {
    throw new ToolError(`openspec status failed: ${result.stderr || result.stdout}`);
  }

  try {
    const data = JSON.parse(result.stdout);
    const statuses = {};
    ARTIFACTS.forEach(artifact => {
      statuses[artifact] = { present: false, status: 'blocked' };
    });

    if (data.artifacts && Array.isArray(data.artifacts)) {
      for (const artifact of data.artifacts) {
        if (ARTIFACTS.includes(artifact.name)) {
          statuses[artifact.name] = {
            present: artifact.status === 'done',
            status: artifact.status,
          };
        }
      }
    }
    return statuses;
  } catch (err) {
    throw new ToolError(`failed to parse openspec status JSON: ${err.message}`);
  }
}

/**
 * Pure derivation: given gathered inputs, return panel cells and Next hint.
 * This function is independent of CLI calls and file I/O - it's purely
 * a decision table. Extracted for testability.
 *
 * The overview cell derives from overview.state in the parsed YAML, combined
 * with the change-overview.md artifact presence from the CLI, per Step E3.
 *
 * Input parameters:
 *   statuses: artifact status map from CLI (artifact.name -> {present, status})
 *   openspecYaml: parsed .openspec.yaml result (null if absent)
 *   auditNotApplicableFlags: map of audit name -> boolean (true if has "## Not Applicable")
 *   implProgress: "X/Y" or empty string
 *   implExists: boolean
 *
 * Returns: {cells, specsCell, overviewCell, implProgress, next}
 */
function derivePanelCells(statuses, openspecYaml, auditNotApplicableFlags, implProgress, implExists) {
  const specsApproved = openspecYaml && openspecYaml.approval_specs_approved_at ? true : false;

  // Build cells for each artifact and track audit statuses
  const cells = {};
  const auditStatus = {}; // Track which audits are satisfied
  for (const artifact of ARTIFACTS) {
    if (artifact === 'interfaces') {
      cells[artifact] = statuses[artifact].present ? '●' : '·';
    } else if (AUDITS.includes(artifact)) {
      if (!statuses[artifact].present) {
        cells[artifact] = '·';
        auditStatus[artifact] = false;
      } else if (auditNotApplicableFlags[artifact]) {
        cells[artifact] = 'N/A';
        auditStatus[artifact] = true;
      } else {
        cells[artifact] = '●';
        auditStatus[artifact] = true;
      }
    } else {
      cells[artifact] = statuses[artifact].present ? '●' : '·';
    }
  }

  // Specs 3-state cell
  const specsCell = specsApproved ? '●' : (statuses.specs.present ? '○' : '·');

  // Overview state handling (E3)
  let overviewCell = '·';
  if (openspecYaml && openspecYaml.backfilled) {
    overviewCell = 'N/A'; // E4
  } else if (openspecYaml && openspecYaml.overview_state) {
    const overviewState = openspecYaml.overview_state;
    if (overviewState === 'current' && statuses['change-overview'].present) {
      overviewCell = '●';
    } else if (['stale', 'failed', 'materializing'].includes(overviewState)) {
      overviewCell = '!';
    } else if (overviewState === 'current' && !statuses['change-overview'].present) {
      // current metadata but file absent = problem state
      overviewCell = '!';
    } else if (overviewState === 'unmaterialized') {
      overviewCell = '·';
    }
  }

  // Resolve Next
  const next = resolveNext(statuses, specsApproved, implProgress, implExists, auditStatus);

  return { cells, specsCell, overviewCell, implProgress, next };
}

/**
 * Resolve Next: hint based on state (Step E)
 * implProgress is the string "X/Y" or empty string
 * auditStatus is an object mapping audit name to boolean (true = satisfied)
 */
function resolveNext(statuses, specsApproved, implProgress, implExists, auditStatus) {
  // specs absent
  if (!statuses.specs.present) {
    return '/sai-1-spec';
  }

  // specs present, not approved
  if (!specsApproved) {
    return '/sai-2-design';
  }

  // approved, design or tasks absent
  if (!statuses.design.present || !statuses.tasks.present) {
    return '/sai-2-design';
  }

  // design + tasks present, implementation absent
  if (!statuses.implementation.present) {
    return '/sai-3-implement';
  }

  // implementation present - check if all tasks are marked [x]
  if (implExists && implProgress) {
    const [checked, total] = implProgress.split('/').map(Number);
    if (checked < total) {
      return '/sai-4-apply';
    }
  } else if (implExists && !implProgress) {
    // implementation.md exists but has no checkboxes - still needs work
    return '/sai-4-apply';
  }

  // audits missing (not satisfied)
  const missingAudits = [];
  for (const audit of AUDITS) {
    if (!auditStatus[audit]) {
      missingAudits.push(audit);
    }
  }

  if (missingAudits.length > 0) {
    // Map to appropriate command: review -> /sai-5-review, etc.
    const auditMap = {
      review: '/sai-5-review',
      security: '/sai-6-security',
      performance: '/sai-7-performance',
      accessibility: '/sai-8-accessibility',
    };
    return auditMap[missingAudits[0]];
  }

  // all audits present and satisfied (including N/A) - ready for PR/archive
  return '/sai-pr';
}

/**
 * Render panel for a single change
 */
function renderPanel(cwd, changeName) {
  // Step A: Check if archived
  const archiveStatus = detectArchived(changeName, cwd);
  if (archiveStatus.archived) {
    return {
      ok: true,
      action: 'panel',
      changeName,
      archived: true,
      archivePath: archiveStatus.archivePath,
      archiveDate: archiveStatus.archiveDate,
      panel: `${changeName}\n  archived at ${archiveStatus.archivePath}\n  date: ${archiveStatus.archiveDate}\n`,
    };
  }

  // Step B: Get artifact statuses from CLI
  const statuses = getArtifactStatuses(cwd, changeName);

  // Step C: Fill the gaps and gather local file data
  const changesDir = path.join(cwd, 'openspec', 'changes', changeName);
  const openspecYaml = readOpenspecYaml(path.join(changesDir, '.openspec.yaml'));
  const implProgress = countImplementationProgress(path.join(changesDir, 'implementation.md'));
  const implPath = path.join(changesDir, 'implementation.md');
  const implExists = pathExists(implPath);

  // Check which audits have "## Not Applicable" heading
  const auditNotApplicableFlags = {};
  for (const audit of AUDITS) {
    auditNotApplicableFlags[audit] = hasNotApplicableHeading(path.join(changesDir, `${audit}.md`));
  }

  // Pure derivation: compute all cells and Next hint
  const derived = derivePanelCells(statuses, openspecYaml, auditNotApplicableFlags, implProgress, implExists);
  const cells = derived.cells;
  const specsCell = derived.specsCell;
  const overviewCell = derived.overviewCell;
  const next = derived.next;

  // Build panel text
  const lines = [
    changeName,
    `  proposal: ${cells.proposal}`,
    `  specs: ${specsCell}`,
    `  design: ${cells.design}`,
    `  tasks: ${cells.tasks}`,
    `  interfaces: ${cells.interfaces}`,
    `  overview: ${overviewCell}`,
    `  implementation: ${cells.implementation}`,
    `  review: ${cells.review}`,
    `  security: ${cells.security}`,
    `  performance: ${cells.performance}`,
    `  accessibility: ${cells.accessibility}`,
    `  impl progress: ${implProgress}`,
    `  next: ${next}`,
  ];

  return {
    ok: true,
    action: 'panel',
    changeName,
    archived: false,
    panel: lines.join('\n'),
    cells,
    specsCell,
    overviewCell,
    implProgress,
    next,
  };
}

/**
 * Get all active change names
 */
async function getAllChangeNames(cwd) {
  const result = run('openspec', ['list', '--json'], cwd);
  if (!result.available) {
    throw new ToolError('the `openspec` binary is not available on PATH');
  }
  if (result.status !== 0) {
    throw new ToolError(`openspec list failed: ${result.stderr || result.stdout}`);
  }

  try {
    const data = JSON.parse(result.stdout);
    return (data.changes || []).map(c => c.name);
  } catch (err) {
    throw new ToolError(`failed to parse openspec list JSON: ${err.message}`);
  }
}

/**
 * Promisified execFile for openspec status calls
 */
function execFilePromise(command, args, cwd) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, encoding: 'utf8', windowsHide: true }, (error, stdout, stderr) => {
      if (error && error.code === 'ENOENT') {
        resolve({ available: false, status: null, stdout: '', stderr: '' });
      } else if (error) {
        resolve({ available: false, status: null, stdout: '', stderr: error.message });
      } else {
        resolve({ available: true, status: 0, stdout: stdout || '', stderr: stderr || '' });
      }
    });
  });
}

/**
 * Default gather function for bulk mode: gathers status data for one change.
 * Can be injected for testing. Returns a promise resolving to:
 * - On success: { data: <parsed CLI output> }
 * - On error: { error: <error message> }
 */
async function defaultGatherChangeStatus(cwd, changeName) {
  const result = await execFilePromise('openspec', ['status', '--change', changeName, '--json'], cwd);
  if (!result.available) {
    return { error: 'openspec not available' };
  }
  if (result.status !== 0) {
    return { error: 'status failed' };
  }
  try {
    return { data: JSON.parse(result.stdout) };
  } catch (err) {
    return { error: 'JSON parse failed' };
  }
}

/**
 * Render bulk table for all changes (parallelized)
 * @param {string} cwd - working directory
 * @param {Function} gatherFn - optional injectable function(cwd, changeName) => Promise<{data|error}>
 * @param {Function} listFn - optional injectable function(cwd) => Promise<string[]> for change names
 */
async function renderBulk(cwd, gatherFn, listFn) {
  const listChanges = listFn || getAllChangeNames;
  const changeNames = await listChanges(cwd);

  if (changeNames.length === 0) {
    return {
      ok: true,
      action: 'bulk',
      changes: [],
      table: '(no active changes)',
    };
  }

  // Use provided gather function or default
  const gather = gatherFn || defaultGatherChangeStatus;

  // Parallelize the status gathering for all changes
  const gatherPromises = changeNames.map(changeName =>
    gather(cwd, changeName)
      .then(result => ({ changeName, result }))
      .catch(err => ({ changeName, error: err.message }))
  );

  const gatherResults = await Promise.all(gatherPromises);

  // Parse results and combine with local file reads to build rows
  const rows = [];
  const statusMap = new Map();

  // Build map of results
  for (const { changeName, result, error } of gatherResults) {
    if (error) {
      statusMap.set(changeName, { error });
    } else if (result.error) {
      statusMap.set(changeName, { error: result.error });
    } else if (result.data) {
      statusMap.set(changeName, { data: result.data });
    }
  }

  // Now do the local file reads and build rows
  for (const changeName of changeNames) {
    const statusInfo = statusMap.get(changeName);

    if (statusInfo.error) {
      rows.push({
        change: changeName,
        error: true,
        message: statusInfo.error,
      });
      continue;
    }

    try {
      // Parse the artifacts from the parallel result
      const data = statusInfo.data;
      const statuses = {};
      ARTIFACTS.forEach(artifact => {
        statuses[artifact] = { present: false, status: 'blocked' };
      });

      if (data.artifacts && Array.isArray(data.artifacts)) {
        for (const artifact of data.artifacts) {
          if (ARTIFACTS.includes(artifact.name)) {
            statuses[artifact.name] = {
              present: artifact.status === 'done',
              status: artifact.status,
            };
          }
        }
      }

      // Now do local file reads
      const changesDir = path.join(cwd, 'openspec', 'changes', changeName);
      const openspecYaml = readOpenspecYaml(path.join(changesDir, '.openspec.yaml'));
      const specsApproved = openspecYaml && openspecYaml.approval_specs_approved_at ? true : false;
      const implProgress = countImplementationProgress(path.join(changesDir, 'implementation.md'));

      // Build cells
      const cells = {};
      const auditStatus = {};
      for (const artifact of ARTIFACTS) {
        if (artifact === 'interfaces') {
          cells[artifact] = statuses[artifact].present ? '●' : '·';
        } else if (AUDITS.includes(artifact)) {
          if (!statuses[artifact].present) {
            cells[artifact] = '·';
            auditStatus[artifact] = false;
          } else if (hasNotApplicableHeading(path.join(changesDir, `${artifact}.md`))) {
            cells[artifact] = 'N/A';
            auditStatus[artifact] = true;
          } else {
            cells[artifact] = '●';
            auditStatus[artifact] = true;
          }
        } else {
          cells[artifact] = statuses[artifact].present ? '●' : '·';
        }
      }

      const specsCell = specsApproved ? '●' : (statuses.specs.present ? '○' : '·');

      // Overview state handling
      let overviewCell = '·';
      if (openspecYaml && openspecYaml.backfilled) {
        overviewCell = 'N/A';
      } else if (openspecYaml && openspecYaml.overview_state) {
        const overviewState = openspecYaml.overview_state;
        if (overviewState === 'current' && statuses['change-overview'].present) {
          overviewCell = '●';
        } else if (['stale', 'failed', 'materializing'].includes(overviewState)) {
          overviewCell = '!';
        } else if (overviewState === 'unmaterialized') {
          overviewCell = '·';
        }
      }

      // Check if implementation.md exists
      const implPath = path.join(changesDir, 'implementation.md');
      const implExists = pathExists(implPath);

      // Resolve Next
      const next = resolveNext(statuses, specsApproved, implProgress, implExists, auditStatus);

      rows.push({
        change: changeName,
        cells,
        specsCell,
        overviewCell,
        implProgress,
        next,
      });
    } catch (err) {
      rows.push({
        change: changeName,
        error: true,
        message: err.message,
      });
    }
  }

  // Build table header
  const header = '| Change | prop | spec | dsgn | task | intf | cov | impl | rev | sec | perf | a11y | Impl | Next |';
  const separator = '|--------|------|------|------|------|------|------|------|------|------|------|------|------|------|';

  const tableLines = [header, separator];
  for (const row of rows) {
    if (row.error) {
      tableLines.push(`| ${row.change} | ERROR | | | | | | | | | | | | |`);
    } else {
      const line = `| ${row.change} | ${row.cells.proposal} | ${row.specsCell} | ${row.cells.design} | ${row.cells.tasks} | ${row.cells.interfaces} | ${row.cells['change-overview']} | ${row.cells.implementation} | ${row.cells.review} | ${row.cells.security} | ${row.cells.performance} | ${row.cells.accessibility} | ${row.implProgress} | ${row.next} |`;
      tableLines.push(line);
    }
  }

  const legend = 'Legend: ● present · ○ specs present-unapproved · · absent · ! problem-state overview · N/A not-applicable audit';
  tableLines.push('');
  tableLines.push(legend);

  return {
    ok: true,
    action: 'bulk',
    changeCount: changeNames.length,
    rows,
    table: tableLines.join('\n'),
  };
}

function usage() {
  return [
    'Usage: node sai/tools/status.js <sub-command> [args] [--json] [--cwd <dir>]',
    '',
    '  panel <name>             Render the status panel for one change.',
    '  bulk                     Render the status table for all changes.',
    '',
    '  --json                   Emit the report as JSON on stdout.',
    '  --cwd <dir>              Directory to resolve from (default: cwd).',
    '',
    'Exit codes: 0 = done; 1 = refused; 2 = usage or error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {
    command: null, positional: [], json: false, cwd: null, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else opts.positional.push(arg);
  }
  return { opts };
}

function renderText(payload) {
  if (payload.ok === false) {
    return `error: ${payload.message}`;
  }
  if (payload.action === 'panel') {
    return payload.panel;
  }
  if (payload.action === 'bulk') {
    return payload.table;
  }
  return JSON.stringify(payload);
}

function render(payload, json) {
  process.stdout.write(json ? `${JSON.stringify(payload, null, 2)}\n` : `${renderText(payload)}\n`);
}

async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }
  const { opts } = parsed;
  if (opts.help || opts.command === null) {
    process.stdout.write(`${usage()}\n`);
    return opts.help ? 0 : 2;
  }

  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!pathExists(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    let payload;
    switch (opts.command) {
      case 'panel':
        if (!opts.positional[0]) {
          throw new ToolError('panel requires a change name');
        }
        payload = renderPanel(cwd, opts.positional[0]);
        break;
      case 'bulk':
        payload = await renderBulk(cwd);
        break;
      default:
        process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
        return 2;
    }
    render(payload, opts.json);
    return payload.ok ? 0 : 1;
  } catch (err) {
    if (err instanceof Refusal) {
      render({
        ok: false, action: opts.command, refused: true, reason: err.reason, message: err.message, ...err.extra,
      }, opts.json);
      return 1;
    }
    if (err instanceof ToolError) {
      process.stderr.write(`${err.message}\n`);
      return err.code;
    }
    process.stderr.write(`${err.message}\n`);
    return 2;
  }
}

// Execute when run directly
if (require.main === module) {
  (async () => {
    try {
      const code = await main(process.argv.slice(2));
      process.exit(code);
    } catch (err) {
      process.stderr.write(`${err.message}\n`);
      process.exit(2);
    }
  })();
}

module.exports = { renderPanel, renderBulk, parseArgs, detectArchived, hasNotApplicableHeading, countImplementationProgress, derivePanelCells };
