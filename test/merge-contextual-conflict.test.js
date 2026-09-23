'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(absolutePath), true, `${relativePath} should exist`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function section(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  assert.notEqual(start, -1, `${startHeading} should exist`);
  const end = endHeading ? text.indexOf(endHeading, start + startHeading.length) : -1;
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

function assertInOrder(text, fragments) {
  let cursor = -1;
  for (const fragment of fragments) {
    const next = text.indexOf(fragment, cursor + 1);
    assert.notEqual(next, -1, `expected ${fragment} after the previous fragment`);
    cursor = next;
  }
}

const cards = () => ({
  instructions: read('sai/commands/merge/instructions.md'),
  worker: read('sai/commands/merge/worker.md'),
  coordinator: read('sai/commands/merge/coordinator.md'),
  presentation: read('sai/commands/merge/presentation.md'),
  lifecycle: read('sai/commands/merge/lifecycle.md'),
});

test('merge launch stops every merge before its commit so authorization precedes it', () => {
  const { instructions, coordinator } = cards();

  assert.match(instructions, /`git merge --no-ff --no-commit <source_ref>`, so every merge, clean\s+or conflicted, stops before its commit/);
  assert.match(coordinator, /`merge` — `git merge --no-ff --no-commit <source_ref>`/);
  assert.doesNotMatch(coordinator, /execute `git merge <source_ref>`/);
  assert.match(coordinator, /when `merge_base` differs from `target_sha`,\s+`git reset --soft <merge_base>`/);
  assert.match(instructions, /When `merge_base`\s+equals `target_sha` there is nothing to squash/);
});

test('merge rebase path continues per stop and finishes without a spurious authorization', () => {
  const { instructions, coordinator } = cards();
  const authorization = section(instructions, '### Step 10:');

  assert.match(authorization, /merge in progress \| \*\*"Run `git commit` to finalize the merge\?"\*\*/);
  assert.match(authorization, /rebase stopped at a resolved commit \| \*\*"Continue the rebase onto <branch>\?"\*\* \| `git rebase --continue`/);
  assert.match(authorization, /rebase finished, collision repair staged \| \*\*"Run `git commit` to record the ADR\/DDR collision repair\?"\*\*/);
  assert.match(authorization, /A rebase that finished with nothing staged asks nothing/);
  assert.match(authorization, /continues at Step 5 \(a new conflicted commit\) or Step 9 \(the rebase finished\)/);
  assert.match(authorization, /for `rebase-squash` this returns\s+to the squash commit; the pre-squash `HEAD` is `target_sha`/);
  assert.match(coordinator, /`GIT_EDITOR=true git rebase --continue`/);
  assert.match(coordinator, /a new conflicted commit re-enters\s+§ Conflict hand-off as `strategy-analysis`/);
});

test('merge sides are mapped per method so ours and theirs follow the git stage', () => {
  const { instructions } = cards();
  const sides = section(instructions, '## Sides', '## Gate trips');

  assert.match(sides, /\| `merge` \| current branch \(`target_sha`\) \| selected branch \(`source_sha`\) \|/);
  assert.match(sides, /\| `rebase` \| selected branch \(`source_sha`\), the new base \| current branch's replayed commit \(`target_sha`\) \|/);
  assert.match(sides, /always mean the git stage/);
  assert.match(sides, /Describe\s+alternatives to the human by branch and behavior/);
  assert.match(instructions, /mapped through \[Sides\]\(#sides\)/);
});

test('merge conflicts use a closed hand-off before language selection and analysis', () => {
  const { instructions, worker, coordinator } = cards();
  const workerCore = read('sai/orchestration/worker-core.md');
  const runner = read('sai/orchestration/command-runner.md');
  const detection = section(instructions, '### Step 5:', '### Step 6:');

  assert.match(workerCore, /affected_files: string\[\][\s\S]{0,100}continuation_state: language-selection\|strategy-analysis/);
  assert.doesNotMatch(runner, /conflict_detected/, 'merge extension details live in the merge coordinator, not the phase-neutral runner');
  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,260}conflict_detected/);
  assert.match(coordinator, /it arrives after ready/);

  assertInOrder(detection, [
    'git diff --name-only --diff-filter=U',
    'read the three stages',
    'classify each file',
    'Derive the eligible scope values',
    'event: conflict_detected',
    'Categories: specs=<n>, adr-ddr=<n>, code=<n>',
    'Eligible scope:',
  ]);
  assert.match(detection, /changed_files: \[\]/);
  assert.match(detection, /carries no semantic analysis, proposal, question, or options/);
  assert.match(detection, /`language-selection` on the run's first conflict and\s+`strategy-analysis` on every later one/);
  assert.match(instructions, /When the outcome is clean[\s\S]{0,80}go to Step 9/);
  assert.match(worker, /carrying no question or\s+options/);
});

test('merge language question is coordinator-owned, asked once per run, and never persisted', () => {
  const { coordinator, presentation } = cards();
  const handoff = section(coordinator, '## Conflict hand-off', '## Coordinator-owned execution');

  assert.match(handoff, /\*\*"Which language should I use for the\s+conflict explanation and resolution strategy\?"\*\*/);
  assert.match(handoff, /`AskUserQuestion` on Claude Code,\s+`question` on opencode/);
  assert.match(handoff, /with no\s+semantic analysis/);
  assert.match(handoff, /outside\s+`arguments_value`, artifacts, configuration, and worker payload\s+persistence/);
  assert.match(handoff, /the language question runs once per run/);
  assert.match(handoff, /a clean run never asks for it/);
  assert.doesNotMatch(presentation, /Which language should I use/, 'the language question lives only in the coordinator');
});

test('merge strategy is one global plan confirmed before any write, revised through open input', () => {
  const { instructions, coordinator, presentation } = cards();
  const strategy = section(instructions, '### Step 7:', '### Step 8:');

  assert.match(strategy, /Compose one strategy over the whole selected conflict set/);
  assert.match(strategy, /The strategy is prose; resolution text appears only\s+in the completed payload/);
  assert.match(strategy, /\*\*"Apply this complete global resolution strategy before changing the\s+conflicted files\?"\*\*/);
  assertInOrder(strategy, ['value: "apply-strategy"', 'value: "revise-strategy"', 'value: "decline-strategy"']);
  assert.match(strategy, /`revise-strategy` — return a `needs_input` with an empty `options` list/);
  assert.match(strategy, /`decline-strategy` — return `completed` stating that no resolution was\s+written/);
  assert.match(strategy, /\[No declared rule found for this region\]/);
  assert.match(strategy, /### Deferred \(out of scope\)/);

  assert.match(presentation, /A worker `needs_input` with an empty `options` list is open input/);
  assert.match(presentation, /Print it as ordinary text, then ask the confirmation/);
  assert.match(coordinator, /Open input goes back\s+unchanged; build no options for it/);
});

test('merge per-conflict picker and more-context are retired from every live surface', () => {
  const { instructions, worker, coordinator, presentation, lifecycle } = cards();
  const surfaces = {
    instructions,
    worker,
    coordinator,
    presentation,
    lifecycle,
    todo: read('sai/policies/todo-structure.md'),
    mergeSpec: read('openspec/specs/sai-merge-command/spec.md'),
    presentationSpec: read('openspec/specs/merge-presentation-seam/spec.md'),
    closedChoiceSpec: read('openspec/specs/closed-choice-prompts/spec.md'),
    lifecycleSpec: read('openspec/specs/worker-lifecycle-protocol/spec.md'),
  };
  for (const [name, text] of Object.entries(surfaces)) {
    assert.doesNotMatch(text, /more-context/, `${name} should not mention more-context`);
  }
  assert.doesNotMatch(presentation, /contextual_decision_status|pending_contextual_conflict/);
  assert.match(coordinator, /each matching the decision the\s+confirmed strategy states for it/);
});

test('merge evidence ladder separates declared rules, facts, and inferences', () => {
  const { instructions } = cards();
  const intent = section(instructions, '### Step 6:', '### Step 7:');

  assert.match(intent, /\*\*Declared rules\*\*[\s\S]{0,120}normative, outrank inferred objectives/);
  assert.match(intent, /\*\*Inferences\*\*[\s\S]{0,120}labelled as inferences/);
  assert.match(intent, /git show <target_sha\|source_sha>:<path>/);
  for (const edge of ['**Contradicting rules**', '**Conflicted arbiter**', '**Rule rejects both sides**', '**Spec contradiction**']) {
    assert.ok(intent.includes(edge), `${edge} should be a named semantic case`);
  }
  assert.match(instructions, /excluding `openspec\/changes\/archive\/\*\*`/);
  assert.doesNotMatch(instructions, /\bE[1-9]\b|\bI[1-8]\b/, 'spec requirement codes do not leak into the card');
});

test('merge resolution payload is region-scoped and validated atomically by the coordinator', () => {
  const { instructions, worker, coordinator } = cards();
  const strategy = section(instructions, '### Step 7:', '### Step 8:');
  const validation = section(coordinator, '**Resolution validation.**', '**Post-resolution review.**');

  assert.match(strategy, /## Complete resolution payload/);
  assert.match(strategy, /"selected_contextual_decisions"/);
  assert.match(strategy, /`source` is `git-ours`, `git-theirs`, or `authored`/);
  assert.match(strategy, /no `<<<<<<<`, `=======`, or\s+`>>>>>>>` line/);
  assert.match(strategy, /never built by concatenating fragments or\s+retyping untouched lines/);
  assert.match(strategy, /A conflict with no markers \(delete\/modify, rename\/rename, rename\/delete\)/);
  assert.match(worker, /the region splices of each `authored` file/);

  assert.match(validation, /Validate the whole object at once/);
  assert.match(validation, /rejects\s+the whole payload: touch no conflict and stage nothing/);
  assert.match(validation, /materialize `git-ours` \/ `git-theirs` files with\s+`git checkout --ours` \/ `--theirs`/);
  assert.match(coordinator, /After three rounds without a match, stop without\s+staging/);
});

test('merge worker runs only read-only git and writes only resolution content', () => {
  const { instructions, worker } = cards();

  assert.match(worker, /Run only read-only git commands/);
  assert.match(worker, /NEVER run a state-changing git\s+command/);
  assert.match(instructions, /inspect the\s+repository with read-only git commands/);
  assert.doesNotMatch(instructions, /never run git commands/i);
});

test('merge branch and scope gates filter candidates and order full scope first', () => {
  const { instructions, coordinator, presentation } = cards();
  const branchStep = section(instructions, '### Step 3: Branch', '### Step 4:');

  assert.match(instructions, /git branch --no-merged HEAD --format='%\(refname:short\) %\(committerdate:iso8601\)'/);
  assert.match(instructions, /`<branch> — last commit <YYYY-MM-DD HH:mm>`/);
  assert.match(branchStep, /With no candidates, the branch-entry option is the only option/);
  assert.match(branchStep, /value: "sai:enter-branch"/);
  assert.doesNotMatch(branchStep, /No other local branches to merge/);
  assert.match(presentation, /sai:enter-branch/);
  const branchGate = section(coordinator, '2. **Classify the `branch` answer', '3. **Typed text**');
  assertInOrder(branchGate, [
    'the exact value or the exact label of a listed candidate or of',
    'mapped to its value',
    'Only an answer matching no option\'s value or',
    'an exact listed candidate value sets `branch_selection_source: listed`',
    'picker free text that exactly matches a listed value',
    'the branch-entry sentinel `sai:enter-branch`',
    'any other non-empty answer is picker free text',
    'so add no `branch-entry` pair',
    'an empty or whitespace-only answer is not a branch',
  ]);
  assert.match(branchGate, /exact value or the exact label of a listed candidate or of\s+the sentinel option is that option's selection, mapped to its value\s+before classification/);
  assert.match(branchGate, /Only an answer matching no option's value or\s+label is picker free text/);
  assert.match(branchGate, /On the sentinel\s+path the typed text wins/);
  assert.doesNotMatch(branchGate, /Claude Code|opencode/);
  const branchEntryGate = section(presentation, '- **Branch entry**', '- **Batch 2**');
  assert.match(branchEntryGate, /picker free text needs no prompt, and the sentinel\s+leads to this open prompt/);
  assert.doesNotMatch(branchEntryGate, /Claude Code|opencode/);
  assert.match(presentation, /¿Sobre qué rama quieres operar\?/);
  for (const contract of [instructions, presentation]) {
    assertInOrder(contract, ['Full scope (Recommended)', 'Artifacts only (specs + ADR/DDR)', 'Code only']);
  }
});

test('free-text merge branches fetch and validate exact refs before the existing integration path', () => {
  const { instructions, coordinator, worker, lifecycle } = cards();
  const validation = section(coordinator, '- **Branch validation.**', '- **Launch.**');
  const provenance = section(instructions, '#### Merge provenance', '### Step 5:');

  assertInOrder(validation, [
    'git fetch --prune origin',
    'git check-ref-format',
    'git show-ref --verify --quiet',
    'git rev-parse --verify',
  ]);
  assert.match(validation, /Listed candidate\*\* — `refs\/heads\/<value>`; do not fetch/);
  assert.match(validation, /refs\/heads\/<value>/);
  assert.match(validation, /refs\/remotes\/origin\/<remainder>/);
  assert.match(validation, /do not capture provenance or launch on that\s+path/);
  assert.match(validation, /do not[\s\S]+create a local branch/);
  assert.match(validation, /do not[\s\S]+use any ref from the worker's proposal/);
  assert.match(provenance, /source_ref[\s\S]+source_sha.*<source_ref>\^\{commit\}/);
  assert.match(provenance, /exact prefix\s+`origin\/`[\s\S]+Map the text exactly as typed; the coordinator alone\s+fetches and validates it/);
  assert.match(coordinator, /an empty or whitespace-only answer is not a branch: repeat the branch\s+question, with no fetch/);
  assert.match(coordinator, /git merge --no-ff --no-commit <source_ref>/);
  assert.match(coordinator, /git rebase <source_ref>/);
  assert.match(worker, /Never run\s+`git fetch --prune origin`/);
  assert.match(lifecycle, /branch-selection\s+branch-validation/);
  assert.match(lifecycle, /branch-validation\s+merge-outcome/);
});

test('merge fast-track changes exactly the method and scope gates', () => {
  const { instructions, coordinator, lifecycle } = cards();

  assert.match(coordinator, /Fast-track changes exactly two gates: the method is pinned to `merge` and the\s+scope is `full`/);
  assert.match(instructions, /Fast-track pins the method to\s+`merge` and auto-applies `full` scope/);
  assert.match(lifecycle, /preflight\s+branch-selection\s+environment checks passed; fast_track_active pins method=merge/);
  assert.match(lifecycle, /fast_track_active supplies full/);
});

test('merge lifecycle table covers early closures, re-entry, and the rebase cycle', () => {
  const { lifecycle, coordinator, presentation } = cards();
  const table = section(lifecycle, '## Permitted transitions');

  for (const row of [
    /merge-outcome\s+adr-ddr\s+outcome clean/,
    /merge-outcome\s+language-selection\s+outcome conflicted; working_language unresolved/,
    /merge-outcome\s+contextual-analysis\s+outcome conflicted; working_language already selected/,
    /resolution\s+contextual-analysis/,
    /verification\s+contextual-analysis/,
    /verification\s+authorization\s+rebase stopped/,
    /adr-ddr\s+terminal\s+rebase finished with nothing staged/,
    /authorization\s+merge-outcome\s+rebase stopped; answer yes/,
    /<any>\s+terminal\s+the worker returned a closing result/,
  ]) {
    assert.match(table, row);
  }
  assert.match(table, /`commit_executed` is true when the run ends finalized/);
  assert.match(lifecycle, /On `invalid`, halt before the operation: no mutation, no\s+dispatch, no presentation update/);
  assert.match(coordinator, /Fetch @sai\/commands\/merge\/lifecycle\.md/);
  assert.match(coordinator, /call `validate_transition` from the lifecycle seam/);
  assert.match(presentation, /only after the lifecycle\s+check \(`@sai\/commands\/merge\/lifecycle\.md`\) accepted the transition/);
});

test('merge presentation points at the TODO policy instead of restating it', () => {
  const { presentation } = cards();
  const policy = read('sai/policies/todo-structure.md');

  assert.match(presentation, /`@sai\/policies\/todo-structure\.md` § Merge adaptive\s+TODO/);
  assert.doesNotMatch(presentation, /\[~\] Merge <source> into <target>/);
  assert.match(presentation, /TaskUpdate`\/`TaskList` on Claude Code, `todowrite` and the session\s+todo surface on opencode/);
  assert.match(policy, /Analyze conflict alternatives/);
  assert.match(policy, /Authorize rebase continuation/);
  assert.match(policy, /Authorize collision repair commit/);
  assert.match(policy, /typed branch that\s+passed the coordinator's validation/);
  assert.match(policy, /Render no\s+merge TODO while that validation is pending/);
  assert.match(policy, /No TODO\s+transition authorizes\s+a write or stage/);
});
