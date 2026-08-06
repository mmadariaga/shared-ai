'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function recoverySection(instruction) {
  const start = instruction.search(/^### Known-False Report Recovery\b/im);
  assert.ok(start >= 0, 'apply instruction should define bounded report recovery');
  return instruction.slice(start);
}

function sectionBetween(instruction, startPattern, endPattern) {
  const start = instruction.search(startPattern);
  assert.ok(start >= 0, `apply instruction should define ${startPattern}`);
  const remainder = instruction.slice(start);
  const end = remainder.search(endPattern);
  return end >= 0 ? remainder.slice(0, end) : remainder;
}

const stepScopeAnchors = [
  '*Scope*: Implement ONLY what is specified in the Step. DO NOT WRITE ANY CODE OUTSIDE OF WHAT IS SPECIFIED IN THE STEP.',
  '*Scope*: Write ONLY the interface stubs and the tests for this Step. Do NOT write the implementation.',
  "*Scope*: Implement ONLY what is specified in the Step's GREEN body. Do NOT write tests.",
];

const scratchRules = [
  'Scratch path: `.tmp/{change-name}/` (separate from and excluded from `Allowed files`).',
  'A worker MAY create temporary files only below `.tmp/{change-name}/`, MAY remove all contents of exactly that directory and the directory itself before a clean return, and has no preservation obligation on STOP or failure. A non-clean return has no preservation obligation.',
  'A worker MUST NOT remove the `.tmp/` parent.',
  'Files modified MUST contain only non-scratch paths and MUST exclude every path below `.tmp/{change-name}/`.',
];

test('Step 1 apply contract contains every normative scope and scratch sentence byte-exactly', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const normativeSentences = [
    'Every Step-execution prompt MUST include an `Allowed files` list containing exactly that dispatch\'s plan-authorized paths.',
    "Single dispatch Allowed files are exactly the Step's plan-level files.",
    'Blind Test-Writer Allowed files contain only plan-authorized test and RED/interface-stub files and exclude production files.',
    'Implementation Dispatch Allowed files contain only plan-authorized production files and exclude tests and declared interfaces.',
    'The pre-dispatch baseline and recovery assessment are coordinator-only and MUST NOT be included in a Step-execution prompt.',
    ...scratchRules,
    'An explicitly present empty `Files modified` list is valid; an omitted field 8 is malformed.',
  ];

  for (const sentence of normativeSentences) {
    assert.ok(instruction.includes(sentence), `missing byte-exact normative sentence: ${sentence}`);
  }
});

test('Step 1 dispatch branches carry allowed files and scratch rules without losing scope anchors', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const branches = [
    {
      name: 'single dispatch',
      section: sectionBetween(instruction, /Single dispatch/i, /Blind Test-Writer/i),
      anchor: stepScopeAnchors[0],
    },
    {
      name: 'Blind Test-Writer dispatch',
      section: sectionBetween(instruction, /Blind Test-Writer/i, /Implementation Dispatch/i),
      anchor: stepScopeAnchors[1],
    },
    {
      name: 'Implementation Dispatch',
      section: sectionBetween(instruction, /Implementation Dispatch/i, /Known-False Report Recovery|Recovery Dispatch/i),
      anchor: stepScopeAnchors[2],
    },
  ];

  for (const branch of branches) {
    assert.match(branch.section, /Allowed files/, `${branch.name} must declare Allowed files`);
    for (const rule of scratchRules) {
      assert.ok(branch.section.includes(rule), `${branch.name} must include scratch rule: ${rule}`);
    }
    assert.ok(branch.section.includes(branch.anchor), `${branch.name} must retain its pinned scope anchor`);
  }
});

test('Step 1 report field 8 failure is limited to omitted Files modified, not an explicit empty list', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const message = 'Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing.';
  const escapedMessage = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  assert.equal((instruction.match(new RegExp(escapedMessage, 'g')) || []).length, 1,
    'the malformed-report message must be emitted exactly once');
  assert.match(instruction, /field 8[^.\n]{0,160}omitted[^.\n]{0,240}Subagent report missing field 8/i);
  assert.match(instruction, /An explicitly present empty `Files modified` list is valid/);
  assert.doesNotMatch(instruction, /explicitly present empty `Files modified` list[^.\n]{0,240}Subagent report missing field 8/i);
});

test('ordinary dispatch captures coordinator-only evidence and derives dispatch-specific scope before report evaluation', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const dispatch = instruction.search(/dispatch/i);
  const reportEvaluation = instruction.search(/(?:evaluate|assess|classif).*report/i);

  assert.match(instruction, /pre-dispatch.*baseline|baseline.*pre-dispatch/i);
  assert.match(instruction, /tracked.*untracked|untracked.*tracked/i);
  assert.match(instruction, /path identit|working-tree.*path/i);
  assert.match(instruction, /plan-level.*(?:file )?scope|Step.*plan.*scope/i);
  assert.match(instruction, /dispatch-kind.*allowed-file|allowed-file.*dispatch-kind/i);
  assert.ok(dispatch >= 0 && reportEvaluation >= 0 && dispatch < reportEvaluation,
    'evidence and scope must be established before report evaluation');

  const recovery = recoverySection(instruction);
  assert.match(recovery, /coordinator-only|coordinator.*state/i);
  assert.match(recovery, /baseline/);
  assert.match(recovery, /allowed-file/);
  assert.match(recovery, /per-report.*recovery.*assessment|recovery.*assessment/i);
});

test('allowed-file rules distinguish single, blind test-writer, and implementation dispatches', () => {
  const instruction = artifact('sai/instructions/apply.md');

  assert.match(instruction, /single dispatch[\s\S]{0,240}(?:allowed-file|file scope)[\s\S]{0,240}Step.*plan.*scope/i);
  assert.match(instruction, /blind test-writer[\s\S]{0,320}(?:only|exclude|excluding)[\s\S]{0,320}(?:authorized test|RED|interface stub)/i);
  assert.match(instruction, /implementation dispatch[\s\S]{0,320}(?:only|exclude|excluding)[\s\S]{0,320}(?:production|test|declared interface)/i);
  assert.match(instruction, /blind.*(?:exclude|not include).*production|production.*(?:exclude|not include).*blind/i);
  assert.match(instruction, /implementation.*(?:exclude|not include).*test|test.*(?:exclude|not include).*implementation/i);
  assert.match(instruction, /implementation.*declared interface|declared interface.*implementation/i);
});

test('clean checklist and path evidence preserve the existing post-verification gates without recovery', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.match(instruction, /checklist.*pass|Verification Checklist.*passes/i);
  assert.match(instruction, /no.*(?:path|file).*discrepancy|path.*comparison.*no discrepancy/i);
  assert.match(instruction, /no Recovery Dispatch|does not dispatch recovery|without.*recovery/i);
  assert.match(instruction, /Human Verification/);
  assert.match(instruction, /checkbox/);
  assert.match(instruction, /commit/);
});

test('confirmed contradictions aggregate into exactly one bounded recovery dispatch before advancement', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recovery = recoverySection(instruction);
  assert.match(recovery, /one|at most one|exactly one/i);
  assert.match(recovery, /aggregate|aggregat.*contradict|all.*contradict/i);
  assert.match(recovery, /before.*checkbox|checkbox.*after.*recovery/i);
  assert.match(recovery, /before.*commit|commit.*after.*recovery/i);
  assert.match(recovery, /current Step|current step/);
  assert.match(recovery, /existing plan scope|plan scope/);
  assert.doesNotMatch(recovery, /advisor tier|additional advisor/i);
});

test('recovery dispatch retains three ordinary sections and appends the ordered five-heading recovery block', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recovery = recoverySection(instruction);
  const headings = ['Reported', 'Evidence', 'Cause', 'Correction', 'Verification'];
  const positions = headings.map((heading) => recovery.search(new RegExp(`\\b${heading}\\b`, 'i')));

  for (const position of positions) assert.ok(position >= 0, 'recovery heading should exist');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions,
    'recovery headings should remain in the required order');
  assert.match(recovery, /first three.*(?:sections|parts)|three.*ordinary.*(?:sections|parts)/i);
  assert.match(recovery, /exactly one.*fourth|fourth.*exactly one/i);
  assert.match(recovery, /fixed.*Subagent Report|report contract/i);
  assert.match(recovery, /no raw output|raw output.*(?:not|excluded|forbidden)/i);
  assert.match(recovery, /blind.*(?:restriction|rule)|blind.*test-writer/i);
});

test('ordinary and blind prompts do not receive coordinator-only recovery evidence or forbidden details', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recoveryStart = instruction.search(/Known-False Report Recovery|Recovery Dispatch/i);
  assert.ok(recoveryStart >= 0);
  const ordinary = instruction.slice(0, recoveryStart);

  assert.doesNotMatch(ordinary, /include.*(?:pre-dispatch )?baseline/i);
  assert.doesNotMatch(ordinary, /include.*allowed-file set/i);
  assert.doesNotMatch(ordinary, /per-report recovery assessment/i);
  assert.match(instruction, /raw output/);
  assert.match(instruction, /change artifacts|implementation\.md/);
  assert.match(instruction, /forbidden.*(?:blind|test-writer)|blind.*forbidden/i);
});

test('unsafe or unowned path discrepancies stop for human intervention without recovery', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.match(instruction, /existed.*before|present.*baseline|baseline.*present/i);
  assert.match(instruction, /unknown.*(?:ownership|shared)|shared.*ownership/i);
  assert.match(instruction, /destructive.*(?:cleanup|correction)|unauthorized.*(?:cleanup|correction)/i);
  assert.match(instruction, /no recovery|does not dispatch recovery/i);
  assert.match(instruction, /human intervention/i);
  assert.match(instruction, /absent.*baseline|newly created|created by.*dispatch/i);
  assert.match(instruction, /safe.*reversib|reversib.*safe/i);
});

test('successful recovery independently re-verifies and resumes gates; failed recovery halts without retry', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recovery = recoverySection(instruction);
  assert.match(recovery, /re-run.*(?:normal )?Verification Checklist|Verification Checklist.*re-run/i);
  assert.match(recovery, /coordinator verification.*authoritative|coordinator.*authoritative/i);
  assert.match(recovery, /learnings/);
  assert.match(recovery, /Human Verification/);
  assert.match(recovery, /checkbox/);
  assert.match(recovery, /appendix|appendices/);
  assert.match(recovery, /commit/);
  assert.match(recovery, /no second recovery|without.*second.*recovery|at most one/i);
  assert.match(recovery, /failed|uncertain|unresolved|unsafe|out-of-scope/i);
  assert.match(recovery, /does not mark|do not mark|no checkbox/i);
  assert.match(recovery, /does not propose|do not propose|no commit/i);
  assert.match(recovery, /human intervention/);
});

test('terminal documentation commit is a sibling after the final sweep and promotion pass', () => {
  const apply = artifact('sai/instructions/apply.md');
  const finalSweep = apply.search(/Final sweep/i);
  const promotion = apply.search(/## Learnings Promotion Pass/i);
  const terminalCommit = apply.search(/## Terminal Documentation Commit/i);

  assert.match(apply, /Exactly once per completed run, after the Final sweep and `## Learnings Promotion Pass`/);
  assert.match(apply, /The sibling `## Terminal Documentation Commit` uses its own non-mutating listing/);
  assert.ok(finalSweep >= 0 && promotion > finalSweep && terminalCommit > promotion,
    'the terminal documentation commit must follow the Final sweep and promotion pass');
});

test('apply directs one gated promotion and documentation commit, including docs-only eligibility and refusal behavior', () => {
  const apply = artifact('sai/commands/sai-4-apply.md');

  assert.match(apply, /promotion pass/);
  assert.match(apply, /sibling.*terminal documentation commit|terminal documentation commit.*sibling/i);
  assert.match(apply, /docs-only|documentation-only/i);
  assert.match(apply, /one shared gate|shared.*(?:authorization|commit).*gate/i);
  assert.match(apply, /declin|non-yes|not.*yes/i);
  assert.match(apply, /eligible.*(?:uncommitted|remain.*commit)|uncommitted.*eligible/i);
});

test('terminal eligibility uses terminal working-tree state and supports independent docs changes', () => {
  const apply = artifact('sai/instructions/apply.md');
  const command = artifact('sai/commands/sai-4-apply.md');

  assert.match(apply, /changed `docs\/\*\*` paths remain independently eligible/);
  assert.match(apply, /Evaluate `docs\/\*\*` at terminal time with no run-start baseline/);
  assert.match(apply, /pre-existing uncommitted documentation is eligible/);
  assert.match(apply, /When this pass writes `SAI_LEARNINGS\.md`/);
  assert.match(apply, /derive a fixed terminal set from the current working tree/);
  assert.match(command, /promotion-written `SAI_LEARNINGS\.md` joins the same fixed set and authorization gate/);
  assert.match(apply, /When the fixed terminal set is empty/);
  assert.match(apply, /propose no message/);
  assert.match(apply, /ask no authorization question/);
});

test('pre-authorization disclosure lists exact paths and learning promotion details without staging or delete authority', () => {
  const apply = artifact('sai/instructions/apply.md');

  assert.match(apply, /before proposing a message or asking for authorization/);
  assert.match(apply, /every exact path in the fixed terminal set/);
  assert.match(apply, /every working-tree path outside that set/);
  assert.match(apply, /without staging or reading `git diff --cached`/);
  assert.match(apply, /Do not derive this set from a Step, `tasks\.md`, an intended add-list, or subagent report field 8/);
  assert.match(apply, /path written/);
  assert.match(apply, /count of entries added and superseded broken down by section/);
  assert.match(apply, /keys of any pre-seeded entries/);
  assert.match(apply, /grants no delete authority/);
});

test('terminal message and staging rules remain limited to eligible paths and hunks', () => {
  const apply = artifact('sai/instructions/apply.md');
  const commitRules = artifact('sai/policies/commit-rules.md');

  assert.match(apply, /Propose one message for the complete terminal set/);
  assert.match(apply, /apply `sai\/policies\/commit-rules\.md` to the eligible terminal paths and hunks only/);
  assert.match(apply, /Never use `git add -A`, another broad sweep/);
  assert.match(apply, /stage exactly the changed `docs\/\*\*` paths in the fixed set plus root `SAI_LEARNINGS\.md`/);
  assert.match(apply, /Include every changed path under `docs\/\*\*`/);
  assert.match(apply, /every working-tree path outside that set, including OpenSpec change artifacts/);
  assert.match(apply, /path that includes `openspec\/changes\/\{change-name\}\//);
  assert.match(commitRules, /subject/i);
  assert.match(commitRules, /body/i);
  assert.match(commitRules, /footer/i);
});

test('ordinary Step commits and halted runs do not enter the terminal documentation operation', () => {
  const apply = artifact('sai/instructions/apply.md');
  const command = artifact('sai/commands/sai-4-apply.md');

  assert.match(apply, /ordinary `## Pre-commit File Visibility Report` remains unchanged/);
  assert.match(apply, /intended add-list.*field 8/);
  assert.match(apply, /A run that halts before the Final sweep promotes nothing/);
  assert.match(apply, /terminal documentation commit SHALL NOT be evaluated/);
  assert.match(command, /If any Step remains unchecked/);
  assert.match(command, /continue to the MANDATORY STOP/);
});

test('Step 1 coordinator contract makes scratch sweeps unconditional across dispatch outcomes', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const requiredOutcomes = ['clean', 'STOP', 'failure', 'crash'];

  assert.match(instruction, /sweep exactly `\.tmp\/\{change-name\}\/`/i);
  assert.match(instruction, /every dispatch|each dispatch|once per dispatch/i);
  for (const outcome of requiredOutcomes) {
    assert.match(instruction, new RegExp(`${outcome}[\\s\\S]{0,260}sweep|sweep[\\s\\S]{0,260}${outcome}`, 'i'),
      `${outcome} dispatch returns must trigger a scratch sweep`);
  }
  assert.match(instruction, /Split-Routed Step[\s\S]{0,260}(?:each|every|per) dispatch[\s\S]{0,260}sweep/i);
  assert.match(instruction, /Recovery Dispatch[\s\S]{0,420}sweep|sweep[\s\S]{0,420}Recovery Dispatch/i);
  assert.doesNotMatch(instruction, /preserved-scratch acknowledgement|preserved-scratch episode/i);
});

test('Step 1 coordinator sweeps after every Verification Checklist run before comparison or redispatch', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const checklistRuns = instruction.match(/Verification Checklist[\s\S]{0,500}/gi) || [];

  assert.ok(checklistRuns.length > 0, 'apply instruction must define coordinator Verification Checklist runs');
  for (const run of checklistRuns) {
    assert.match(run, /sweep/i, 'each Verification Checklist run must be followed by a sweep');
  }
  assert.match(instruction, /Verification Checklist[\s\S]{0,500}sweep[\s\S]{0,500}(?:final|post-dispatch).*comparison|Verification Checklist[\s\S]{0,500}sweep[\s\S]{0,500}another dispatch/i);
  assert.match(instruction, /Recovery Dispatch[\s\S]{0,500}Verification Checklist[\s\S]{0,500}sweep/i);
});

test('Step 1 ordered scratch sweep has exact cleanup traces and no empty-sweep trace', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.match(instruction, /> Scratch cleanup: removed \.tmp\/\{change-name\}\//);
  assert.match(instruction, /> Scratch cleanup: removed \.tmp\/\{change-name\}\/,[ \t]*\.tmp\//);
  assert.match(instruction, /empty sweep[\s\S]{0,180}(?:emits nothing|no output|no message)|(?:emits nothing|no output|no message)[\s\S]{0,180}empty sweep/i);
});

test('Step 1 scratch cleanup is ordered before comparison without widening recovery or human intervention', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.match(instruction, /ordered sweep[\s\S]{0,320}(?:absent|exclude|excluded)[\s\S]{0,260}(?:report )?comparison/i);
  assert.match(instruction, /unrelated.*out-of-scope|out-of-scope.*unrelated/i);
  assert.match(instruction, /out-of-scope[\s\S]{0,260}(?:recovery|human intervention)|(?:recovery|human intervention)[\s\S]{0,260}out-of-scope/i);
  assert.match(instruction, /Scratch cleanup[\s\S]{0,260}(?:MUST NOT|does not|not)[\s\S]{0,180}(?:broaden|authorize|remove).*?(?:recovery|unexpected path)/i);
});

test('Step 1 parent cleanup preserves pre-existing and non-empty parents', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.match(instruction, /remove the `\.tmp\/` parent[\s\S]{0,260}(?:absent|not present)[\s\S]{0,260}empty after the per-change sweep/i);
  assert.match(instruction, /pre-existing.*(?:parent|`\.tmp\/`)[\s\S]{0,180}(?:remain|preserve|not remove|not delete)/i);
  assert.match(instruction, /non-empty.*(?:parent|`\.tmp\/`)[\s\S]{0,180}(?:remain|preserve|not remove|not delete)/i);
});

test('Step 1 worker scratch declaration stays separate from Allowed files and Files modified', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const allowedFileDeclarations = instruction.match(/`Allowed files`[^\n]*/gi) || [];

  assert.ok(allowedFileDeclarations.length > 0, 'worker dispatch contract must declare Allowed files');
  assert.match(instruction, /worker[\s\S]{0,260}(?:may|MUST)[\s\S]{0,180}remove[\s\S]{0,180}\.tmp\/\{change-name\}\//i);
  assert.match(instruction, /non-clean return[\s\S]{0,240}(?:no|not)[\s\S]{0,120}preserv/i);
  assert.match(instruction, /worker[\s\S]{0,260}MUST NOT remove the `\.tmp\/` parent/i);
  assert.match(instruction, /Files modified[\s\S]{0,260}(?:exclude|exclude every path below)[\s\S]{0,180}\.tmp\/\{change-name\}\//i);
  for (const declaration of allowedFileDeclarations) {
    assert.doesNotMatch(declaration, /\.tmp\/\{change-name\}\//i,
      'Allowed files declarations must contain non-scratch paths only');
  }
});

test('Step 1 fast-track uses the sweep and trace contract without preserved-scratch acknowledgement', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const command = artifact('sai/commands/sai-4-apply.md');

  assert.match(instruction, /`--fast-track`[\s\S]{0,500}(?:same|unconditional|every|each)[\s\S]{0,260}sweep/i);
  assert.match(command, /--fast-track[\s\S]{0,900}(?:sweep|Scratch cleanup)/i);
  assert.doesNotMatch(`${instruction}\n${command}`, /preserved-scratch acknowledgement|preserved-scratch episode/i);
});

test('Step 1 keeps the pinned scope and recovery anchors byte-exact after sweep clauses', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.ok(instruction.includes('Cleanup that only undoes the current dispatch\'s own scope violation is corrective scope, not feature work.'));
  assert.ok(instruction.includes('The recovery operation stays within the current Step and existing plan scope, uses the same dispatch kind and budget-subagent binding as the ordinary dispatch'));
  assert.match(instruction, /Scratch cleanup[\s\S]{0,260}(?:MUST NOT|does not|not)[\s\S]{0,180}(?:broaden|authorize|remove).*?(?:recovery|unexpected path)/i);
});
