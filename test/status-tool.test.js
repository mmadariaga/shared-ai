'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'status.js');
const { derivePanelCells } = require('../sai/tools/status.js');
const { readOpenspecYaml, ToolError } = require('../sai/tools/openspec-yaml.js');

function tool(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { cwd, encoding: 'utf8' });
  let payload = null;
  if (result.stdout.trim()) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      return { status: result.status, payload: null, stderr: result.stderr, stdout: result.stdout };
    }
  }
  return { status: result.status, payload, stderr: result.stderr };
}

function toolText(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args, '--cwd', cwd], { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function makeTestOpenspec() {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-status-'));
  const cwd = parent;

  // Create openspec structure
  fs.mkdirSync(path.join(cwd, 'openspec', 'changes'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'openspec', 'changes', 'archive'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'openspec', 'specs'), { recursive: true });

  // Create minimal config
  fs.writeFileSync(path.join(cwd, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');

  return { parent, cwd };
}

function cleanup(parent) {
  fs.rmSync(parent, { recursive: true, force: true });
}

test('status tool requires a sub-command', () => {
  const result = tool([], REPO_ROOT);
  assert.equal(result.status, 2);
});

test('status tool panel sub-command requires a change name', () => {
  const result = tool(['panel'], REPO_ROOT);
  assert.equal(result.status, 2);
});

test('status tool panel with non-existent change exits non-zero', () => {
  const { cwd, parent } = makeTestOpenspec();
  try {
    const result = tool(['panel', 'nonexistent-change'], cwd);
    assert.ok(result.status !== 0);
  } finally {
    cleanup(parent);
  }
});

test('status tool has correct usage output', () => {
  const result = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node/);
  assert.match(result.stdout, /panel <name>/);
  assert.match(result.stdout, /bulk/);
});

test('parseArgs correctly parses command and flags', () => {
  const { parseArgs } = require('../sai/tools/status.js');
  const { opts } = parseArgs(['panel', 'my-change', '--json', '--cwd', '/some/dir']);
  assert.equal(opts.command, 'panel');
  assert.equal(opts.positional[0], 'my-change');
  assert.equal(opts.json, true);
  assert.equal(opts.cwd, '/some/dir');
});

test('parseArgs rejects unknown flags', () => {
  const { parseArgs } = require('../sai/tools/status.js');
  const result = parseArgs(['panel', '--unknown-flag']);
  assert.ok(result.error);
  assert.match(result.error, /unknown flag/);
});

test('E1: archived change detected with date parse and no CLI call', () => {
  const { cwd, parent } = makeTestOpenspec();
  try {
    const archiveDir = path.join(cwd, 'openspec', 'changes', 'archive', '2024-03-15-archived-change');
    fs.mkdirSync(archiveDir, { recursive: true });

    const result = toolText(['panel', 'archived-change'], cwd);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /archived/i);
    assert.match(result.stdout, /2024-03-15/);
  } finally {
    cleanup(parent);
  }
});

test('E2a: absent .openspec.yaml is normal state (returns null)', () => {
  const { cwd, parent } = makeTestOpenspec();
  try {
    const yamlPath = path.join(cwd, 'nonexistent.yaml');
    const result = readOpenspecYaml(yamlPath);
    assert.equal(result, null);
  } finally {
    cleanup(parent);
  }
});

test('E2b: unreadable .openspec.yaml throws ToolError with exit code 2', () => {
  const { cwd, parent } = makeTestOpenspec();
  try {
    // Use a directory path to provoke EISDIR on all platforms
    const yamlPath = path.join(cwd, 'directory-not-file');
    fs.mkdirSync(yamlPath, { recursive: true });

    let thrownError = null;
    try {
      readOpenspecYaml(yamlPath);
      assert.fail('readOpenspecYaml should have thrown ToolError');
    } catch (err) {
      thrownError = err;
    }

    assert.ok(thrownError instanceof ToolError, 'should throw ToolError');
    assert.equal(thrownError.code, 2, 'ToolError should have exit code 2');
  } finally {
    cleanup(parent);
  }
});

test('E3a: overview conjunction - present when state current AND file done', () => {
  const statuses = {
    'change-overview': { present: true, status: 'done' },
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    review: { present: true },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: true },
  };
  const yaml = { overview_state: 'current', backfilled: false, approval_specs_approved_at: '2024-01-01' };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.overviewCell, '●');
});

test('E3b: overview conjunction - problem state stale', () => {
  const statuses = {
    'change-overview': { present: true, status: 'done' },
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    review: { present: true },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: true },
  };
  const yaml = { overview_state: 'stale', backfilled: false };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.overviewCell, '!');
});

test('E3c: overview conjunction - problem state current but file absent', () => {
  const statuses = {
    'change-overview': { present: false, status: 'blocked' },
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    review: { present: true },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: true },
  };
  const yaml = { overview_state: 'current', backfilled: false };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.overviewCell, '!');
});

test('E3d: overview conjunction - expected unmaterialized state', () => {
  const statuses = {
    'change-overview': { present: false, status: 'blocked' },
    specs: { present: true },
    design: { present: false },
    tasks: { present: false },
    implementation: { present: false },
    proposal: { present: true },
    interfaces: { present: false },
    review: { present: false },
    security: { present: false },
    performance: { present: false },
    accessibility: { present: false },
  };
  const yaml = { overview_state: 'unmaterialized', backfilled: false };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.overviewCell, '·');
});

test('E4: backfilled:true renders overview cell as N/A', () => {
  const statuses = {
    'change-overview': { present: false },
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    review: { present: true },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: true },
  };
  const yamlBackfilled = { backfilled: true };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yamlBackfilled, auditFlags, '', false);
  assert.equal(result.overviewCell, 'N/A');

  // Also test backfilled false doesn't force N/A
  const yamlNotBackfilled = { backfilled: false, overview_state: 'unmaterialized' };
  const result2 = derivePanelCells(statuses, yamlNotBackfilled, auditFlags, '', false);
  assert.equal(result2.overviewCell, '·');
});

test('E5: exact "## Not Applicable" heading match is case-sensitive', () => {
  const { hasNotApplicableHeading } = require('../sai/tools/status.js');
  const { cwd, parent } = makeTestOpenspec();
  try {
    const auditFile = path.join(cwd, 'review.md');

    // Exact match
    fs.writeFileSync(auditFile, '# Review\n\n## Not Applicable\n\nText here.');
    assert.equal(hasNotApplicableHeading(auditFile), true);

    // Wrong case
    fs.writeFileSync(auditFile, '# Review\n\n## not applicable\n\nText here.');
    assert.equal(hasNotApplicableHeading(auditFile), false);

    // No space after ##
    fs.writeFileSync(auditFile, '# Review\n\n##Not Applicable\n\nText here.');
    assert.equal(hasNotApplicableHeading(auditFile), false);
  } finally {
    cleanup(parent);
  }
});

test('E6: absent interfaces renders as absent with no warning', () => {
  const statuses = {
    interfaces: { present: false },
    'change-overview': { present: false },
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    review: { present: true },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: true },
  };
  const yaml = { backfilled: false };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.cells.interfaces, '·');
  assert.ok(!result.cells.interfaces.includes('!'), 'absent interfaces should not have warning marker');
});

test('E7: implementation.md absent leaves cell empty, present counts checkboxes', () => {
  const { countImplementationProgress } = require('../sai/tools/status.js');
  const { cwd, parent } = makeTestOpenspec();
  try {
    // Absent
    const result1 = countImplementationProgress(path.join(cwd, 'nonexistent.md'));
    assert.equal(result1, '');

    // Present with checkboxes
    const file1 = path.join(cwd, 'impl1.md');
    fs.writeFileSync(file1, '- [x] Task 1\n- [x] Task 2\n- [ ] Task 3\n');
    const result2 = countImplementationProgress(file1);
    assert.equal(result2, '2/3');

    // Present without checkboxes
    const file2 = path.join(cwd, 'impl2.md');
    fs.writeFileSync(file2, 'No checkboxes here.');
    const result3 = countImplementationProgress(file2);
    assert.equal(result3, '');
  } finally {
    cleanup(parent);
  }
});

test('E8a: Next resolves to /sai-1-spec when specs absent', () => {
  const statuses = {
    specs: { present: false },
    design: { present: false },
    tasks: { present: false },
    implementation: { present: false },
    proposal: { present: true },
    interfaces: { present: false },
    'change-overview': { present: false },
    review: { present: false },
    security: { present: false },
    performance: { present: false },
    accessibility: { present: false },
  };
  const yaml = null;
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.next, '/sai-1-spec');
});

test('E8b: Next resolves to /sai-2-design when specs present but not approved', () => {
  const statuses = {
    specs: { present: true },
    design: { present: false },
    tasks: { present: false },
    implementation: { present: false },
    proposal: { present: true },
    interfaces: { present: false },
    'change-overview': { present: false },
    review: { present: false },
    security: { present: false },
    performance: { present: false },
    accessibility: { present: false },
  };
  const yaml = { approval_specs_approved_at: null };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.next, '/sai-2-design');
});

test('E8c: Next resolves to /sai-3-implement when design+tasks present but implementation absent', () => {
  const statuses = {
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: false },
    proposal: { present: true },
    interfaces: { present: true },
    'change-overview': { present: true },
    review: { present: false },
    security: { present: false },
    performance: { present: false },
    accessibility: { present: false },
  };
  const yaml = { approval_specs_approved_at: '2024-01-01', overview_state: 'current' };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '', false);
  assert.equal(result.next, '/sai-3-implement');
});

test('E8d: Next resolves to /sai-4-apply when implementation incomplete', () => {
  const statuses = {
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    'change-overview': { present: true },
    review: { present: false },
    security: { present: false },
    performance: { present: false },
    accessibility: { present: false },
  };
  const yaml = { approval_specs_approved_at: '2024-01-01', overview_state: 'current' };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '1/3', true);
  assert.equal(result.next, '/sai-4-apply');
});

test('E8e: Next resolves to /sai-5-review when audits missing', () => {
  const statuses = {
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    'change-overview': { present: true },
    review: { present: false },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: true },
  };
  const yaml = { approval_specs_approved_at: '2024-01-01', overview_state: 'current' };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '3/3', true);
  assert.equal(result.next, '/sai-5-review');
});

test('E8f: Next resolves to /sai-pr when all audits present', () => {
  const statuses = {
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    'change-overview': { present: true },
    review: { present: true },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: true },
  };
  const yaml = { approval_specs_approved_at: '2024-01-01', overview_state: 'current' };
  const auditFlags = { review: false, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '3/3', true);
  assert.equal(result.next, '/sai-pr');
});

test('E8g: N/A audits count as satisfied', () => {
  const statuses = {
    specs: { present: true },
    design: { present: true },
    tasks: { present: true },
    implementation: { present: true },
    proposal: { present: true },
    interfaces: { present: true },
    'change-overview': { present: true },
    review: { present: true },
    security: { present: true },
    performance: { present: true },
    accessibility: { present: false },
  };
  const yaml = { approval_specs_approved_at: '2024-01-01', overview_state: 'current' };
  const auditFlags = { review: true, security: false, performance: false, accessibility: false };

  const result = derivePanelCells(statuses, yaml, auditFlags, '3/3', true);
  assert.equal(result.cells.review, 'N/A');
  assert.equal(result.next, '/sai-8-accessibility');
});

test('E9: bulk mode handles partial failure with degraded row', async () => {
  const { renderBulk } = require('../sai/tools/status.js');
  const { cwd, parent } = makeTestOpenspec();
  try {
    // Create three dummy changes
    fs.mkdirSync(path.join(cwd, 'openspec', 'changes', 'change-1'), { recursive: true });
    fs.mkdirSync(path.join(cwd, 'openspec', 'changes', 'change-2'), { recursive: true });
    fs.mkdirSync(path.join(cwd, 'openspec', 'changes', 'change-3'), { recursive: true });

    // Mock gather function that fails for change-2 only
    async function mockGather(cwdParam, changeName) {
      if (changeName === 'change-2') {
        return { error: 'simulated gather failure' };
      }
      // Success for others: return valid minimal status data
      return {
        data: {
          artifacts: [
            { name: 'proposal', status: 'blocked' },
            { name: 'specs', status: 'blocked' },
            { name: 'design', status: 'blocked' },
            { name: 'tasks', status: 'blocked' },
            { name: 'interfaces', status: 'blocked' },
            { name: 'change-overview', status: 'blocked' },
            { name: 'implementation', status: 'blocked' },
            { name: 'review', status: 'blocked' },
            { name: 'security', status: 'blocked' },
            { name: 'performance', status: 'blocked' },
            { name: 'accessibility', status: 'blocked' },
          ],
        },
      };
    }

    // Mock list function that returns all three changes
    async function mockList(cwdParam) {
      return ['change-1', 'change-2', 'change-3'];
    }

    // Call renderBulk with both injectable functions
    const result = await renderBulk(cwd, mockGather, mockList);

    // Verify the result structure
    assert.equal(result.ok, true, 'should return ok=true');
    assert.equal(result.action, 'bulk', 'should have action=bulk');
    assert.equal(result.rows.length, 3, 'should have 3 rows (one per change)');

    // Verify degraded row for the failing change
    const failedRow = result.rows.find(r => r.change === 'change-2');
    assert.ok(failedRow, 'change-2 should appear in rows');
    assert.equal(failedRow.error, true, 'change-2 row should have error flag');
    assert.equal(failedRow.message, 'simulated gather failure', 'error message should be preserved');

    // Verify successful rows still render normally
    const row1 = result.rows.find(r => r.change === 'change-1');
    assert.ok(row1 && !row1.error, 'change-1 should render successfully without error');
    assert.ok(row1.cells, 'change-1 should have cells object');
    assert.ok(row1.next, 'change-1 should have next hint');

    const row3 = result.rows.find(r => r.change === 'change-3');
    assert.ok(row3 && !row3.error, 'change-3 should render successfully without error');
    assert.ok(row3.cells, 'change-3 should have cells object');
    assert.ok(row3.next, 'change-3 should have next hint');

    // Verify the table text reflects both normal and error rows
    assert.ok(result.table.includes('change-1'), 'table should include change-1');
    assert.ok(result.table.includes('change-2'), 'table should include change-2');
    assert.ok(result.table.includes('change-3'), 'table should include change-3');
    assert.ok(result.table.includes('ERROR'), 'table should show ERROR marker for degraded row');
  } finally {
    cleanup(parent);
  }
});
