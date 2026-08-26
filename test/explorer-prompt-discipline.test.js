'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function walkDir(dirPath, ext = '.md') {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(repoRoot, fullPath);

    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      files.push(relPath);
    }
  }

  return files;
}

test('explorer spawn prompts across sai/ must not prescribe research tools or procedures', () => {
  // Sweep all markdown files in sai/ to detect prescriptive tool/procedure language in explorer spawns
  // I12: A test sweeps `sai/` and fails when an explorer spawn prompt names a research tool
  const saiFiles = walkDir(path.join(repoRoot, 'sai'));

  const violations = [];

  for (const filePath of saiFiles) {
    const content = read(filePath);

    // Find sections that delegate to budget-explorer or describe explorer spawns
    // Look for patterns like "Delegate ... budget-explorer" or "subagent (lookup task"
    const explorerSpawnMatch = content.match(
      /Delegate[^.]*?budget-explorer[^.]*?\.[\s\S]{0,500}?(?:>[\s\S]*?)(?=\n\n|$)/i
    );

    if (!explorerSpawnMatch) {
      continue; // Skip files without explorer spawn context
    }

    const spawnContext = explorerSpawnMatch[0];

    // Check for prescriptive patterns in the spawn context
    // Patterns that indicate tool/procedure prescriptions:
    const prescriptivePatterns = [
      { pattern: /^>\s*1\.\s+(?:Glob|Read|Grep|Search|Look)\b/m, reason: 'numbered procedure steps' },
      { pattern: /^>\s*2\.\s+(?:Glob|Read|Grep|Search|Look)\b/m, reason: 'numbered procedure steps' },
      { pattern: /^>\s*3\.\s+(?:Return|Output)\b/m, reason: 'numbered procedure steps' },
      { pattern: />\s+(?:run|execute|use|call)\s+(?:Glob|Grep|Read|WebFetch)\s+to/i, reason: 'tool prescription' },
      { pattern: />\s+1\.\s+Glob.*\n>\s+2\.\s+Read/m, reason: 'procedure prescription' },
    ];

    for (const { pattern, reason } of prescriptivePatterns) {
      if (pattern.test(spawnContext)) {
        violations.push({
          file: filePath,
          reason,
          excerpt: spawnContext.substring(0, 150).replace(/\n/g, ' '),
        });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Explorer spawn prompts must not prescribe tools or procedures. Violations:\n${
      violations.map(v => `  ${v.file}: ${v.reason}\n    ${v.excerpt}...`).join('\n')
    }`
  );
});

test('budget-explorer agent has required tools for ladder levels', () => {
  const agentFile = read('agents/claude/budget-explorer.md');

  // Check for Bash tool
  assert.match(
    agentFile,
    /tools:.*\bBash\b/,
    'budget-explorer must have Bash tool for git grep and codegraph CLI access'
  );

  // Check for codegraph MCP tool
  assert.match(
    agentFile,
    /tools:.*\bmcp__codegraph__codegraph_explore\b/,
    'budget-explorer must have mcp__codegraph__codegraph_explore tool for structural queries'
  );
});

test('explore-agent policy defines ladder logging and shell restrictions', () => {
  const policy = read('sai/policies/explore-agent.md');

  assert.match(
    policy,
    /ladder_discards/,
    'explore-agent policy must define ladder_discards field for logging skipped levels'
  );

  assert.match(
    policy,
    /Ladder level discard logging/,
    'explore-agent policy must have explicit "Ladder level discard logging" section'
  );

  assert.match(
    policy,
    /Shell restriction/,
    'explore-agent policy must have explicit "Shell restriction" section'
  );

  assert.match(
    policy,
    /Ladder precedence/,
    'explore-agent policy must have explicit "Ladder precedence" section'
  );

  assert.match(
    policy,
    /caller prescribed/,
    'explore-agent policy must mention log reason for caller prescriptions'
  );

  assert.match(
    policy,
    /Decision-record index/,
    'explore-agent policy must have explicit "Decision-record index" section describing ADR/DDR indexes as research inputs'
  );

  assert.match(
    policy,
    /docs\/adr\/0000-INDEX\.md/,
    'explore-agent policy must name the ADR index path'
  );

  assert.match(
    policy,
    /docs\/ddr\/0000-INDEX\.md/,
    'explore-agent policy must name the DDR index path'
  );

  assert.match(
    policy,
    /canonical.*five-section skeleton/i,
    'explore-agent policy must describe the five-section skeleton structure'
  );

  assert.match(
    policy,
    /relationship.*token/i,
    'explore-agent policy must document relationship tokens'
  );

  assert.match(
    policy,
    /current.*vs.*historical|historical.*separation/i,
    'explore-agent policy must explain current versus historical separation in indexes'
  );
});
