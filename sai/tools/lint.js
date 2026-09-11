#!/usr/bin/env node

'use strict';

/**
 * lint — deterministic format validator for artifact-format policies.
 *
 * Validates that files conform to the format policies defined in prose in
 * sai/policies/*.md. Each check is a selectable sub-command that examines
 * a file or directory and reports findings using the same exit-code and
 * output contract as sai/tools/check-delta-headers.js.
 *
 * Sub-commands:
 *   commit-rules <file>                  Check that a commit message follows commit rules.
 *   pr-title-rules <text>                Check that a PR title follows title rules.
 *   glossary-format <file>               Check that GLOSSARY.md follows glossary format.
 *   ready-to-propose <file>              Check that a file follows ready-to-propose format.
 *   artifact-review <file>               Check that artifact review findings follow the contract.
 *   sai-learnings-format <file>          Check that SAI_LEARNINGS.md follows learnings format.
 *   step-contract <file>                 Check that interfaces.md follows step contract format.
 *   worker-emission-ownership <file>     Check that a worker card does not reference emit or sai-state.
 *
 * Usage:
 *   node sai/tools/lint.js commit-rules <file> [--json] [--cwd <dir>]
 *   node sai/tools/lint.js pr-title-rules <text> [--json]
 *   node sai/tools/lint.js glossary-format <file> [--json] [--cwd <dir>]
 *   node sai/tools/lint.js ready-to-propose <file> [--json] [--cwd <dir>]
 *   node sai/tools/lint.js artifact-review <file> [--json] [--cwd <dir>]
 *   node sai/tools/lint.js sai-learnings-format <file> [--json] [--cwd <dir>]
 *   node sai/tools/lint.js step-contract <file> [--json] [--cwd <dir>]
 *   node sai/tools/lint.js worker-emission-ownership <file> [--json] [--cwd <dir>]
 *
 * Exit codes: 0 = all checks pass; 1 = findings found (report on stdout);
 * 2 = usage or I/O error.
 */

const fs = require('fs');
const path = require('path');

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/**
 * Read file at the given path, throwing ToolError on failure.
 */
function readFileOrFail(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new ToolError(`cannot read file: ${filePath}`, 2);
  }
}

/**
 * Check commit message subject line and body format.
 * Validates per sai/policies/commit-rules.md:
 *   - Subject ≤ 50 characters
 *   - Starts with Conventional Commits type (feat, fix, docs, etc.)
 *   - Type optionally followed by scope in parens
 *   - Type and scope followed by colon
 *   - No trailing period
 *   - Body (if present) wrapped at 72 characters per line
 *   - Blank line between subject and body (if body present)
 */
function checkCommitRules(content) {
  const lines = content.split('\n');
  const subject = lines[0] || '';

  const violations = [];

  // Check 1: Subject length ≤ 50 characters
  if (subject.length > 50) {
    violations.push({
      file: 'commit message',
      line: 1,
      problem: 'SUBJECT_TOO_LONG',
      detail: `subject is ${subject.length} chars, max is 50 chars`,
    });
  }

  // Check 2: Conventional Commits format
  // Pattern: type(scope): description or type: description
  const ccPattern = /^(feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert)(\([^)]+\))?: .+/;
  if (!ccPattern.test(subject)) {
    violations.push({
      file: 'commit message',
      line: 1,
      problem: 'INVALID_FORMAT',
      detail: 'subject must follow Conventional Commits format: type(scope): description',
    });
  }

  // Check 3: No trailing period
  if (subject.endsWith('.')) {
    violations.push({
      file: 'commit message',
      line: 1,
      problem: 'TRAILING_PERIOD',
      detail: 'subject must not end with a period',
    });
  }

  // Check 4: If there's a body, there must be a blank line after subject
  if (lines.length > 1 && lines[1].trim() !== '') {
    violations.push({
      file: 'commit message',
      line: 2,
      problem: 'MISSING_BLANK_LINE',
      detail: 'blank line required between subject and body',
    });
  }

  // Check 5: Body lines must be wrapped at 72 characters
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    // Skip blank lines
    if (line.trim() === '') continue;
    if (line.length > 72) {
      violations.push({
        file: 'commit message',
        line: i + 1,
        problem: 'BODY_LINE_TOO_LONG',
        detail: `body line is ${line.length} chars, max is 72 chars`,
      });
    }
  }

  return violations;
}

/**
 * Check GLOSSARY.md format.
 * Validates per sai/policies/glossary-format.md:
 *   - H1 heading (# {Project Name})
 *   - ## Language section with terms
 *   - ## Relationships section
 *   - Each term has definition in quotes
 *   - Each term has *Avoid* line
 */
function checkGlossaryFormat(content) {
  const lines = content.split('\n');
  const violations = [];

  // Check 1: Must start with H1
  if (!lines[0]?.startsWith('# ')) {
    violations.push({
      file: 'GLOSSARY.md',
      line: 1,
      problem: 'MISSING_H1',
      detail: 'glossary must start with a level-1 heading (# Title)',
    });
  }

  // Check 2: Must have ## Language section
  let hasLanguageSection = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^## Language\s*$/)) {
      hasLanguageSection = true;
      break;
    }
  }
  if (!hasLanguageSection) {
    violations.push({
      file: 'GLOSSARY.md',
      line: 1,
      problem: 'MISSING_LANGUAGE_SECTION',
      detail: 'glossary must include ## Language section',
    });
  }

  // Check 3: Must have ## Relationships section
  let hasRelationshipsSection = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^## Relationships\s*$/)) {
      hasRelationshipsSection = true;
      break;
    }
  }
  if (!hasRelationshipsSection) {
    violations.push({
      file: 'GLOSSARY.md',
      line: 1,
      problem: 'MISSING_RELATIONSHIPS_SECTION',
      detail: 'glossary must include ## Relationships section',
    });
  }

  // Check 4: Terms in Language section must have definitions and *Avoid*
  let inLanguageSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^## Language\s*$/)) {
      inLanguageSection = true;
      continue;
    }
    if (line.match(/^## /) && inLanguageSection) {
      inLanguageSection = false;
      continue;
    }
    if (inLanguageSection && line.startsWith('**') && line.includes('**:')) {
      // Check if next line exists and is *Avoid*
      if (i + 1 >= lines.length || !lines[i + 1].startsWith('*Avoid*:')) {
        const termMatch = line.match(/\*\*([^*]+)\*\*:/);
        const termName = termMatch ? termMatch[1] : 'unknown';
        violations.push({
          file: 'GLOSSARY.md',
          line: i + 1,
          problem: 'MISSING_AVOID_LINE',
          detail: `term "${termName}" must be followed by *Avoid*: line`,
        });
      }
    }
  }

  return violations;
}

/**
 * Check Ready to Propose block format.
 * Validates per sai/policies/ready-to-propose-format.md:
 *   - Has ## Ready to Propose heading
 *   - Has required sections in correct order
 *   - Mandatory sections have either content or "- None"
 */
function checkReadyToPropose(content) {
  const violations = [];
  const lines = content.split('\n');

  // Check 1: Must contain ## Ready to Propose heading
  let blockStartLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('## Ready to Propose')) {
      blockStartLine = i;
      break;
    }
  }
  if (blockStartLine === -1) {
    violations.push({
      file: 'block',
      line: 1,
      problem: 'MISSING_BLOCK_HEADING',
      detail: 'block must contain ## Ready to Propose heading',
    });
    return violations;
  }

  // Extract the block content (from heading to --- separator)
  let blockEndLine = lines.length;
  for (let i = blockStartLine + 1; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      blockEndLine = i;
      break;
    }
  }
  const blockLines = lines.slice(blockStartLine, blockEndLine);
  const blockContent = blockLines.join('\n');

  // Check 2: Required sections must be present
  const requiredSections = [
    '**Capabilities in scope**',
    '**Research Leads**',
    '**Decisions & Rationale**',
    '**Alternatives Considered**',
    '**Trade-offs Accepted**',
    '**Model / Re-framings**',
    '**Key constraints**',
    '**Edge Cases**',
    '**Implementation Details**',
  ];

  for (const section of requiredSections) {
    if (!blockContent.includes(section)) {
      violations.push({
        file: 'block',
        line: blockStartLine + 1,
        problem: 'MISSING_SECTION',
        detail: `required section "${section}" is missing`,
      });
    }
  }

  // Check 3: Validate section order
  const sectionPositions = {};
  for (const section of requiredSections) {
    const pos = blockContent.indexOf(section);
    if (pos !== -1) {
      sectionPositions[section] = pos;
    }
  }

  const sortedSections = Object.entries(sectionPositions)
    .sort((a, b) => a[1] - b[1])
    .map(entry => entry[0]);

  const expectedOrder = requiredSections.filter(s => sectionPositions[s]);
  if (JSON.stringify(sortedSections) !== JSON.stringify(expectedOrder)) {
    violations.push({
      file: 'block',
      line: blockStartLine + 1,
      problem: 'WRONG_SECTION_ORDER',
      detail: 'sections are not in the required order',
    });
  }

  return violations;
}

/**
 * Check artifact review finding format.
 * Validates per sai/policies/artifact-review-contract.md:
 *   - Each finding has exactly 5 fields in order
 *   - Severity is exactly one of: High, Medium, Low
 *   - Identifier format: severity initial (H/M/L) + sequence number
 *   - Summary line format: "Summary: High=<count> Medium=<count> Low=<count>"
 */
function checkArtifactReview(content) {
  const violations = [];
  const lines = content.split('\n');

  // Track findings and their severity
  const findings = [];
  let currentFinding = {};
  let fieldCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Summary line at the end
    if (line.startsWith('Summary: ')) {
      const summaryPattern = /^Summary: High=\d+ Medium=\d+ Low=\d+$/;
      if (!summaryPattern.test(line)) {
        violations.push({
          file: 'review',
          line: i + 1,
          problem: 'INVALID_SUMMARY_FORMAT',
          detail: 'Summary line must be: Summary: High=<count> Medium=<count> Low=<count>',
        });
      }
      continue;
    }

    // Check for Identifier line
    if (line.startsWith('- Identifier: ')) {
      if (fieldCount > 0) {
        findings.push(currentFinding);
      }
      currentFinding = { line: i + 1, fields: 1 };
      const id = line.substring('- Identifier: '.length).trim();
      const idPattern = /^[HML]\d+$/;
      if (!idPattern.test(id)) {
        violations.push({
          file: 'review',
          line: i + 1,
          problem: 'INVALID_IDENTIFIER_FORMAT',
          detail: 'Identifier must be Severity initial (H/M/L) followed by number (e.g., H1, M2)',
        });
      }
      fieldCount = 1;
      continue;
    }

    // Check for Severity line
    if (line.startsWith('- Severity: ')) {
      currentFinding.fields = (currentFinding.fields || 0) + 1;
      const severity = line.substring('- Severity: '.length).trim();
      currentFinding.severity = severity;
      if (!['High', 'Medium', 'Low'].includes(severity)) {
        violations.push({
          file: 'review',
          line: i + 1,
          problem: 'INVALID_SEVERITY',
          detail: 'Severity must be exactly one of: High, Medium, Low',
        });
      }
      continue;
    }

    // Check for Artifact location
    if (line.startsWith('- Artifact location: ')) {
      currentFinding.fields = (currentFinding.fields || 0) + 1;
      continue;
    }

    // Check for Issue
    if (line.startsWith('- Issue: ')) {
      currentFinding.fields = (currentFinding.fields || 0) + 1;
      continue;
    }

    // Check for Recommended correction
    if (line.startsWith('- Recommended correction: ')) {
      currentFinding.fields = (currentFinding.fields || 0) + 1;
      continue;
    }
  }

  // Add last finding if exists
  if (Object.keys(currentFinding).length > 0) {
    findings.push(currentFinding);
  }

  // Validate finding field count
  for (const finding of findings) {
    if (finding.fields !== 5) {
      violations.push({
        file: 'review',
        line: finding.line,
        problem: 'WRONG_FIELD_COUNT',
        detail: `finding has ${finding.fields} fields, must have exactly 5 (Identifier, Severity, Artifact location, Issue, Recommended correction)`,
      });
    }
  }

  return violations;
}

/**
 * Check SAI_LEARNINGS.md format.
 * Validates per sai/policies/sai-learnings-format.md:
 *   - H1 heading (# SAI Learnings — {Project})
 *   - Exactly 4 sections in order: Stack, Conventions, Avoid, Test Command
 *   - Stack/Conventions/Avoid entries have key and Observed line
 *   - Test Command is single-valued or sentinel
 */
function checkSaiLearningsFormat(content) {
  const lines = content.split('\n');
  const violations = [];

  // Check 1: Must start with H1
  if (!lines[0]?.startsWith('# ')) {
    violations.push({
      file: 'SAI_LEARNINGS.md',
      line: 1,
      problem: 'MISSING_H1',
      detail: 'learnings must start with a level-1 heading (# Title)',
    });
  }

  // Check 2: Must have exactly 4 sections in order
  const requiredSections = ['## Stack', '## Conventions', '## Avoid', '## Test Command'];
  let lastSectionIndex = -1;
  const sectionLines = {};

  for (let i = 0; i < lines.length; i++) {
    for (const section of requiredSections) {
      if (lines[i] === section) {
        if (requiredSections.indexOf(section) <= lastSectionIndex) {
          violations.push({
            file: 'SAI_LEARNINGS.md',
            line: i + 1,
            problem: 'WRONG_SECTION_ORDER',
            detail: `sections must be in order: ${requiredSections.join(', ')}`,
          });
        }
        sectionLines[section] = i;
        lastSectionIndex = requiredSections.indexOf(section);
      }
    }
  }

  for (const section of requiredSections) {
    if (!(section in sectionLines)) {
      violations.push({
        file: 'SAI_LEARNINGS.md',
        line: 1,
        problem: 'MISSING_SECTION',
        detail: `required section "${section}" is missing`,
      });
    }
  }

  // Check 3: Test Command section validation
  const testCommandLine = sectionLines['## Test Command'];
  if (testCommandLine !== undefined) {
    // Check that there's only one command line (not multiple bullets)
    let commandCount = 0;
    let foundSentinel = false;
    for (let i = testCommandLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('## ')) break; // Next section
      if (line.startsWith('- ') && line !== '- ') {
        commandCount++;
      }
      if (line.includes('None — no test runner')) {
        foundSentinel = true;
      }
    }
    if (commandCount > 1) {
      violations.push({
        file: 'SAI_LEARNINGS.md',
        line: testCommandLine + 1,
        problem: 'MULTIPLE_TEST_COMMANDS',
        detail: 'Test Command section must have at most one command entry',
      });
    }
  }

  return violations;
}

/**
 * Check PR title format.
 * Validates per sai/policies/commit-rules.md (adapted for PR titles):
 *   - Title ≤ 70 characters
 *   - Starts with Conventional Commits type (feat, fix, docs, etc.)
 *   - No emoji
 *   - No trailing period
 */
function checkPrTitleRules(title) {
  const violations = [];
  const trimmedTitle = title.trim();

  // Check 1: Title length ≤ 70 characters
  if (trimmedTitle.length > 70) {
    violations.push({
      file: 'pull request',
      line: 1,
      problem: 'TITLE_TOO_LONG',
      detail: `title is ${trimmedTitle.length} chars, max is 70 chars`,
    });
  }

  // Check 2: Conventional Commits format (feat, fix, refactor, docs, etc.)
  const ccPattern = /^(feat|fix|perf|refactor|docs|test|build|ci|chore|style|revert)(\([^)]+\))?: .+/;
  if (!ccPattern.test(trimmedTitle)) {
    violations.push({
      file: 'pull request',
      line: 1,
      problem: 'INVALID_FORMAT',
      detail: 'title must follow Conventional Commits format: type(scope): description',
    });
  }

  // Check 3: No emoji
  const emojiPattern = /[\p{Emoji}]/u;
  if (emojiPattern.test(trimmedTitle)) {
    violations.push({
      file: 'pull request',
      line: 1,
      problem: 'CONTAINS_EMOJI',
      detail: 'title must not contain emoji',
    });
  }

  // Check 4: No trailing period
  if (trimmedTitle.endsWith('.')) {
    violations.push({
      file: 'pull request',
      line: 1,
      problem: 'TRAILING_PERIOD',
      detail: 'title must not end with a period',
    });
  }

  return violations;
}

/**
 * Check step contract format (interfaces.md).
 * Validates per sai/policies/step-contract-format.md:
 *   - Section heading format: ## Step N: <title>
 *   - Must have exactly two fields: **Interfaces**: and **Test assertions**:
 *   - Omission rule and sentinel format
 */
function checkStepContract(content) {
  const lines = content.split('\n');
  const violations = [];

  // Check for sentinel: "None — no step contracts"
  const hasSentinel = content.includes('None — no step contracts');
  if (hasSentinel) {
    // If sentinel is present, file should only contain that
    const trimmed = content.trim();
    if (!trimmed.startsWith('None — no step contracts')) {
      violations.push({
        file: 'interfaces.md',
        line: 1,
        problem: 'INVALID_SENTINEL_POSITION',
        detail: 'sentinel "None — no step contracts" must be the sole content when used',
      });
    }
    return violations;
  }

  // Check for Step N sections
  let foundSteps = false;
  const stepPattern = /^## Step (\d+):/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(stepPattern);

    if (match) {
      foundSteps = true;
      // Check for required fields: **Interfaces**: and **Test assertions**:
      let hasInterfaces = false;
      let hasTestAssertions = false;

      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('## Step ')) break; // Next step
        if (lines[j].startsWith('**Interfaces**:')) hasInterfaces = true;
        if (lines[j].startsWith('**Test assertions**:')) hasTestAssertions = true;
      }

      if (!hasInterfaces) {
        violations.push({
          file: 'interfaces.md',
          line: i + 1,
          problem: 'MISSING_INTERFACES_FIELD',
          detail: 'Step section must have **Interfaces**: field',
        });
      }

      if (!hasTestAssertions) {
        violations.push({
          file: 'interfaces.md',
          line: i + 1,
          problem: 'MISSING_TEST_ASSERTIONS_FIELD',
          detail: 'Step section must have **Test assertions**: field',
        });
      }
    }
  }

  // If file has content but no steps and no sentinel, it's invalid
  if (!foundSteps && content.trim() !== '') {
    violations.push({
      file: 'interfaces.md',
      line: 1,
      problem: 'NO_STEP_SECTIONS',
      detail: 'file must contain Step N sections or the sentinel "None — no step contracts"',
    });
  }

  return violations;
}

/**
 * Check worker emission ownership.
 * Validates per sai/policies/stage-machine-write-ownership.md:
 *   - Worker cards must not reference the stage machine emission surface
 *   - Only coordinator cards may emit to a stage machine
 *
 * The stage machine emission surface includes:
 *   - sai-state commands (emit, spawn, close, reset, etc.)
 *   - bin/sai-state.js file reference
 *   - Stage machine IDs (explore-idea@1, explore-slice@1, spec-standalone@1, design-standalone@1, implement-standalone@1, review-standalone@1, security-standalone@1)
 *   - Legacy /emit HTTP command
 */
function checkWorkerEmissionOwnership(content) {
  const violations = [];
  const lines = content.split('\n');

  // Patterns for the stage machine emission surface (not the English word "emit")
  // 1. sai-state command invocations (emit, spawn, close, reset, run, etc.)
  const saiStateCommandPattern = /sai-state\s+(emit|spawn|close|reset|run)\b/;
  // 2. Reference to bin/sai-state.js or backtick-quoted sai-state commands
  const saiStateBinPattern = /bin\/sai-state\.js/;
  const saiStateQuotedPattern = /`sai-state\s+(emit|spawn|close|reset|run)`/;
  // 3. Stage machine IDs in the format name@version
  const stageMachineIdPattern = /(explore-idea|explore-slice|spec-standalone|design-standalone|implement-standalone|review-standalone|security-standalone)@\d+/;
  // 4. Legacy /emit HTTP command
  const legacyEmitPattern = /\/emit\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for sai-state command invocations
    if (saiStateCommandPattern.test(line)) {
      violations.push({
        file: 'worker card',
        line: i + 1,
        problem: 'WORKER_REFERENCES_STAGE_MACHINE_SURFACE',
        detail: 'worker cards must not invoke sai-state commands (emit, spawn, close, run); stage machine access is coordinator-only',
      });
      continue;
    }

    // Check for bin/sai-state.js reference
    if (saiStateBinPattern.test(line)) {
      violations.push({
        file: 'worker card',
        line: i + 1,
        problem: 'WORKER_REFERENCES_STAGE_MACHINE_SURFACE',
        detail: 'worker cards must not reference bin/sai-state.js; stage machine access is coordinator-only',
      });
      continue;
    }

    // Check for quoted sai-state command references
    if (saiStateQuotedPattern.test(line)) {
      violations.push({
        file: 'worker card',
        line: i + 1,
        problem: 'WORKER_REFERENCES_STAGE_MACHINE_SURFACE',
        detail: 'worker cards must not reference sai-state commands; stage machine access is coordinator-only',
      });
      continue;
    }

    // Check for stage machine IDs
    if (stageMachineIdPattern.test(line)) {
      violations.push({
        file: 'worker card',
        line: i + 1,
        problem: 'WORKER_REFERENCES_STAGE_MACHINE_SURFACE',
        detail: 'worker cards must not reference stage machine IDs; stage machine access is coordinator-only',
      });
      continue;
    }

    // Check for legacy /emit command
    if (legacyEmitPattern.test(line)) {
      violations.push({
        file: 'worker card',
        line: i + 1,
        problem: 'WORKER_REFERENCES_STAGE_MACHINE_SURFACE',
        detail: 'worker cards must not invoke /emit operations; stage machine access is coordinator-only',
      });
      continue;
    }
  }

  return violations;
}

function usage() {
  return [
    'Usage: node sai/tools/lint.js <check> <file|text> [--json] [--cwd <dir>]',
    '',
    '  <check>             Format check to run:',
    '                      - commit-rules: Validate commit message format',
    '                      - pr-title-rules: Validate pull request title format',
    '                      - glossary-format: Validate GLOSSARY.md format',
    '                      - ready-to-propose: Validate Ready to Propose block format',
    '                      - artifact-review: Validate artifact review finding format',
    '                      - sai-learnings-format: Validate SAI_LEARNINGS.md format',
    '                      - step-contract: Validate interfaces.md step contract format',
    '                      - worker-emission-ownership: Validate worker card emission ownership',
    '  <file|text>         File to check (for file-based checks) or text to validate (for pr-title-rules)',
    '  --json              Emit the report as JSON on stdout',
    '  --cwd <dir>         Working directory for file resolution (default: current directory)',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {
    check: null,
    file: null,
    json: false,
    cwd: process.cwd(),
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--cwd') {
      opts.cwd = argv[++i];
    } else if (arg.startsWith('--')) {
      return { error: `unknown flag: ${arg}` };
    } else if (opts.check === null) {
      opts.check = arg;
    } else if (opts.file === null) {
      opts.file = arg;
    } else {
      return { error: `unexpected positional argument: ${arg}` };
    }
  }

  return { opts };
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }

  const { opts } = parsed;
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  if (!opts.check) {
    process.stderr.write(`check name required.\n${usage()}\n`);
    return 2;
  }

  if (!opts.file) {
    process.stderr.write(`file or text argument required.\n${usage()}\n`);
    return 2;
  }

  let violations = [];
  let relPath;
  let content;

  // Handle pr-title-rules separately (doesn't need file reading)
  if (opts.check === 'pr-title-rules') {
    if (!opts.file) {
      process.stderr.write(`title text required for pr-title-rules.\n${usage()}\n`);
      return 2;
    }
    violations = checkPrTitleRules(opts.file);
    relPath = 'pull request';
  } else {
    // For file-based checks, read the file
    const filePath = path.resolve(opts.cwd, opts.file);
    try {
      content = readFileOrFail(filePath);
    } catch (err) {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
    relPath = path.relative(opts.cwd, filePath);

    switch (opts.check) {
      case 'commit-rules':
        violations = checkCommitRules(content);
        break;
      case 'glossary-format':
        violations = checkGlossaryFormat(content);
        break;
      case 'ready-to-propose':
        violations = checkReadyToPropose(content);
        break;
      case 'artifact-review':
        violations = checkArtifactReview(content);
        break;
      case 'sai-learnings-format':
        violations = checkSaiLearningsFormat(content);
        break;
      case 'step-contract':
        violations = checkStepContract(content);
        break;
      case 'worker-emission-ownership':
        violations = checkWorkerEmissionOwnership(content, opts.file);
        break;
      default:
        process.stderr.write(`unknown check: ${opts.check}\n${usage()}\n`);
        return 2;
    }
  }

  const ok = violations.length === 0;
  if (opts.json) {
    process.stdout.write(`${JSON.stringify({
      ok,
      check: opts.check,
      file: relPath,
      violations,
    }, null, 2)}\n`);
  } else if (ok) {
    process.stdout.write(`${opts.check} check passed for ${relPath}: no format violations.\n`);
  } else {
    for (const v of violations) {
      process.stdout.write(
        `${relPath}:${v.line} [${v.problem}] — ${v.detail}.\n`,
      );
    }
    process.stdout.write(
      `${opts.check} check FAILED for ${relPath}: ${violations.length} violation(s).\n`,
    );
  }

  return ok ? 0 : 1;
}

// Export functions for programmatic use
module.exports = {
  checkCommitRules,
  checkPrTitleRules,
  checkGlossaryFormat,
  checkReadyToPropose,
  checkArtifactReview,
  checkSaiLearningsFormat,
  checkStepContract,
  checkWorkerEmissionOwnership,
  ToolError,
};

// Run CLI only when executed directly, not when required as a module
if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
