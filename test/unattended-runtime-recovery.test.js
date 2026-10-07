const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  // Normalize CRLF checkouts (Windows autocrlf) to LF so `## Title\n`
  // section scans hold on every platform. See .gitattributes (eol=lf).
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8').replace(/\r\n/g, '\n');
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function section(document, title) {
  const start = document.indexOf(`## ${title}\n`);
  assert.notEqual(start, -1, `missing section: ${title}`);
  const bodyStart = start + `## ${title}\n`.length;
  const nextHeading = document.indexOf('\n## ', bodyStart);
  return compact(document.slice(bodyStart, nextHeading === -1 ? undefined : nextHeading));
}

test('recovery is reached from both selected unattended routes, not POC or other selectors', () => {
  const policyPath = 'sai/policies/unattended-runtime-recovery.md';
  const policy = read(policyPath);
  const plan = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  const directBuild = read('sai/commands/explore/steps/pipeline-direct-build.md');
  const selector = read('sai/commands/explore/steps/route-selector.md');
  const pocLane = read('sai/commands/explore/steps/poc-lane.md');
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  const policyProjection = manifest.projections.find(({ id }) => id === 'sai-policies');

  assert.ok(policy.length > 0, `${policyPath} should exist and have content`);
  assert.match(plan, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.match(directBuild, /For the full `direct-build-unattended` route only, Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.match(directBuild, /Do not load or apply it to the pinned `--no-specs` POC profile/);
  assert.doesNotMatch(selector, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.doesNotMatch(pocLane, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.deepEqual(policyProjection.harnesses, ['claude', 'opencode']);
  assert.equal(policyProjection.recursive, true);
});

test('recovery follows dispatch, validation, accepted-result, and execute-order precedence', () => {
  const policy = read('sai/policies/unattended-runtime-recovery.md');
  const precedence = section(policy, 'Precedence');
  const dispatch = precedence.indexOf('Dispatch and pre-ready failures');
  const replacement = precedence.indexOf('For a failed continuation');
  const validation = precedence.indexOf('For every returned payload');
  const acceptedResult = precedence.indexOf('A valid worker result');
  const oneShot = precedence.indexOf("Direct Build's backfill and archive execution orders use their role-specific one-shot contracts");
  const runtimeRepair = precedence.indexOf('Any other post-disclosure outcome');

  assert.ok(dispatch >= 0 && dispatch < replacement && replacement < validation && validation < acceptedResult && acceptedResult < oneShot && oneShot < runtimeRepair,
    'existing dispatch, transport, validation, accepted-result, and execution handling must precede generic repair');
  assert.match(precedence, /invalid payload supplies no accepted status, trusted progress, or trusted `changed_files`/);
  assert.match(precedence, /A replacement is not a repair continuation/);
  assert.match(precedence, /When the replacement is spent or the route permits none, the step has no current subagent/);
  assert.match(precedence, /A failed order is issued again only under § Execute orders/);
  assert.doesNotMatch(policy, /may use only the route's existing backfill correction\/relaunch path/);
  assert.match(compact(policy), /Never classify an interruption by its name alone/);
});

test('the recovery path continues the current subagent and hands off to the budget agent on four criteria', () => {
  const decision = section(read('sai/policies/unattended-runtime-recovery.md'), 'Recovery decision');
  const current = decision.indexOf('Continue the **current subagent**');
  const handOff = decision.indexOf('Hand off to the **budget agent** (§ Hand-off) when one of these four criteria holds');

  assert.ok(current >= 0 && handOff > current, 'continuing the current subagent is the default, stated before the hand-off');
  for (const criterion of [
    '1. The contract of the current subagent does not allow it to address the failure.',
    '2. Its context may harm the fix.',
    '3. The fix lies outside its assigned task.',
    '4. It already tried and the diagnosis repeats.',
  ]) {
    assert.ok(decision.slice(handOff).includes(criterion), `missing hand-off criterion: ${criterion}`);
  }
  assert.doesNotMatch(decision.slice(handOff), /\b5\. /, 'the hand-off criteria are exactly four');
  assert.match(decision, /This criterion decides who investigates; the slice paths stay the same/);
  assert.match(decision, /Hand off as well when there is no subagent to continue: it died, hung, or exhausted its replacement/);
  assert.match(decision, /Push, deletion of files foreign to the slice, and changes to shared infrastructure stay unauthorized/);
  assert.match(decision, /no later check can undo such an action/);
});

test('the hand-off has one fixed four-part shape and a guarded two-phase dispatch on both harnesses', () => {
  const handOff = section(read('sai/policies/unattended-runtime-recovery.md'), 'Hand-off');
  const parts = ['1. **State**', '2. **Failure evidence**', '3. **Goal**', '4. **Invariants**'].map((part) => handOff.indexOf(part));

  assert.ok(parts.every((index, i) => index >= 0 && (i === 0 || index > parts[i - 1])), 'state, failure evidence, goal, invariants, in order');
  assert.match(handOff, /carries no procedure/);
  assert.match(handOff, /the step check, as the exact command or validation to make pass/);
  assert.match(handOff, /`budget-subagent` on Claude Code, `budget` on opencode/);
  assert.match(handOff, /two-phase startup/);
  assert.match(handOff, /its own window of `@sai\/policies\/no-commit-guard\.md` § Window pairing, never carrying `allow_commit`/);
  assert.match(compact(read('sai/policies/no-commit-guard.md')), /\*\*Recovery hand-off isolation\*\* — a recovery hand-off to the budget agent \(`@sai\/policies\/unattended-runtime-recovery\.md` § Hand-off\) opens its own window the same way and never carries `allow_commit`/);
});

test('a failed execute order is issued again only after a verified no-effect failure', () => {
  const orders = section(read('sai/policies/unattended-runtime-recovery.md'), 'Execute orders');
  const scope = read('sai/policies/slice-path-scope.md');
  const noEffect = section(scope, 'No-effect check');
  const backfill = compact(read('sai/commands/backfill/worker.md'));
  const archive = compact(read('sai/commands/archive/worker.md'));
  const directBuild = compact(read('sai/commands/explore/steps/pipeline-direct-build.md'));

  assert.match(orders, /Take an order snapshot immediately before sending any execute order and hold it as `order_snapshot`/);
  assert.match(orders, /\*\*No effect verified\*\* — the order changed nothing\..*?then issue a new order to the step's owner/);
  assert.match(orders, /\*\*Completed, partial, or unknown\*\*.*?Issue no order and stop, reporting the exact state/);
  assert.match(orders, /An order that succeeded is consumed and is never issued again/);
  assert.match(noEffect, /run `verify` with `order_snapshot` and an empty standard input/);
  assert.match(noEffect, /`clean` — the order had no effect/);
  assert.match(section(scope, 'Foreign changes'), /A path in `foreign` is a repository file foreign to the slice that changed: the caller reports those exact paths/);
  assert.match(backfill, /A new execute order is accepted only after an order that failed before its first write; the coordinator issues one under `@sai\/policies\/unattended-runtime-recovery\.md` § Execute orders/);
  assert.match(archive, /A new execute order is accepted only after an order that failed before its first mutation; the coordinator issues one under `@sai\/policies\/unattended-runtime-recovery\.md` § Execute orders/);
  assert.doesNotMatch(backfill, /no order is refired onto that partially mutated state/);
  assert.doesNotMatch(archive, /there is no manual fallback and no retry here/);
  assert.match(directBuild, /Issue an execute order again only under its § Execute orders/);
  assert.doesNotMatch(directBuild, /Never use it to replay an execution order/);
  assert.equal(directBuild.split('take the `order_snapshot`, then continue the SAME').length - 1, 2, 'both execute orders take the order snapshot first');
});

test('each failed step allows three attempts shared by both paths on the counters the route already keeps', () => {
  const policy = read('sai/policies/unattended-runtime-recovery.md');
  const attempts = section(policy, 'Attempts');
  const directBuild = compact(read('sai/commands/explore/steps/pipeline-direct-build.md'));
  const charge = attempts.indexOf("Charge the route's existing counter immediately before sending the attempt");
  const nonRefund = attempts.indexOf('does not refund or reset the charge');
  const planCounter = attempts.indexOf('`diagnosis_rounds.spec` or `diagnosis_rounds.design`');
  const directBuildCounter = attempts.indexOf("`diagnosis_rounds.direct_build`, keyed by the failed step's scope");
  const reset = attempts.indexOf('Reset these counters only where the existing route resets its diagnosis state');

  assert.ok(charge >= 0 && charge < nonRefund && nonRefund < planCounter && planCounter < directBuildCounter && directBuildCounter < reset,
    'the existing phase/slice counter is charged before the attempt and its reset boundary is explicit');
  assert.match(attempts, /Each failed step allows three attempts, shared between the two recovery paths/);
  assert.match(attempts, /Count them on the counter the route already keeps in conversation state/);
  assert.match(attempts, /`direct-build` for the implementer across Steps 1–2, `backfill` across Steps 3–6, and `archive` across Steps 7–8/);
  assert.match(attempts, /count the three attempts per close in conversation\. An attempt never adds a fix-loop round/);
  assert.match(attempts, /when the counter reaches three with the step still failing, or when the budget agent returns the diagnosis the previous attempt already returned/);
  assert.match(attempts, /dispatch-retry limit, replacement limit, three-round review\/fix limits, and mutation gates remain unchanged/);
  assert.doesNotMatch(policy, /one-shot diagnosis allowance|Whichever is first consumes it/);
  assert.match(directBuild, /`diagnosis_rounds\.direct_build = \{ direct-build: 0, backfill: 0, archive: 0 \}`/);
});

test('one open resilience rule leads the policy and agreed content passes through unchanged', () => {
  const policy = read('sai/policies/unattended-runtime-recovery.md');
  const decision = section(policy, 'Recovery decision');

  assert.doesNotMatch(policy, /## Worker-compatible continuation/);
  assert.doesNotMatch(policy, /no generic runtime-repair note is authorized/);
  assert.doesNotMatch(policy, /Do not dispatch a replacement, resend the original task as a new dispatch, or repair the result on the coordinator's behalf/);
  assert.doesNotMatch(policy, /never create, alter, or resend an execution order/);
  assert.ok(compact(policy).includes('Can the error be corrected and the planned process continued with the information already available, without leaving what the user authorized?'));
  assert.ok(policy.indexOf('**Resilience rule**') < policy.indexOf('## Scope'), 'the general rule stays the lead');
  assert.match(decision, /the coordinator corrects that input and re-dispatches/);
  assert.match(decision, /Agreed content passes through every correction unchanged/);
  assert.match(decision, /A correction that needs a change to the What, the Why, or the Edge Cases is a contradiction for the user to decide/);
});

test('the review Direct Build close loads the policy and keeps its cap', () => {
  const close = compact(read('sai/commands/meta-review/direct-build-close.md'));

  assert.match(close, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.match(close, /no round is added/);
  assert.match(close, /The loop is capped at three rounds/);
  assert.match(close, /autonomy-audit-log\.md/);
});

test('worker-core carries the authority section and the runner validates payloads as received', () => {
  const core = compact(read('sai/orchestration/worker-core.md'));
  const runner = compact(read('sai/orchestration/command-runner.md'));

  assert.match(core, /## Authority Authorization arrives with the dispatch/);
  assert.match(core, /neither applies them nor copies them into any artifact/);
  assert.match(core, /the route operation prevails/);
  assert.match(runner, /never rewrite, re-serialize, or repair it first/);
});

test('success comes from the step check through its owner, never from a correction report', () => {
  const policy = read('sai/policies/unattended-runtime-recovery.md');
  const after = section(policy, 'After an attempt');
  const stop = section(policy, 'Stop condition');
  const foreign = after.indexOf('1. **Foreign changes.**');
  const owner = after.indexOf('2. **Step check through its owner.**');
  const validation = after.indexOf('Validate the fresh result with the active validator, exactly as received, before acting on it');
  const advance = after.indexOf('Advance a phase, step, or slice only when its ordinary completion conditions pass');

  assert.ok(foreign >= 0 && foreign < owner && owner < validation && validation < advance,
    'foreign-change check, owner rerun, and validation precede phase or step progress');
  assert.match(after, /A correction's own report is evidence, not the result/);
  assert.match(after, /Run the failed step again through its original owner/);
  assert.match(after, /When `foreign` holds a path, stop and report the exact paths; revert nothing/);
  assert.ok(after.includes("Union only paths established by the route's normal evidence rules"));
  assert.match(stop, /the attempts are spent, the diagnosis repeats, a foreign change appears, or an execute order left a completed, partial, or unknown state/);
  assert.match(stop, /Do not ask a routine "how should I proceed\?" question/);
  assert.match(stop, /this policy grants no new authorization/);
});

test('recovery preserves Plan review stops and Direct Build selection, execution-order, and commit gates', () => {
  const plan = compact(read('sai/commands/explore/steps/pipeline-plan-unattended.md'));
  const directBuild = compact(read('sai/commands/explore/steps/pipeline-direct-build.md'));
  const stop = section(read('sai/policies/unattended-runtime-recovery.md'), 'Stop condition');

  assert.match(plan, /A successful Plan \(unattended\) run.*?review here → `\/sai-build \{name\}` in another chat.*?performs no implementation-phase dispatch/);
  assert.match(plan, /`\/sai-3-implement` is never dispatched/);
  assert.match(directBuild, /Selecting it consents delegated writes \(item 1\) AND pre-authorizes one local commit for the current slice/);
  assert.match(directBuild, /after coordinator validation, gate resolution, and the one-commit authorization state are all present/);
  assert.match(directBuild, /never push, amend, retry, or add an action outside the order/);
  assert.match(stop, /Keep the Plan approval\/review stop and Direct Build's selected-scope, validated execution-order, and one-local-commit gates unchanged/);
});
