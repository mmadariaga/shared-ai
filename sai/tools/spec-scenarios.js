'use strict';

/**
 * spec-scenarios — the shared reader of requirement and `#### Scenario:`
 * structure in OpenSpec spec files.
 *
 * `check-delta-headers.js` (header and scenario preservation checks) and
 * `scenario-coverage.js` (scenario-to-test coverage) require it, so the two
 * tools read specs by one definition. Fenced code is never specification
 * structure, and a heading that is neither a conventional requirement nor an
 * exact `#### Scenario: <title>` line marks its requirement invalid.
 *
 * Exported as a module for require() by other tools.
 */

const fs = require('fs');

const SECTION_RE = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/;
const ANY_H2_RE = /^##\s+/;
const REQUIREMENT_PREFIX = '### Requirement:';
const SCENARIO_RE = /^#### Scenario: (\S(?:.*\S)?)\s*$/;

// Examples in fenced code are not specification structure. Preserve line numbers.
function structuralLines(content) {
  let fence = null;
  const lines = content.split('\n').map((raw) => {
    const line = raw.replace(/\r$/, '');
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker && !fence) { fence = marker[1]; return ''; }
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
      return '';
    }
    return line;
  });
  if (fence) throw new Error('unterminated fenced code block');
  return lines;
}

/**
 * Extract the verbatim requirement name from a source line, or null when the
 * line is not a requirement heading. Strips exactly one leading separator
 * space/tab and trailing line whitespace; everything else is byte-exact.
 */
function extractRequirementName(line) {
  if (!line.startsWith(REQUIREMENT_PREFIX)) return null;
  let name = line.slice(REQUIREMENT_PREFIX.length);
  if (name.startsWith(' ') || name.startsWith('\t')) name = name.slice(1);
  return name.replace(/[\r\t ]+$/, '');
}

function collectScenarioRequirements(content) {
  const requirements = new Map();
  let current = null;
  for (const line of structuralLines(content)) {
    const name = extractRequirementName(line);
    if (name !== null) {
      current = { scenarios: new Set(), invalid: !name || requirements.has(name) };
      if (requirements.has(name)) current.invalid = true;
      requirements.set(name, current);
    } else if (current && /^#{1,6}\s+Scenario\b/.test(line) && !/^#### Scenario: /.test(line)) {
      current.invalid = true;
    } else if (/^#{1,3}\s/.test(line)) {
      current = null;
    } else if (current && /^####\s/.test(line)) {
      const scenario = line.match(SCENARIO_RE);
      if (!scenario || current.scenarios.has(scenario[1])) current.invalid = true;
      else current.scenarios.add(scenario[1]);
    }
  }
  return requirements;
}

/**
 * Collect every scenario of a spec with its requirement and body, in file
 * order, as `{section, requirement, title, body}`. The body is the scenario's
 * non-empty lines, trimmed, so a whitespace-only edit is not a difference.
 *
 * `delta: true` reads a delta spec: only scenarios under an ADDED, MODIFIED,
 * REMOVED, or RENAMED section count, and `section` names it. `delta: false`
 * reads a main spec: every scenario under a requirement counts and `section`
 * is null.
 */
function collectScenarios(content, { delta }) {
  const structural = structuralLines(content);
  const raw = content.split('\n').map((line) => line.replace(/\r$/, ''));
  const out = [];
  let section = null;
  let requirement = null;
  let scenario = null;
  const close = () => {
    if (scenario) {
      out.push({
        section: scenario.section,
        requirement: scenario.requirement,
        title: scenario.title,
        body: scenario.lines.map((line) => line.trim()).filter(Boolean).join('\n'),
      });
    }
    scenario = null;
  };
  for (let i = 0; i < structural.length; i++) {
    const line = structural[i];
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) { close(); section = sectionMatch[1]; requirement = null; continue; }
    if (ANY_H2_RE.test(line)) { close(); section = null; requirement = null; continue; }
    const name = extractRequirementName(line);
    if (name !== null) { close(); requirement = name; continue; }
    const titled = line.match(SCENARIO_RE);
    if (titled) {
      close();
      if (requirement !== null && (!delta || section !== null)) {
        scenario = { section: delta ? section : null, requirement, title: titled[1], lines: [] };
      }
      continue;
    }
    if (/^#{1,6}\s/.test(line)) { close(); continue; }
    if (scenario) scenario.lines.push(raw[i]);
  }
  close();
  return out;
}

function readSpec(file) {
  return new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
}

module.exports = {
  SECTION_RE,
  ANY_H2_RE,
  REQUIREMENT_PREFIX,
  structuralLines,
  extractRequirementName,
  collectScenarioRequirements,
  collectScenarios,
  readSpec,
};
