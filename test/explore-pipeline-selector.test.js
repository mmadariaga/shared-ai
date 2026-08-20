'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const exploreSources = [
  'sai/commands/explore/instructions.md',
  'sai/commands/explore/body.md',
  'commands/claude/sai-explore.md',
  'commands/opencode/sai-explore.md',
];

function exploreContract() {
  return exploreSources.map(relativePath => {
    const fullPath = path.join(repoRoot, relativePath);
    assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
    return fs.readFileSync(fullPath, 'utf8');
  }).join('\n');
}

function spec(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function supervisionContract() {
  return [
    exploreContract(),
    spec('sai/policies/artifact-feedback-gate.md'),
  ].join('\n');
}

test('supervision is entered only through the crystallization-close selector', () => {
  const source = exploreContract();

  assert.doesNotMatch(source, /start-pipeline/);
  assert.match(source, /There is no literal pipeline token/i);
  assert.match(source, /entered \*\*only\*\* through this selector/i);
  assert.match(source, /no token form is recognized/i);
  assert.match(source, /Crystallization-close selector/);
});

test('the selector closes every crystallization emission with exactly two options', () => {
  const source = exploreContract();

  assert.match(source, /items 5, 6, and 7 \u2014 closes its turn with exactly one selector/i);
  assert.match(source, /after the final `Ready to Propose` block and after the keep-window-open recommendation/i);
  assert.match(source, /exactly two options, in this fixed order/i);
  assert.match(source, /\*\*Auto\*\* \u2014 delegate supervised `sai-1` \+ `sai-2` execution/);
  assert.match(source, /\*\*Manual\*\* \u2014 exit the pipeline path and continue by hand/);
  assert.match(source, /AskUserQuestion on Claude Code|`AskUserQuestion` on Claude Code/i);
  assert.match(source, /`question` tool on opencode/i);
  assert.match(source, /remember\.md`? \(L10\u201315\)/);
});

test('Manual is non-terminal, unmapped free text is Manual, and fast-track auto-selects nothing', () => {
  const source = exploreContract();

  assert.match(source, /Selecting \*\*Manual\*\* dispatches nothing, changes no state value/i);
  assert.match(source, /closes the turn with the keep-window-open recommendation naming `review-loop`/i);
  assert.match(source, /maps to neither option is treated as \*\*Manual\*\*/i);
  assert.match(source, /\*\*Manual is not terminal\*\*/);
  assert.match(source, /no cap on re-emissions/i);
  assert.match(source, /`--fast-track` auto-selects nothing/i);
  assert.match(source, /one gate to delegated writes that fast-track never skips/i);
});

test('the selector authorizes the delegated-write exception and is not the removed review picker', () => {
  const source = exploreContract();

  assert.match(source, /the user's explicit selection of the \*\*Auto\*\* option on the crystallization-close pipeline selector/i);
  assert.match(source, /explicit user act that authorizes item 1's delegated-write exception/i);
  assert.match(source, /consent to selection and dispatch only/i);
  assert.match(source, /is \*\*not\*\* the removed global Yes\/No review picker/i);
  assert.match(source, /this review loop stays picker-free at crystallization/i);
});

test('the crystallization closing recommendation names review-loop and no pipeline token', () => {
  const source = exploreContract();

  assert.match(source, /The recommendation names no pipeline token/);
  assert.match(source, /names the literal token `review-loop` exactly once/);
  assert.match(source, /emit the crystallization-close pipeline selector \(item 10\) exactly once as the final step of the turn/);
  assert.match(source, /an inline refusal is a crystallization emission and closes exactly like items 5 and 6/i);
});

test('the selector prompt and labels localize while the command literals stay English', () => {
  const source = exploreContract();

  assert.match(source, /question text and both option labels render in the user's language/i);
  assert.match(source, /`review-loop`, `\/sai-1-spec`, and `\/sai-2-design` strings stay verbatim English/);
});

test('supervision tracks ordered unique changes and dispatches only eligible work', () => {
  const source = exploreContract();

  for (const term of [
    /tracked_changes/,
    /completed_changes/,
    /active_change/,
    /ordered unique|duplicate[- ]free|first[- ]emission order/i,
    /empty|completed.*set|already completed/i,
    /Cancel/,
    /one remaining|single remaining|without a picker/i,
    /failed|cancelled.*retry|retryable/i,
    /active.*reject|duplicate starts/i,
  ]) assert.match(source, term);
});

test('supervised spec dispatch preserves the selected block and branches between auto-answer and escalation', () => {
  const source = exploreContract();

  assert.match(source, /SpecWorkerRequest/);
  assert.match(source, /crystallized_block/);
  assert.match(source, /selected change.*complete.*Ready to Propose|complete.*emitted Ready to Propose/i);
  assert.match(source, /only.*selected.*block|receives only.*block/i);
  assert.match(source, /needs_input/);
  assert.match(source, /ordered option|options.*order|order.*option/i);
  assert.match(source, /auto[- ]answer/i);
  assert.match(source, /escalat/i);
  assert.match(source, /closed[- ]choice/i);
  assert.match(source, /worker's own offered option values|offered option values.*worker/i);
  assert.match(source, /same worker/);
  assert.match(source, /only.*user.*answer|user's answer/i);
});

test('supervised question autonomy uses qualitative confidence and escalates ambiguity', () => {
  const source = exploreContract();

  assert.match(source, /confidence is judged qualitatively/i);
  assert.match(source, /Ambiguity resolves toward escalation/i);
  assert.match(source, /borderline|unclear/i);
  assert.match(source, /(?:borderline|unclear).*escalat|escalat.*(?:borderline|unclear)/i);
});

test('supervised auto-answers require bounded grounding and escalate ungrounded answers', () => {
  const source = exploreContract();

  assert.match(source, /The answer must be located in the permitted grounding sources/i);
  assert.match(source, /The permitted grounding sources are bounded/i);
  assert.match(source, /conversation-only|ungrounded/i);
  assert.match(source, /(?:conversation-only|ungrounded).*escalat|escalat.*(?:conversation-only|ungrounded)/i);
});

test('below-threshold questions preserve exact worker wording and continue the same worker', () => {
  const source = exploreContract();

  assert.match(source, /Below-threshold questions escalate to the user unchanged/i);
  assert.match(source, /worker's exact question/i);
  assert.match(source, /exact option labels\/values/i);
  assert.match(source, /harness-native picker/i);
  assert.match(source, /selected value.*same worker|same worker.*selected value/i);
  assert.match(source, /same-worker continuation|same worker continuation/i);
});

test('question autonomy is limited to selector-dispatched supervision', () => {
  const source = exploreContract();

  assert.match(source, /Autonomy is scoped to supervised spec execution/i);
  assert.match(source, /selector-dispatched supervision only/i);
  assert.match(source, /independent `?\/sai-1-spec`?/i);
  assert.match(source, /standalone coordinator.*unchanged|unchanged.*standalone coordinator/i);
});

test('each auto-answer emits the interim accountability notice with ordered fields', () => {
  const source = exploreContract();

  assert.match(source, /Auto-answered questions are reported/i);
  assert.match(source, /minimal interim notice at the point of answering|existing minimal interim notice/i);
  assert.match(source, /Auto-answered \(supervised\):.*\u2192.*\n\s+\[grounding:.*\u2014/is);
  assert.match(source, /question.*answer.*grounding.*citation/is);
});

test('supervised autonomy keeps state in conversation and tracks escalations', () => {
  const source = exploreContract();

  assert.match(source, /in-conversation-only|conversation-only state/i);
  assert.match(source, /per-auto-answer record|auto-answer record/i);
  assert.match(source, /question.*answer.*grounding citation/is);
  assert.match(source, /running escalated count/i);
  assert.match(source, /scoped to this selector-dispatched supervision only/i);
});

test('machine feedback continues each actionable finding to the same phase worker', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/instructions.md'), 'utf8');
  const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /MachineFeedbackAdapter/);
  assert.match(source, /sai\/policies\/artifact-feedback-gate\.md/);
  assert.match(source, /needs_input/);
  assert.match(source, /same (?:spec[- ]proposal|spec|design|phase)[- ]?worker/i);

  assert.match(policy, /For each finding.*one same-worker continuation/i);
  assert.match(policy, /per-item legitimacy rules/i);
  assert.match(policy, /artifact-only scope/i);
  assert.match(policy, /decision-summary recomputation/i);
  assert.match(policy, /Accepted changes remain worker-owned.*proposal\.md.*specs/si);
  assert.match(policy, /specific discard reporting|Every discarded finding.*specific reason/i);
});

test('machine feedback cannot enter or advance the user gate or proceed branch', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /emits neither the picker nor the empty-turn prompt/i);
  assert.match(source, /does not consume a user feedback turn/i);
  assert.match(source, /does not increment.*iteration counter/i);
  assert.match(source, /does not execute.*proceed-label.*next-action/i);
});

test('iteration zero offers feedback after the supervised review rounds settle', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /empty findings array is a no-op/i);
  assert.match(source, /Defer the ordinary user-facing gate while another (?:review pass|review round) is required/i);
  assert.match(source, /Present that gate for the first time, unchanged at iteration 0, only after the review (?:loop converges|rounds converge), exhausts? its three[- ]round cap, or is interrupted by worker failure\./i);
  assert.match(source, /first ordered labels remain.*Give feedback \(Recommended\).*proceed-label/i);
  assert.match(source, /iteration 0/);
});

test('explore remains read-only and closes with the supervised in-session completion contract', () => {
  const source = exploreContract();

  assert.match(source, /Explore.*no direct write|no direct write/i);
  assert.match(source, /owned change directory|limited to.*change directory/i);
  assert.match(source, /review-loop/);
  assert.match(source, /Crystallization-close selector/);
  assert.match(source, /user[- ]triggered|user triggered|user-selected/i);
  for (const harness of ['Claude Code', 'opencode']) {
    assert.match(source, new RegExp(harness.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(
    source,
    /Supervised sai-1 done in openspec\/changes\/\{name\}\/\./
  );
  assert.doesNotMatch(source, /sai-2 was not run|Independent review and artifact feedback are complete/i);
  assert.match(
    source,
    /(?:spec convergence|spec.*converg|cap exhaustion)[\s\S]{0,200}(?:chain|proceed|continue)[\s\S]{0,120}(?:design|sai-2)/i
  );
  assert.match(source, /Ready to Propose/);
});

test('Claude Code explore adapter permits worker supervision without direct writes', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'commands/claude/sai-explore.md'), 'utf8');

  const allowedToolsLine = source.match(/^allowed-tools:\s*(.+)$/im);
  assert.ok(allowedToolsLine, 'allowed-tools frontmatter should exist');
  const allowedTools = allowedToolsLine[1].split(',').map(tool => tool.trim());

  assert.ok(allowedTools.includes('Agent'));
  assert.ok(allowedTools.includes('SendMessage'));
  assert.ok(allowedTools.includes('Bash(openspec:*)'));
  assert.ok(allowedTools.includes('Bash(git:*)'));
  assert.equal(allowedTools.includes('Edit'), false);
  assert.equal(allowedTools.includes('Write'), false);
  assert.equal(allowedTools.includes('Bash'), false);
});

test('Step 1 explore adapters route only the permitted planning workers', () => {
  const claude = fs.readFileSync(path.join(repoRoot, 'commands/claude/sai-explore.md'), 'utf8');
  const opencode = fs.readFileSync(path.join(repoRoot, 'commands/opencode/sai-explore.md'), 'utf8');
  const launcher = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/launcher.md'), 'utf8');

   assert.match(claude, /Fetch @sai\/adapters\/claude\/idea-list-render\.md/);
   assert.match(claude, /Fetch @sai\/commands\/explore\/launcher\.md/);
   assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/);
   assert.doesNotMatch(claude, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Edit(?:,|\s|$)/m);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Write(?:,|\s|$)/m);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Bash(?:,|\s|$)/m);

    assert.match(opencode, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/);
    assert.match(opencode, /Fetch @sai\/commands\/explore\/launcher\.md/);
   assert.doesNotMatch(opencode, /Fetch @skills\/sai-1-spec-proposal-worker\/SKILL\.md/);
    assert.doesNotMatch(opencode, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
    assert.doesNotMatch(opencode, /managed coordinator|reviewer[- ](?:binding|skill|agent)/i);

  for (const retiredPath of [
    'commands/copilot/sai-explore.prompt.md',
    'sai/orchestration/inline-invocation.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('opencode explore adapter enables native task dispatch with both numbered planning workers', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'commands/opencode/sai-explore.md'), 'utf8');
  const launcher = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/launcher.md'), 'utf8');

    assert.match(source, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/);
    assert.match(source, /Fetch @sai\/commands\/explore\/launcher\.md/);
    assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/);
   assert.doesNotMatch(source, /Fetch @skills\/sai-1-spec-proposal-worker\/SKILL\.md/);
   assert.doesNotMatch(source, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
   assert.doesNotMatch(source, /sai-coordinator|managed coordinator/i);
   assert.doesNotMatch(source, /reviewer[- ](?:binding|skill|agent)|independent[- ]review.*(?:binding|skill|agent)/i);
});

test('retired Copilot and inline explore surfaces are absent', () => {
  for (const retiredPath of [
    'commands/copilot/sai-explore.prompt.md',
    'sai/orchestration/inline-invocation.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('install manifest projects shared explore assets and routed spec assets only to routed harnesses', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/install-manifest.json'), 'utf8');

  assert.match(source, /Claude Code|claude/i);
  assert.match(source, /opencode/i);
  assert.doesNotMatch(source, /Copilot|copilot/i);
  assert.match(source, /sai-1-spec-proposal-worker/);
  assert.match(source, /shared.*instruction|instruction.*shared|policies/i);
  assert.doesNotMatch(source, /reviewer.*lifecycle|independent.*reviewer.*projection/i);
});

test('direct spec and design wrappers retain their existing terminal contracts', () => {
  const source = [
    'commands/claude/sai-1-spec.md',
    'commands/opencode/sai-1-spec.md',
    'commands/claude/sai-2-design.md',
    'commands/opencode/sai-2-design.md',
  ].map(relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')).join('\n');

  assert.doesNotMatch(source, /start-pipeline|pipeline selector.*adapter|explore.*adapter/i);
  assert.doesNotMatch(source, /independent[- ]reviewer|reviewer[- ]binding/i);
  for (const retiredPath of [
    'commands/copilot/sai-1-spec.prompt.md',
    'commands/copilot/sai-2-design.prompt.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('Step 1 continues every completed-round finding to the same phase worker', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /For every completed review pass in the bounded convergence loop|For every completed review round/i);
  assert.match(feedbackGate, /For each finding in that (?:pass|round), in array order, perform one same-worker continuation/i);
  assert.match(feedbackGate, /Complete all findings for the current (?:pass|round) before supervision evaluates whether another (?:fresh review pass|review round) is required/i);
});

test('Step 1 preserves artifact-only worker ownership and specific discard reasons', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );
  const supervision = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/instructions.md'), 'utf8');

  assert.match(feedbackGate, /Accepted changes remain worker-owned and may be written only by that worker to `proposal\.md` or `specs\/\*\*` in the selected change directory/i);
  assert.match(feedbackGate, /Report every \*\*discarded\*\* item individually[\s\S]{0,240}specific reason/i);
  assert.match(supervision, /The spec worker is the only delegated writer: its write scope is limited to `proposal\.md`, `specs\/\*\*`, and permitted metadata in its selected change directory/i);
  assert.match(supervision, /Explore never writes directly/i);
});

test('Step 1 defers the ordinary gate until review convergence, round cap, or interruption', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /Defer the ordinary user-facing gate while another (?:review pass|review round) is required/i);
  assert.match(feedbackGate, /Present that gate for the first time, unchanged at iteration 0, only after the review (?:loop converges|rounds converge), exhausts? its three[- ]round cap, or is interrupted by worker failure\./i);
  assert.match(feedbackGate, /Its first ordered labels remain `Give feedback \(Recommended\)` followed by `proceed-label`/i);
});

test('Step 1 gives each routed feedback selection exactly one coordinator-owned text prompt', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /## Parameters[\s\S]{0,500}`artifacts`[\s\S]{0,500}`proceed-label`[\s\S]{0,500}`next-action`/i);
  assert.match(feedbackGate, /routed feedback selection[\s\S]{0,300}coordinator/i);
  assert.match(feedbackGate, /exactly one clean feedback-text prompt/i);
  assert.match(
    feedbackGate,
    /worker[\s\S]{0,180}(?:must not|does not|never)[\s\S]{0,120}(?:emit|present|output)[\s\S]{0,120}(?:feedback|prompt)/i
  );
});

test('Step 1 gives repeated feedback selections independent coordinator prompts without worker prompts', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /each selection[\s\S]{0,240}independent coordinator prompt/i);
  assert.match(feedbackGate, /no additional worker prompt/i);
});

test('Step 1 preserves the feedback heading, iteration labels, language, selection, and machine-feedback semantics', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /## On "Give feedback"/);
  assert.match(feedbackGate, /`Give feedback \(Recommended\)`[\s\S]{0,180}`Give more feedback`/i);
  assert.match(feedbackGate, /render it in the user's language/i);
  assert.match(feedbackGate, /Apply feedback \*\*selectively per item\*\*/i);
  assert.match(feedbackGate, /## Machine-feedback adapter \(supervised (?:sai-1 only|phases)\)/i);
});

test('Step 1 applies routed ownership to sai-1 and sai-2', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /routed[\s\S]{0,240}sai-1[\s\S]{0,240}sai-2/i);
});

test('Step 4 synchronizes the normative artifact feedback gate contract', () => {
  const normative = fs.readFileSync(
    path.join(repoRoot, 'openspec/specs/artifact-feedback-gate/spec.md'),
    'utf8'
  );

  assert.match(normative, /sai\/policies\/artifact-feedback-gate\.md/);
  assert.match(normative, /sai\/policies\/remember\.md/);
  assert.match(normative, /Give feedback \(Recommended\)/i);
  assert.match(normative, /Give more feedback/i);
  assert.match(normative, /exactly one[\s\S]{0,160}routed[\s\S]{0,160}coordinator[\s\S]{0,160}prompt/i);
  assert.match(normative, /sai-2[\s\S]{0,240}Continue[\s\S]{0,240}terminal design navigation/i);

  assert.doesNotMatch(normative, /sai-2 gate coexists with the existing \(b\) confirm without stale re-reads/i);
  assert.doesNotMatch(normative, /\(a\)[\s\S]{0,500}\(b\)[\s\S]{0,500}continuation/i);
});

test('Step 2 reports auto-answered questions at every terminal outcome with grounding citations', () => {
  const source = exploreContract();

  assert.match(source, /Auto-answered questions are reported at every phase ending/i);
  assert.match(source, /convergence.*cap exhaustion.*(?:worker failure|failed|cancelled).*worker/is);
  assert.match(source, /each.*auto[- ]answer.*grounding citation|grounding citation.*each.*auto[- ]answer/is);
});

test('Step 2 reports only the aggregate escalation denominator without escalated question content', () => {
  const source = exploreContract();

  assert.match(source, /The audit log reports the escalation denominator/i);
  assert.match(source, /escalated question content is absent from the audit log/i);
});

test('Step 2 keeps the autonomy audit in conversation and never persists it', () => {
  const source = exploreContract();

  assert.match(source, /The audit log is never persisted/i);
  assert.match(source, /in[- ]conversation text|conversation[- ]only/i);
  assert.match(source, /no file.*artifact.*configuration|never written to any file.*artifact.*config/i);
});

test('Step 2 pins the autonomy audit field order and empty-report form', () => {
  const source = exploreContract();

  assert.match(source, /Autonomy audit.*supervised spec phase/is);
  assert.match(source, /Auto-answered:.*Escalated:/i);
  assert.match(source, /Q:.*A:.*Grounding:/is);
  assert.match(source, /no questions were auto-answered this phase/i);
});

test('supervised pipeline state extends the selector interface by phase with separate round counters', () => {
  const source = supervisionContract();

  for (const field of [
    'tracked_changes',
    'last_crystallization_set',
    'completed_changes',
    'active_change',
    'active_phase',
    'auto_answered',
    'escalated_count',
    'specs_converged_changes',
    'review_rounds',
  ]) assert.match(source, new RegExp(`\\b${field}\\b`));

  assert.match(source, /auto_answered.*phase-keyed|phase-keyed.*auto_answered/i);
  assert.match(source, /escalated_count.*phase-keyed|phase-keyed.*escalated_count/i);
  assert.match(source, /review_rounds[\s\S]{0,180}(?:`?spec`?|"spec")[\s\S]{0,180}(?:`?design`?|"design")|(?:`?spec`?|"spec")[\s\S]{0,180}review_rounds[\s\S]{0,180}(?:`?design`?|"design")/i);
  assert.doesNotMatch(source, /\breview_passes\b/);
  assert.doesNotMatch(source, /\bfinding_history\b/);
  assert.match(source, /spec-to-design transition adapter|transition adapter.*design/i);
  assert.match(source, /On an \*\*Auto\*\* selection, use only `last_crystallization_set` and `completed_changes`/);
  assert.match(source, /review loop's \(item 9\) source only, and is never the selector's dispatch source/i);
  assert.match(source, /replaces `last_crystallization_set` with that turn's emitted names/i);
  assert.match(source, /assumed applied or discarded/i);
  assert.match(source, /wrapper_echo_value\s*:\s*""/);
  assert.match(source, /arguments_value\s*:\s*"\{name\} --fast-track"/);
});

test('supervised review reports spec convergence or cap exhaustion before design dispatch and preserves the token', () => {
  const source = supervisionContract();

  assert.match(
    source,
    /spec phase.*converg[\s\S]{0,360}(?:pass outcome|round outcome|autonomy audit)[\s\S]{0,360}(?:design worker|design dispatch)/i
  );
  assert.match(source, /same active supervised invocation and `active_change` remain in force/i);
  assert.match(source, /spec (?:phase )?cap exhaustion[\s\S]{0,200}(?:chain|proceed|continue|dispatch)[\s\S]{0,120}(?:design|sai-2)/i);
  assert.match(source, /failed or cancelled spec-worker[\s\S]{0,180}(?:no design|design worker.*not|does not dispatch design)/i);
});

test('Step 2 blind supervision rejects duplicate starts until the chained design outcome', () => {
  const source = supervisionContract();

  assert.match(source, /Active supervision rejects another \*\*Auto\*\* selection/i);
  assert.match(source, /throughout the chained design phase/i);
  assert.match(source, /ends only at the applicable terminal outcome/i);
  assert.match(source, /spec and design.*(?:review_rounds|review rounds).*autonomy records remain separate|spec and design.*autonomy records remain separate/i);
  assert.match(source, /completed_changes.*applicable terminal worker result/i);
  assert.match(source, /specs_converged_changes.*active_phase.*design/i);
});

test('active exploration closure defines the three conversation-only states and success-only rule', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /\*\*Pre-crystallization closure \(sai-explore only\):\*\*/);
  assert.match(source, /The state is exactly one of `active-uncrystallized`, `crystallized`, or `discarded`/);
  assert.match(source, /Before a candidate idea exists, no Closure State is active/);
  assert.match(source, /Once a candidate idea exists under active exploration, its state starts as `active-uncrystallized`/);
  assert.match(source, /The one-time readiness signal remains at most once per stable idea/);
  assert.match(source, /On every successful turn while the state is `active-uncrystallized`/);
  assert.match(source, /genuine unresolved question remains/);
  assert.match(source, /When no genuine unresolved question remains/);
  assert.match(source, /Say `crystallize` when ready; crystallization generates the paste-ready prompt for `\/sai-1-spec`/);
  assert.match(source, /every later successful qualifying turn/);
});

test('Claude Code and opencode consume the same shared closure contract', () => {
  const shared = spec('sai/commands/explore/instructions.md');
  const claude = spec('commands/claude/sai-explore.md');
  const opencode = spec('commands/opencode/sai-explore.md');

  assert.match(claude, /Fetch @sai\/adapters\/claude\/boot\.md and follow it\./);
  assert.match(opencode, /Fetch @sai\/adapters\/opencode\/boot\.md and follow it\./);
  assert.equal(
    claude.match(/command_name:\s*explore/)?.[0],
    opencode.match(/command_name:\s*explore/)?.[0]
  );

  for (const literal of [
    /active-uncrystallized/,
    /crystallized/,
    /discarded/,
    /crystallize/,
    /\/sai-1-spec/,
  ]) {
    assert.match(shared, literal);
    assert.doesNotMatch(claude, literal);
    assert.doesNotMatch(opencode, literal);
  }
});

test('Step 1 parses an optional overview language before fast-track and defaults to English', () => {
  const source = spec('sai/commands/explore/body.md');

  assert.match(source, /## Overview-language parse/);
  assert.match(source, /--overview-lang <language>/);
  assert.match(source, /English/);
  assert.match(source, /non-empty/);
  assert.match(source, /duplicate/i);
  assert.match(source, /missing.*value|value.*missing/i);
  assert.match(source, /before.*resolution|resolution.*before/i);
  assert.match(source, /--fast-track/);
});

test('Step 1 forwards selected language only through supervised design state', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /overview_language/);
  assert.match(source, /--overview-lang/);
  assert.match(source, /selected.*language|language.*selected/i);
  assert.match(source, /arguments_value:\s*"\{name\} --fast-track"/);
  assert.match(source, /arguments_value:\s*"\{name\} --fast-track --overview-lang \{overview_language\}"/);
  assert.match(source, /not.*persist|never.*persist/i);
  assert.match(source, /failed\/cancelled retry|failed or cancelled retry|retry/i);
});

test('Step 1 keeps explore wrapper documentation equivalent across both harnesses', () => {
  for (const relativePath of [
    'commands/claude/sai-explore.md',
    'commands/opencode/sai-explore.md',
  ]) {
    const source = spec(relativePath);
    assert.match(
      source,
      /argument-hint:.*--overview-lang <language>.*--fast-track/,
      `${relativePath} should document both optional flags`
    );
  }
});

test('Step 1 rejects malformed language input before dispatch', () => {
  const source = exploreContract();

  assert.match(source, /Missing value for --overview-lang|missing.*value.*--overview-lang/i);
  assert.match(source, /duplicate.*--overview-lang|--overview-lang.*duplicate/i);
  assert.match(source, /no.*resolution|before.*change.*resolution/i);
  assert.match(source, /no.*dispatch|without.*dispatch/i);
});

// ─── Step 2: spec-design-review-progress-step (worker-owned planning-artifact review loop) ─

test('Step 2: worker edits stay within reviewed artifacts and discards name specific reasons', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const coordinator = spec('sai/commands/spec/coordinator.md');

  assert.match(worker, /The worker alone applies legitimate corrections within the reviewed set/,
    'a legitimate finding should be corrected by the worker');
  assert.match(worker, /Findings may target only reviewed-set files/,
    'worker edits should be limited to the reviewed artifacts');
  assert.match(worker, /reports every discard with its specific reason/,
    'a discarded finding should carry a specific rejection reason');
  assert.match(coordinator, /Report worker-authored discards/,
    'the coordinator should surface worker-authored discards');
});

test('Step 2: accepted edits re-verify and recompute the decision summary without re-emitting earlier progress ids', () => {
  const worker = spec('sai/commands/spec/worker.md');

  assert.match(worker, /If any correction is accepted, re-run pre-completion artifact verification/,
    'accepted edits should trigger re-verification of the artifacts');
  assert.match(worker, /recompute the decision summary from current artifacts/,
    'the decision summary should be recomputed from current artifacts');
  assert.match(worker, /without re-emitting or reopening `proposal`, `specs`, or `validation`/,
    'earlier progress ids should not be re-emitted');
});

test('Step 2: the validation progress event precedes any review event', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const coordinator = spec('sai/commands/spec/coordinator.md');

  assert.match(worker, /the `validation` progress event has been emitted[\s\S]{0,160}run the automatic review loop/,
    'the validation progress event should precede the review loop');
  assert.match(worker, /decision-summary derivation report `validation`/,
    'validation should be reported as a progress event');
  assert.match(worker, /a completed worker-owned review pass reporting `High=0` reports `review`/,
    'review should be reported as a progress event');
  assert.match(coordinator, /`validation`[\s\S]{0,120}`review`/,
    'the plan should order validation before review');
});

test('Step 2: an empty reference skips intent coverage but keeps the remaining axes and the High=0 review mark', () => {
  const worker = spec('sai/commands/spec/worker.md');

  assert.match(worker, /or an empty set when that envelope carries only a change name/,
    'the contract should cover an empty reference');
  assert.match(worker, /An empty reference set makes intent coverage inapplicable/,
    'intent coverage should be skipped when the reference is empty');
  assert.match(worker, /The reviewer evaluates reviewed-set consistency, requirement\/scenario testability, and unsupported assumptions/,
    'the remaining axes should still be evaluated');
  assert.match(worker, /it also evaluates intent coverage when the reference set is non-empty/,
    'intent coverage should apply only for a non-empty reference');
  assert.match(worker, /but still permits a full completed pass/,
    'an empty reference should still permit a full completed pass');
  assert.match(worker, /A completed pass with `High=0` converges, emits `review` once when still unmarked/,
    'review may be marked when High=0 even with an empty reference');
});

test('Step 2: worker review stays active under supervision without a routed task list', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const supervision = spec('sai/commands/explore/instructions.md');

  assert.match(worker, /supervised pipeline/i,
    'the worker contract should cover supervised invocation');
  assert.match(worker, /coexists with and never replaces the supervised pipeline's (?:independent convergence loop|supervised review rounds|in[- ]session review rounds)/i,
    'worker review should run in addition to the supervised rounds');
  assert.match(worker, /`MachineFeedbackAdapter`/,
    'the worker-owned loop should coexist with the MachineFeedbackAdapter');
  assert.match(supervision, /no adapter-declared plan is in force in the supervised flow/,
    'no routed progress plan should be in force under supervision');
  assert.match(supervision, /no plan-based list renders/,
    'no routed task list should render under supervision');
  assert.match(supervision, /Step marking has no application/,
    'step marking should have no application in the supervised flow');
});

// ─── Step 3: spec-design-review-progress-step (supervised design review) ────

test('Step 3: supervised design keeps the worker-owned review and the supervised review rounds both active without routed-list marking', () => {
  const worker = spec('sai/commands/design/worker.md');
  const supervision = spec('sai/commands/explore/instructions.md');

  assert.match(worker, /supervised pipeline/i,
    'the design worker contract should cover supervised invocation');
  assert.match(worker, /coexists with and never replaces the supervised pipeline's (?:independent convergence loop|supervised review rounds|in[- ]session review rounds)/i,
    'the design worker-owned review should coexist with the supervised rounds');
  assert.match(worker, /(?:no|without|never)[\s\S]{0,160}(?:adapter-declared plan|routed list|plan-based list|step marking)/i,
    'the design worker should not mark routed list steps under supervision');
  assert.match(
    worker,
    /under supervision[\s\S]{0,120}no routed[- ]list[\s\S]{0,200}(?:adapter-declared plan|plan-based list|step marking)/i,
    'the supervised design worker should mark no routed-list steps'
  );
  assert.match(
    supervision,
    /(?:design|sai-2)[\s\S]{0,240}no plan-based list renders|no plan-based list renders[\s\S]{0,240}(?:design|sai-2)/i,
    'no plan-based list should render in the supervised design flow'
  );
});

// ─── Step 1: supervised-review-in-session (in-session review rounds) ─

test('supervised review rounds invoke the Review Engine in-session without a reviewer subagent', () => {
  const source = supervisionContract();

  assert.match(source, /supervised review round|review rounds|in[- ]session review/i);
  assert.match(source, /Review[\s-]?Engine\(changeName[\s\S]{0,120}artifactSet|Review[\s-]?Engine\(\s*changeName\s*,\s*artifactSet/i);
  assert.match(source, /artifactSet[\s\S]{0,160}sai-1\|sai-2|sai-1\|sai-2[\s\S]{0,160}artifactSet/i);
  assert.match(source, /spec[\s\S]{0,160}design[\s\S]{0,160}(?:pair|chain|phase pairing|same phase)/i);
  assert.match(source, /in[- ]session/i);
  assert.match(source, /no reviewer subagent|does not dispatch a reviewer subagent/i);
  assert.doesNotMatch(source, /IndependentReviewResult|IndependentReviewFinding/);
});

test('supervised review state uses separate phase round counters without findings history', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /review_rounds/);
  assert.match(source, /review_rounds[\s\S]{0,180}(?:`?spec`?|"spec")[\s\S]{0,180}(?:`?design`?|"design")|(?:`?spec`?|"spec")[\s\S]{0,180}review_rounds[\s\S]{0,180}(?:`?design`?|"design")/i);
  assert.doesNotMatch(source, /\breview_passes\b/);
  assert.doesNotMatch(source, /\bfinding_history\b/);
  assert.match(source, /at most three review rounds|three[- ]round cap|three-round cap/i);
  assert.match(source, /manual (?:review|counters)[\s\S]{0,160}(?:separate|do not count|does not count|does not increment)|separate from supervised rounds/i);
});

test('supervised rounds preserve worker-owned edits and fresh disk evidence', () => {
  const source = supervisionContract();

  assert.match(source, /fresh disk (?:re[- ]?read|read)|re[- ]?read[s]? (?:from|the) disk|fresh[\s\S]{0,120}disk/i);
  assert.match(source, /same (?:spec|design|phase)[- ]?worker/i);
  assert.match(source, /Explore never writes directly/i);
  assert.match(source, /read[- ]only/i);
  assert.match(source, /per-item legitimacy/i);
  assert.match(source, /specific discard|discard[\s\S]{0,80}specific reason/i);
});

test('cap exhaustion reports one tally line and continues the supervised run', () => {
  const source = supervisionContract();

  assert.match(source, /cap exhaustion[\s\S]{0,200}(?:one|single)[\s\S]{0,60}line|(?:one|single)[\s\S]{0,60}line[\s\S]{0,200}cap exhaustion/i);
  assert.match(source, /Summary:\s*High=<count>\s*Medium=<count>\s*Low=<count>/i);
  assert.match(source, /(?:spec|sai-1)[\s\S]{0,120}cap exhaustion[\s\S]{0,240}(?:chain|proceed|continue|dispatch)[\s\S]{0,160}(?:design|sai-2)/i);
  assert.match(source, /(?:design|sai-2)[\s\S]{0,120}cap exhaustion[\s\S]{0,240}(?:complet|terminal|end|finish)/i);
  assert.doesNotMatch(source, /Outstanding High:|Contract-violations=/);
});

test('supervised review rounds drive the phase review item in-progress state', () => {
  const source = supervisionContract();

  assert.match(source, /reviewed-sai-1[\s\S]{0,200}in_progress|in_progress[\s\S]{0,200}reviewed-sai-1/i);
  assert.match(source, /reviewed-sai-2[\s\S]{0,200}in_progress|in_progress[\s\S]{0,200}reviewed-sai-2/i);
  assert.match(source, /cap exhaustion[\s\S]{0,160}(?:resolv|pending)/i);
  assert.match(source, /render[- ]only/i);
});

test('manual navigation and worker-owned Phase Review Passes remain distinct', () => {
  const source = supervisionContract();

  assert.match(source, /Review Loop Navigation/i);
  assert.match(source, /four[- ]option|four options|4[- ]option/i);
  assert.match(source, /free-text[\s\S]{0,80}exit|exit[\s\S]{0,80}free-text/i);
  assert.match(source, /Phase Review Pass/i);
  assert.match(source, /worker[- ]owned/i);
});

test('Step 1: artifact feedback gate declares an explicit interactive or supervised mode', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /`mode`[\s\S]{0,180}optional|optional[\s\S]{0,180}`mode`/i);
  assert.match(gate, /interactive/);
  assert.match(gate, /supervised/);
  assert.match(gate, /(?:omitted|missing)[\s\S]{0,140}interactive|default(?:s|ing)?[\s\S]{0,100}interactive/i);
  assert.match(gate, /invalid[\s\S]{0,180}(?:non-empty[\s\S]{0,80})?mode[\s\S]{0,180}STOP|mode[\s\S]{0,180}invalid[\s\S]{0,180}STOP/i);
  assert.match(
    gate,
    /(?:must not|never|do not)[\s\S]{0,180}(?:detect|infer|derive)[\s\S]{0,180}(?:invocation[- ]context|caller|conversation)[\s\S]{0,180}mode/i
  );
});

test('Step 1: supervised mode auto-proceeds without the interactive feedback surfaces', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /supervised[\s\S]{0,320}(?:auto[- ]proceed|automatically)[\s\S]{0,220}`?next-action`?/i);
  assert.match(gate, /supervised[\s\S]{0,420}`?next-action`?[\s\S]{0,180}(?:exactly once|once)/i);
  assert.match(gate, /supervised[\s\S]{0,420}(?:does not|never|no)[\s\S]{0,100}(?:present|emit)[\s\S]{0,100}(?:picker|free-text)/i);
  assert.match(gate, /supervised[\s\S]{0,520}(?:does not|never|no)[\s\S]{0,100}(?:increment|change)[\s\S]{0,100}iteration/i);
  assert.match(gate, /supervised[\s\S]{0,520}(?:does not|never|must not)[\s\S]{0,120}(?:write|modify)[\s\S]{0,100}`?\.openspec\.yaml`?/i);
  assert.match(gate, /failed[\s\S]{0,220}(?:or|and)[\s\S]{0,80}cancelled[\s\S]{0,220}(?:never|not|no)[\s\S]{0,180}(?:auto[- ]proceed|next-action)/i);
});

test('Step 1: supervised placement follows the decision summary and reports follow proceed', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /supervised[\s\S]{0,420}(?:after|following)[\s\S]{0,120}decision summary/i);
  assert.match(gate, /(?:after|following)[\s\S]{0,120}(?:proceed|`?next-action`?)[\s\S]{0,260}(?:report|reporting|summary)/i);
});

test('Step 1: interactive mode keeps Give feedback Recommended before proceed', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );
  const feedback = gate.indexOf('Give feedback (Recommended)');
  const proceed = gate.indexOf('proceed-label');

  assert.match(gate, /interactive[\s\S]{0,320}Give feedback \(Recommended\)[\s\S]{0,240}proceed/i);
  assert.ok(feedback >= 0, 'interactive feedback option should be present');
  assert.ok(proceed >= 0, 'proceed option should be present');
  assert.ok(feedback < proceed, 'interactive feedback should precede proceed');
});

test('Step 2: the supervised spec artifact gate binds mode, Finish, and the phase transition', () => {
  const source = spec('sai/commands/explore/instructions.md');
  const specArtifacts = source.match(/proposal\.md[\s\S]{0,1800}specs\/\*\*/i);

  assert.ok(specArtifacts, 'the supervised spec artifact gate should retain proposal.md and specs/**');
  const specGate = source.slice(
    Math.max(0, specArtifacts.index - 700),
    Math.min(source.length, specArtifacts.index + specArtifacts[0].length + 700)
  );
  assert.match(
    specGate,
    /mode\s*(?:=|:)\s*[`"']?supervised[`"']?/i,
    'the supervised spec artifact gate should explicitly supply mode = supervised'
  );
  assert.match(specGate, /Finish/i,
    'the supervised spec gate should use Finish as its proceed label');
  assert.match(specGate, /next-action[\s\S]{0,160}phase-transition|phase-transition[\s\S]{0,160}next-action/i,
    'the supervised spec gate should use the phase-transition next-action');
});

test('Step 2: the supervised design artifact gate binds mode, Continue, and overview generation', () => {
  const source = spec('sai/commands/explore/instructions.md');
  const designArtifacts = source.match(/design\.md[\s\S]{0,1200}tasks\.md[\s\S]{0,1200}interfaces\.md/i);

  assert.ok(designArtifacts, 'the supervised design artifact gate should retain design.md, tasks.md, and interfaces.md');
  const designGate = source.slice(
    Math.max(0, designArtifacts.index - 700),
    Math.min(source.length, designArtifacts.index + designArtifacts[0].length + 700)
  );
  assert.match(
    designGate,
    /mode\s*(?:=|:)\s*[`"']?supervised[`"']?/i,
    'the supervised design artifact gate should explicitly supply mode = supervised'
  );
  assert.match(designGate, /Continue/i,
    'the supervised design gate should use Continue as its proceed label');
  assert.match(designGate, /next-action[\s\S]{0,180}(?:overview-generation|supervised-terminal)|(?:overview-generation|supervised-terminal)[\s\S]{0,180}next-action/i,
    'the supervised design gate should use the overview-generation/supervised-terminal next-action');
});

test('Step 2: post-proceed report ordering remains after supervised gates without active-supervision interval stage enumeration', () => {
  const source = spec('sai/commands/explore/instructions.md');
  const gate = source.match(
    /(?:proposal\.md[\s\S]{0,500}specs\/\*\*[\s\S]{0,700}(?:Finish|phase-transition)[\s\S]{0,300}(?:phase-transition|Finish)|design\.md[\s\S]{0,350}tasks\.md[\s\S]{0,350}interfaces\.md[\s\S]{0,900}(?:Continue|overview-generation|supervised-terminal)[\s\S]{0,300}(?:overview-generation|supervised-terminal|Continue))/i
  );

  assert.ok(gate, 'a supervised artifact gate should exist before post-proceed reporting');
  const afterGate = source.slice(gate.index + gate[0].length);
  assert.match(afterGate, /Auto-answered:[\s\S]{0,220}Escalated:/i,
    'post-proceed reporting should retain Auto-answered before Escalated');
  assert.match(afterGate, /Q:[\s\S]{0,160}A:[\s\S]{0,160}Grounding:/i,
    'post-proceed reporting should retain question, answer, and grounding order');
  assert.doesNotMatch(
    source,
    /active[- ]supervision\s+interval[\s\S]{0,360}(?:stage|step)[\s\S]{0,180}(?:enumerat|\b1\.[\s\S]{0,80}\b2\.)/i,
    'the supervised contract must not add interval stage-enumeration prose'
  );
});
