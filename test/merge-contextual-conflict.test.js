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
  stages: read('sai/commands/merge/coordinator-stages.md'),
  presentation: read('sai/commands/merge/presentation.md'),
  lifecycle: read('sai/commands/merge/lifecycle.md'),
});

test('merge launch stops before the coordinator finalizes it automatically', () => {
  const { presentation, stages } = cards();

  assert.match(presentation, /`git merge --no-ff --no-commit <source_ref>`, so every merge, clean\s+or conflicted, stops before its commit/);
  assert.match(stages, /`merge` — `git merge --no-ff --no-commit <source_ref>`/);
  assert.doesNotMatch(stages, /execute `git merge <source_ref>`/);
  assert.match(stages, /when `merge_base` differs from `target_sha`,\s+`git reset --soft <merge_base>`/);
  assert.match(presentation, /When `merge_base`\s+equals `target_sha` there is nothing to squash/);
});

test('merge rebase path finalizes each stop and creates no extra commit when finished', () => {
  const { stages } = cards();
  const authorization = section(stages, '### Step 10:', '## Informative messages');

  assert.match(authorization, /merge in progress \| local merge commit/);
  assert.match(authorization, /rebase stopped at a resolved commit \| `git rebase --continue`/);
  assert.match(authorization, /rebase finished, collision repair staged \| local collision-repair commit/);
  assert.match(authorization, /A rebase that finished with nothing staged needs no operation/);
  assert.match(authorization, /new\s+conflicted commit re-enters the `conflicts` stage \(Step 5\)[\s\S]+a finished\s+rebase goes to the collision pass \(Step 9\)/);
  assert.doesNotMatch(authorization, /needs_input|On `no`|On `yes`/);
  assert.match(authorization, /`GIT_EDITOR=true git rebase --continue`/);
  assert.match(authorization, /with a fresh\s+snapshot, the same worker, and the language already selected/);
});

test('merge sides are mapped per method so ours and theirs follow the git stage', () => {
  const { instructions } = cards();
  const sides = section(instructions, '## Sides', '## Gate trips');

  assert.match(sides, /\| `merge` \| current branch \(`target_sha`\) \| selected branch \(`source_sha`\) \|/);
  assert.match(sides, /\| `rebase` \| selected branch \(`source_sha`\), the new base \| current branch's replayed commit \(`target_sha`\) \|/);
  assert.match(sides, /always mean the git stage/);
  assert.match(sides, /Describe\s+alternatives to the human by branch and behavior/);
  assert.match(instructions, /are the git stages of \[Sides\]\(#sides\)/);
});

test('the coordinator detects conflicts itself; the worker hand-off is reserved for new problems', () => {
  const { instructions, worker, coordinator, stages } = cards();
  const workerCore = read('sai/orchestration/worker-core.md');
  const runner = read('sai/orchestration/command-runner.md');
  const detection = section(stages, '## Stage: conflicts', '### Conflict hand-off');
  const correction = section(instructions, '### Step 8:', '### Step 9:');

  assert.match(workerCore, /affected_files: string\[\][\s\S]{0,100}continuation_state: language-selection\|strategy-analysis/);
  assert.doesNotMatch(runner, /conflict_detected/, 'merge extension details live in the merge coordinator, not the phase-neutral runner');
  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,260}conflict_detected/);
  assert.match(coordinator, /it arrives after ready/);

  assert.match(coordinator, /The worker returns it only with\s+`strategy-analysis`; you detect the first conflict yourself/);
  assertInOrder(detection, [
    'Runs once per conflict stop',
    '`conflicts`\nsnapshot view',
    'categories, region ids, and stage\nblob OIDs',
    'Capture it before any worker write',
  ]);
  assert.match(detection, /An empty inventory after a failed launch is a launch failure, not a conflict/);
  assert.doesNotMatch(instructions, /### Step 5:|continuation_state: language-selection|Categories: specs=/);
  assert.match(correction, /return\s+`conflict_detected` with `continuation_state: strategy-analysis`/);
  assert.match(correction, /an empty `changed_files`, and the current `affected_files`/);
  assert.match(correction, /carries no semantic analysis, proposal, question, or\s+options/);
  assert.match(stages, /\*\*Clean\*\*[\s\S]{0,120}enter\s+the `collision` stage/);
  assert.match(worker, /carrying no question or\s+options/);
  assert.match(worker, /`continuation_state: strategy-analysis`/);
});

test('merge language question is coordinator-owned, asked once per run, and never persisted', () => {
  const { stages, presentation } = cards();
  const handoff = section(stages, '## Stage: conflicts', '### Strategy task');

  assert.match(handoff, /\*\*"Which language should I use for the\s+conflict explanation and resolution strategy\?"\*\*/);
  assert.match(handoff, /`AskUserQuestion` on Claude Code,\s+`question` on opencode/);
  assert.match(handoff, /with no\s+semantic analysis/);
  assert.match(handoff, /outside\s+`arguments_value`, artifacts, configuration, and worker payload\s+persistence/);
  assert.match(handoff, /the language question runs once per run/);
  assert.match(handoff, /a clean run never asks for it/);
  assert.doesNotMatch(presentation, /Which language should I use/, 'the language question lives only in the conflicts stage');
});

test('merge strategy is presented before any write and normal mode retains open revision', () => {
  const { instructions, stages, presentation } = cards();
  const strategy = section(instructions, '### Step 7:', '### Step 8:');

  assert.match(strategy, /Compose one strategy over the whole affected conflict set/);
  assert.match(strategy, /The strategy is prose; resolution text appears only\s+in the completed payload/);
  assert.match(strategy, /\*\*"Apply this complete global resolution strategy before changing the\s+conflicted files\?"\*\*/);
  assertInOrder(strategy, ['value: "apply-strategy"', 'value: "revise-strategy"', 'value: "decline-strategy"']);
  assert.match(strategy, /`revise-strategy` — return a `needs_input` with an empty `options` list/);
  assert.match(strategy, /`decline-strategy` — return `completed` stating that no resolution was\s+written at this stop/);
  assert.match(strategy, /\[No declared rule found for this region\]/);
  assert.doesNotMatch(strategy, /### Deferred \(out of scope\)/);

  assert.match(presentation, /A worker `needs_input` with an empty `options` list is open input/);
  assert.match(presentation, /Print it as ordinary text, then follow the mode-specific/);
  assert.match(stages, /Open input goes back\s+unchanged; build no options for it/);
});

test('merge per-conflict picker and more-context are retired from every live surface', () => {
  const { instructions, worker, coordinator, stages, presentation, lifecycle } = cards();
  const surfaces = {
    instructions,
    worker,
    coordinator,
    stages,
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
  assert.match(stages, /each matching the decision the\s+confirmed strategy states for it/);
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
  const { instructions, worker, stages } = cards();
  const strategy = section(instructions, '### Step 7:', '### Step 8:');
  const validation = section(stages, '### Resolution validation', '### Post-resolution review');

  assert.match(strategy, /## Complete resolution payload/);
  assert.match(strategy, /"selected_contextual_decisions"/);
  assert.match(strategy, /`source` is `git-ours`, `git-theirs`, or `authored`/);
  assert.match(strategy, /no `<<<<<<<`, `=======`, or\s+`>>>>>>>` line/);
  assert.match(strategy, /never built by concatenating fragments or\s+retyping untouched lines/);
  assert.match(strategy, /A file the bundle marks `whole-side-only` \(a binary file, a deletion on one\s+side, a rename, an encoding the tool cannot determine\)/);
  assert.match(worker, /the region text of each `authored` file/);

  assert.match(validation, /Validate the whole object at once/);
  assert.match(validation, /rejects\s+the whole payload: touch no conflict and stage nothing/);
  assert.match(validation, /materialize `git-ours` \/ `git-theirs` files with\s+`git checkout --ours` \/ `--theirs`/);
  assert.match(stages, /After three rounds without a\s+match, stop without staging/);
});

test('merge worker runs only read-only git and writes only resolution content', () => {
  const { instructions, worker } = cards();

  assert.match(worker, /Run only read-only git commands/);
  assert.match(worker, /NEVER run a state-changing git\s+command/);
  assert.match(instructions, /inspect the\s+repository with read-only git commands/);
  assert.doesNotMatch(instructions, /never run git commands/i);
});

test('merge branch gate filters candidates and resolution always covers the full set', () => {
  const { instructions, stages, presentation } = cards();
  const branchStep = section(presentation, '### Branch item', '### Branch entry');

  assert.match(branchStep, /git branch --no-merged HEAD --format='%\(refname:short\) %\(committerdate:iso8601\)'/);
  assert.match(branchStep, /`<branch> — last commit <YYYY-MM-DD HH:mm>`/);
  assert.match(branchStep, /With no candidates, the branch-entry option is the only option/);
  assert.match(branchStep, /value: "sai:enter-branch"/);
  assert.doesNotMatch(branchStep, /No other local branches to merge/);
  assert.match(presentation, /sai:enter-branch/);
  const branchGate = section(stages, '2. **Classify the `branch` answer', '3. **Typed text**');
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
  const branchEntryGate = section(presentation, '### Branch entry', '### Integration proposal');
  assert.match(branchEntryGate, /picker free text needs no\s+prompt, and the sentinel\s+leads to this open prompt/);
  assert.doesNotMatch(branchEntryGate, /Claude Code|opencode/);
  assert.match(presentation, /¿Sobre qué rama quieres operar\?/);
  assert.match(section(instructions, '### Step 6:', '### Step 7:'), /Analyze every file in `affected_files`; the strategy and payload cover them\s+all/);
  for (const contract of [instructions, stages, presentation]) {
    assert.doesNotMatch(contract, /Eligible scope:|Artifacts only|Code only|Select resolution scope/);
  }
});

test('free-text merge branches fetch and validate exact refs before the existing integration path', () => {
  const { instructions, stages, worker, lifecycle } = cards();
  const validation = section(stages, '### Step 3: Branch validation and provenance', '### Step 4: Launch');
  const provenance = section(instructions, '### Merge provenance', '### Step 6:');

  assertInOrder(validation, [
    'git fetch --prune origin',
    'git check-ref-format',
    'git show-ref --verify --quiet',
    'git rev-parse --verify',
  ]);
  assert.match(validation, /Listed candidate\*\* — `refs\/heads\/<value>`; do not fetch/);
  assert.match(validation, /refs\/heads\/<value>/);
  assert.match(validation, /refs\/remotes\/origin\/<remainder>/);
  assert.match(validation, /do not capture provenance or launch on\s+that path/);
  assert.match(validation, /do not[\s\S]+create a local branch/);
  assert.match(validation, /Then run `merge\.js provenance` with this exact `source_ref`/);
  assert.match(validation, /That one call checks the ref format/);
  assert.match(provenance, /source_ref[\s\S]+source_sha.*<source_ref>\^\{commit\}/);
  assert.match(provenance, /exact prefix\s+`origin\/`[\s\S]+Map the text exactly as typed; the coordinator alone\s+fetches and validates it/);
  assert.match(stages, /an empty or whitespace-only answer is not a branch: repeat the branch\s+question, with no fetch/);
  assert.match(stages, /git merge --no-ff --no-commit <source_ref>/);
  assert.match(stages, /git rebase <source_ref>/);
  assert.match(worker, /Never run\s+`git fetch --prune origin`/);
  assert.match(lifecycle, /branch-selection\s+branch-validation/);
  assert.match(lifecycle, /branch-validation\s+merge-outcome/);
});

test('merge fast-track changes method and strategy approval, not scope or finalization', () => {
  const { instructions, coordinator, lifecycle } = cards();

  assert.match(coordinator, /Fast-track pins the method to `merge`; strategy application follows/);
  assert.match(instructions, /Fast-track pins the method to\s+`merge` and applies each strategy after presentation/);
  assert.match(lifecycle, /preflight\s+branch-selection\s+environment checks passed; fast_track_active pins method=merge/);
  assert.doesNotMatch(lifecycle, /scope-selection|selected_scope/);
});

test('merge lifecycle table covers early closures, re-entry, and the rebase cycle', () => {
  const { lifecycle, coordinator, presentation } = cards();
  const table = section(lifecycle, '## Permitted transitions');

  for (const row of [
    /merge-outcome\s+adr-ddr\s+outcome clean/,
    /merge-outcome\s+language-selection\s+outcome conflicted; conflict snapshot captured; working_language unresolved/,
    /merge-outcome\s+contextual-analysis\s+outcome conflicted; conflict snapshot captured; working_language already selected/,
    /resolution\s+contextual-analysis/,
    /verification\s+contextual-analysis/,
    /verification\s+finalization\s+rebase stopped/,
    /adr-ddr\s+terminal\s+rebase finished with nothing staged/,
    /finalization\s+merge-outcome\s+rebase stopped; command-local authority/,
    /<any>\s+terminal\s+the run closed early/,
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
  assert.match(policy, /Continue rebase/);
  assert.match(policy, /Commit collision repair/);
  assert.match(policy, /typed branch that\s+passed the coordinator's validation/);
  assert.match(policy, /Render no\s+merge TODO while that validation is pending/);
  assert.match(policy, /No TODO\s+transition authorizes\s+a write or stage/);
});

test('fast-track hands each strategy to presentation before automatic application', () => {
  const { instructions, stages, worker, presentation } = cards();
  const strategy = section(instructions, '#### The strategy proposal', '#### Writing the resolution');
  assertInOrder(strategy, [
    'In fast-track, return it as `completed`',
    'before writing any resolution',
    'the coordinator presents it and continues you',
    'that continuation is',
    'Every later strategy takes the same hand-off',
    'In normal mode, return it as `needs_input`',
    'value: "apply-strategy"', 'value: "revise-strategy"', 'value: "decline-strategy"',
  ]);
  const handoff = section(stages, '**Strategy presentation and application.**', '- **Gates.**');
  assertInOrder(handoff, ['validate its completeness', 'print the', 'complete strategy', 'continue the same worker']);
  assert.match(handoff, /continue the same worker, unprompted/);
  assert.match(handoff, /Repeat for every new conflict or strategy revision, including later rebase\s+stops/);
  assert.match(worker, /coordinator's fast-track\s+presentation-and-application continuation/);
  assert.match(presentation, /Only normal mode uses `render_gate`/);
  assert.match(strategy, /no valid resolution stops or escalates as usual in either mode/);
});

test('no suite is unavailable verification, not a question, refusal, or passing test', () => {
  const { stages, lifecycle, presentation } = cards();
  const verification = section(stages, '## Stage: verify', '## Stage: collision');
  assert.match(verification, /\*\*`unavailable`\*\* — no suite was detected/);
  assert.match(verification, /It is not a pass and not a question/);
  assert.match(verification, /enter `collision` for a merge, or `final` for a stopped rebase/);
  assert.match(presentation, /already been applied and staged/);
  assert.doesNotMatch(verification, /needs_input|Continue\?|code fusion was not performed|On `no`/);
  assert.match(verification, /record `verification_result: unavailable` before proceeding/);
  assert.match(presentation, /verification_result: pending \| passed \| unavailable \| failed \| cap-exhausted/);
  assert.match(lifecycle, /method=merge; verification_result ∈ \{passed, unavailable, cap-exhausted\}/);
  assert.match(lifecycle, /rebase stopped; verification_result ∈ \{passed, unavailable, cap-exhausted\}/);
  assert.doesNotMatch(lifecycle, /no-suite=no/);
});

test('automatic local finalization preserves safety, remaining questions, and retry budgets', () => {
  const { stages, presentation, coordinator, lifecycle } = cards();
  const scope = section(coordinator, '## Command-local authorization', '## Roles');
  const finalization = section(stages, '### Step 10:', '## Informative messages');
  assert.match(scope, /merge commit, `git rebase --continue` at each\s+resolved stop, and a collision-repair commit after a finished rebase/);
  assert.match(scope, /expires when this invocation closes/);
  assert.match(scope, /applies to no other command/);
  assert.match(scope, /no push, amend, force,\s+hook bypass, destructive operation, or unrelated change/);
  assert.match(finalization, /directly execute the operation/);
  assert.doesNotMatch(finalization, /needs_input|On `yes`|On `no`/);
  assert.match(finalization, /stop if unrelated staged content would enter a commit/);
  assert.match(finalization, /On a Git failure,[\s\S]+without bypassing checks or claiming success/);
  assert.match(presentation, /Working tree\s+has uncommitted changes\. Continue anyway\?/);
  assert.match(presentation, /Which integration\s+method do you want to use\?/);
  assert.match(stages, /Fail in round 1 or 2/);
  assert.match(stages, /Fail in round 3[\s\S]+run continues as on a pass/);
  assert.match(stages, /After three rounds without a\s+match, stop without staging/);
  assert.match(coordinator, /No\s+merge window carries `allow_commit`/);
  assert.match(lifecycle, /finalization\s+terminal\s+local commit succeeded, or operation failed/);
  const rules = read('sai/policies/commit-rules.md');
  assert.doesNotMatch(rules, /sai-merge/);
  assert.match(stages, /§ Command-local authorization replaces its Authorization gate/);
  assert.match(rules, /Ask through the native closed-choice picker/);
  assert.match(rules, /Never use `--no-verify`/);
});

test('merge task panel and both wrapper descriptions use the new general behavior', () => {
  const todo = section(read('sai/policies/todo-structure.md'), '## Merge adaptive TODO');
  assert.doesNotMatch(todo, /Select resolution scope|resolve-artifacts|resolve-code|Authorize merge|Authorize rebase|Authorize collision|no-suite decision/);
  assert.match(todo, /`resolve-full` \| `Resolve all conflicts` \| Every conflicted route/);
  assert.match(todo, /`finalization` \| `Finalize merge commit`/);
  assert.match(todo, /unavailable-suite notice is reported/);
  const descriptions = ['claude', 'opencode'].map(harness =>
    read(`commands/${harness}/sai-merge.md`).split('\n').find(line => line.startsWith('description:')));
  assert.equal(descriptions[0], descriptions[1]);
  assert.match(descriptions[0], /resolves all conflicts[\s\S]+finalizes locally automatically[\s\S]+fast-track applies presented strategies/);
});
