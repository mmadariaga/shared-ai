'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const CLAUDE_FETCH_BOOTSTRAP = 'Fetch @skills/fetch/SKILL.md';
const OPENCODE_FETCH_BOOTSTRAP = 'Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.';

const POLICIES = [
  { name: 'budget', fetchTarget: '@sai/policies/budget-agent.md' },
  { name: 'executor', fetchTarget: '@sai/policies/executor-agent.md' },
  { name: 'explore', fetchTarget: '@sai/policies/explore-agent.md' },
];

function policyPath(name) {
  return path.join(REPO_ROOT, 'sai', 'policies', `${name}-agent.md`);
}

function resolveFetchTarget(target) {
  assert.match(target, /^@sai\/policies\/(?:budget|executor|explore)-agent\.md$/,
    'generic-agent policies must use an exact sai policy Fetch target');
  return path.join(REPO_ROOT, target.slice(1).split('/').join(path.sep));
}

function readPolicy(name) {
  const filePath = policyPath(name);
  assert.ok(fs.existsSync(filePath), `${filePath} should exist at the exact policy path`);
  return fs.readFileSync(filePath, 'utf8');
}

test('canonical generic-agent policies resolve from their exact Fetch targets', () => {
  for (const policy of POLICIES) {
    const expectedPath = path.join(REPO_ROOT, 'sai', 'policies', `${policy.name}-agent.md`);
    assert.equal(resolveFetchTarget(policy.fetchTarget), expectedPath,
      `${policy.fetchTarget} should resolve to its matching exact file path`);
    assert.ok(fs.existsSync(expectedPath),
      `${policy.fetchTarget} should resolve to an existing policy file`);
  }
});

test('canonical generic-agent policies are behavior-only documents', () => {
  for (const policy of POLICIES) {
    const content = readPolicy(policy.name);

    assert.doesNotMatch(content, /^---\r?\n/m,
      `${policy.name} policy must not have YAML agent frontmatter`);
    assert.doesNotMatch(content,
      /^\s*(?:description|model|variant|effort|mode|temperature|reasoning|provider|permission|tools|metadata)\s*:/im,
      `${policy.name} policy must not select an agent model or metadata`);
    assert.doesNotMatch(content, /\b(?:installer|installation|install-manifest|projection|projected|destination|ownership|drift)\b/i,
      `${policy.name} policy must not contain installer or projection logic`);
    assert.doesNotMatch(content, /(?:import|require)\s+(?:[^\n]*\b)?(?:open\s*code|opencode)\b|from\s+['"](?:open\s*code|opencode)/i,
      `${policy.name} policy must not contain a native OpenCode import`);
    assert.doesNotMatch(content, /\b(?:claude|opencode|harness)\b|agent\s+registration|register(?:ed|ing)?\s+(?:an?\s+)?agent/i,
      `${policy.name} policy must not contain harness-specific registration`);
  }
});

test('budget policy preserves its bounded one-task completion contract', () => {
  const content = readPolicy('budget');

  assert.match(content, /\b(?:exactly\s+one|one|single)\s+task\b/i,
    'budget policy should require one-task execution');
  assert.match(content, /no\s+self[- ]correction|do\s+not\s+self[- ]correct|must\s+not\s+self[- ]correct/i,
    'budget policy should prohibit self-correction');
  assert.match(content, /bounded\s+output|minimal\s+output|concise\s+output|output\s+(?:length\s+)?cap/i,
    'budget policy should bound output');
  for (const field of ['status', 'actions_taken', 'failures']) {
    assert.match(content, new RegExp(`\\b${field}\\b`),
      `budget policy completion output should include ${field}`);
  }
  assert.match(content, /key\s+result/i,
    'budget policy completion output should include a key result');
  assert.match(content, /permission[- ]block(?:ed)?[\s\S]{0,100}abort|abort[\s\S]{0,100}permission[- ]block(?:ed)?/i,
    'budget policy should abort on a permission block');
  assert.match(content, /(?:approximately\s+)?(?:30|~30)[- ]?(?:tool\s+)?calls?|30[- ]call/i,
    'budget policy should preserve the approximately 30-call cap');
  assert.match(content, /cap|limit|maximum/i,
    'budget policy should describe the call bound as a cap or limit');
});

test('executor policy preserves exact narrow low-output execution and failure tallies', () => {
  const content = readPolicy('executor');

  assert.match(content, /exact[- ]command|execute\s+(?:the\s+)?exact\s+command/i,
    'executor policy should require exact-command execution');
  assert.match(content, /narrow/i,
    'executor policy should keep execution narrow');
  assert.match(content, /low[- ]output|minimal\s+output|concise\s+output/i,
    'executor policy should keep execution output low');
  assert.match(content, /parallel/i,
    'executor policy should permit parallel execution');
  assert.match(content, /independent\s+commands?|commands?[\s\S]{0,100}independent/i,
    'executor policy should identify independent commands as parallelizable');
  assert.match(content, /structured\s+failure|failure\s+details?|failures?/i,
    'executor policy should report structured failure details');
  assert.match(content, /test(?:s)?(?:\s+(?:count|tally|summary|run|pass|fail)|\s*[:=])?/i,
    'executor policy failure details should include test tallies');
  assert.match(content, /build(?:s)?(?:\s+(?:count|tally|summary|run|pass|fail)|\s*[:=])?/i,
    'executor policy failure details should include build tallies');
});

test('explore policy preserves bounded read-only research and its spawn output contract', () => {
  const content = readPolicy('explore');

  assert.match(content, /read[- ]only/i,
    'explore policy should require read-only research');
  assert.match(content, /bounded|limit|cap/i,
    'explore policy should bound research');
  assert.match(content, /caller[- ]owned|owned\s+by\s+the\s+caller/i,
    'explore policy should keep summaries caller-owned');
  assert.match(content, /structured\s+summar(?:y|ies)/i,
    'explore policy should require structured summaries');
  assert.match(content, /no\s+raw\s+output|never\s+(?:return|emit|include)\s+raw\s+(?:output|content)/i,
    'explore policy should prohibit raw output');
  assert.match(content, /(?:approximately\s+)?(?:30|~30)[- ]?(?:tool\s+)?calls?|30[- ]call/i,
    'explore policy should preserve the 30-call cap');
  assert.match(content, /cap|limit|maximum/i,
    'explore policy should describe the call bound as a cap or limit');
  assert.match(content, /output\s+contract/i,
    'explore policy should require a spawn output contract');
  assert.match(content, /exact\s+fields?/i,
    'explore spawn output contract should specify exact fields');
  assert.match(content, /length\s+cap|bounded\s+length|output\s+cap/i,
    'explore spawn output contract should specify a length cap');
  assert.match(content, /no\s+raw\s+(?:output|content)/i,
    'explore spawn output contract should prohibit raw output');
});

test('managed OpenCode generic agents are exact Fetch wrappers with preserved identities', () => {
  const descriptions = {
    budget: 'Binds cost-controlled task delegation to the OpenCode budget agent keyword. General-purpose single-task subagent for file operations, searches, writes, and code analysis.',
    executor: 'Binds "executor subagent" to the OpenCode executor agent keyword. Execute-only command runner with minimal output and structured failure reports.',
    explore: 'Binds "cheap research subagent" to the opencode explore agent keyword. Read-only research and lookup agent with output-contract discipline.',
  };

  for (const name of Object.keys(descriptions)) {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'agents', 'opencode', `${name}.md`), 'utf8')
      .replaceAll('\r\n', '\n');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, `${name} should contain one YAML frontmatter block`);
    assert.equal((source.match(/^---\n/gm) || []).length, 2,
      `${name} should contain exactly one YAML frontmatter block`);

    const fields = frontmatter[1].split('\n');
    for (const field of [
      `name: ${name}`,
      `description: ${descriptions[name]}`,
      'mode: subagent',
      'model: opencode-go/deepseek-v4-flash',
    ]) {
      assert.equal(fields.filter(line => line === field).length, 1,
        `${name} frontmatter should contain exactly ${field}`);
    }

    const body = source.slice(frontmatter[0].length).trim();
    assert.equal(body, `${OPENCODE_FETCH_BOOTSTRAP}\nFetch @sai/policies/${name}-agent.md`,
      `${name} post-frontmatter body should bootstrap fetch resolution before its canonical policy Fetch`);
    assert.doesNotMatch(source,
      /(?:import|require)\s+(?:[^\n]*\b)?(?:open\s*code|opencode)\b|from\s+['"](?:open\s*code|opencode)/i,
      `${name} wrapper must not contain a native OpenCode import`);
  }
});

const CLAUDE_GENERIC_AGENTS = [
  {
    fileName: 'budget-explorer',
    name: 'budget-explorer',
    description: 'Binds cheap read-only research and lookup delegation to the Claude Code budget-explorer agent.',
    fetchTarget: '@sai/policies/explore-agent.md',
    tools: 'tools: Read, Glob, Grep, WebFetch, WebSearch, Skill',
  },
  {
    fileName: 'budget-executor',
    name: 'budget-executor',
    description: 'Binds low-cost execute-only command delegation to the Claude Code budget-executor agent.',
    fetchTarget: '@sai/policies/executor-agent.md',
    tools: null,
  },
  {
    fileName: 'budget-subagent',
    name: 'budget-subagent',
    description: 'Binds cost-controlled general-purpose task delegation to the Claude Code budget-subagent agent.',
    fetchTarget: '@sai/policies/budget-agent.md',
    tools: null,
  },
];

test('managed Claude generic agents are exact Fetch wrappers with preserved identities', () => {
  for (const agent of CLAUDE_GENERIC_AGENTS) {
    const sourcePath = path.join(REPO_ROOT, 'agents', 'claude', `${agent.fileName}.md`);
    assert.ok(fs.existsSync(sourcePath),
      `${agent.fileName} should have a managed Claude agent source at agents/claude/${agent.fileName}.md`);
    const source = fs.readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, `${agent.fileName} should contain one YAML frontmatter block`);
    assert.equal((source.match(/^---\n/gm) || []).length, 2,
      `${agent.fileName} should contain exactly one YAML frontmatter block`);

    const fields = frontmatter[1].split('\n');
    for (const field of [
      `name: ${agent.name}`,
      `description: ${agent.description}`,
      'model: haiku',
      'effort: low',
    ]) {
      assert.equal(fields.filter(line => line === field).length, 1,
        `${agent.fileName} frontmatter should contain exactly ${field}`);
    }

    if (agent.tools) {
      assert.equal(fields.filter(line => line === agent.tools).length, 1,
        `${agent.fileName} frontmatter should contain exactly ${agent.tools}`);
      const toolsLine = fields.find(line => line.startsWith('tools:'));
      assert.doesNotMatch(toolsLine || '', /\b(?:Write|Edit|Bash|Patch|Delete|NotebookEdit)\b/,
        `${agent.fileName} tools declaration must expose only read/search capabilities`);
    }

    const body = source.slice(frontmatter[0].length).trim();
    assert.equal(body, `${CLAUDE_FETCH_BOOTSTRAP}\nFetch ${agent.fetchTarget}`,
      `${agent.fileName} post-frontmatter body should bootstrap fetch resolution before its canonical policy Fetch`);
    assert.doesNotMatch(source,
      /(?:import|require)\s+(?:[^\n]*\b)?(?:open\s*code|opencode)\b|from\s+['"](?:open\s*code|opencode)/i,
      `${agent.fileName} wrapper must not contain a native OpenCode import`);
  }
});

test('OpenCode Fetch wrapper propagation preserves local tuning and resolves updated global policy first', () => {
  const os = require('node:os');
  const { installOpencode } = require('../bin/install-flow.js');
  const { createOpencodeAdapter } = require('../bin/model-customization.js');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'canonicalize-opencode-agent-behavior-'));
  const projectPath = path.join(scratch, 'project');
  const globalAgentRoot = path.join(scratch, 'agents');
  const globalPolicyPath = path.join(scratch, 'sai', 'policies', 'explore-agent.md');
  const localAgentPath = path.join(projectPath, '.opencode', 'agents', 'explore.md');
  const localPolicyPath = path.join(projectPath, '.opencode', 'sai', 'policies', 'explore-agent.md');
  const fetchLine = 'Fetch @sai/policies/explore-agent.md';
  const localExtension = 'PROJECT_LOCAL_EXTENSION_MARKER';
  const globalMarker = 'GLOBAL_CANONICAL_POLICY_MARKER';

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    installOpencode(scratch);

    const adapter = createOpencodeAdapter({
      repoRoot: scratch,
      projectPath,
      packageRoot: scratch,
      globalAgentRoot,
    });
    const result = adapter.createLocalOverride('explore', {
      model: 'opencode-go/glm-5.2',
      variant: 'high',
    });
    assert.equal(result.status, 'persisted',
      'the OpenCode adapter should persist the local explore override');

    const initialLocal = fs.readFileSync(localAgentPath, 'utf8');
    assert.match(initialLocal, /^model: opencode-go\/glm-5\.2$/m,
      'the local explore override should retain the selected model');
    assert.match(initialLocal, /^variant: high$/m,
      'the local explore override should retain the selected variant');
    assert.match(initialLocal, new RegExp(`^${fetchLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'),
      'the local explore override should retain its canonical policy Fetch line');

    fs.appendFileSync(localAgentPath, `${localExtension}\n`);
    const localBeforeRerun = fs.readFileSync(localAgentPath);
    installOpencode(scratch);
    assert.deepEqual(fs.readFileSync(localAgentPath), localBeforeRerun,
      'rerunning setup should preserve the project-local agent byte-for-byte');
    assert.equal(fs.existsSync(localPolicyPath), false,
      'the project should not receive a shadow copy of the canonical explore policy');

    fs.appendFileSync(globalPolicyPath, `\n${globalMarker}\n`);
    const local = fs.readFileSync(localAgentPath, 'utf8');
    const fetchIndex = local.indexOf(fetchLine);
    assert.ok(fetchIndex >= 0, 'the local agent should resolve its canonical Fetch target');
    const target = local.slice(fetchIndex + fetchLine.length);
    const fetchedPolicyPath = fs.existsSync(localPolicyPath) ? localPolicyPath : globalPolicyPath;
    const resolved = fs.readFileSync(fetchedPolicyPath, 'utf8') + target;
    assert.ok(resolved.indexOf(globalMarker) < resolved.indexOf(localExtension),
      'updated global policy content should precede the retained local extension');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

const OPENCODE_BUDGET_SKILL_CONTRACTS = [
  {
    skillName: 'budget-subagent',
    agentName: 'budget',
    fetchTarget: '@sai/policies/budget-agent.md',
    forbidden: [/^## Universal Behavior$/m],
    markers: [
      /agent keyword[\s\S]{0,80}`budget` \(lowercase\)/i,
      /synchronously/i,
      /`model` frontmatter of the budget agent file/i,
      /structured completion report/i,
      /permission-block abort/i,
      /approximately 30-call behavioral limit/i,
      /scope boundaries/i,
      /## Cost model/i,
    ],
  },
  {
    skillName: 'budget-executor',
    agentName: 'executor',
    fetchTarget: '@sai/policies/executor-agent.md',
    forbidden: [/^## Universal Behavior$/m],
    markers: [
      /agent keyword[\s\S]{0,80}`executor` \(lowercase\)/i,
      /synchronously/i,
      /`model` frontmatter of the executor agent file/i,
      /tool[- ]call\s+cap[\s\S]{0,20}\bnone\b/i,
      /structured failure report/i,
      /results of explicitly requested commands and relevant error or compiler messages/i,
      /unrequested full-file dumps/i,
      /unfiltered log streams/i,
      /## Cost model/i,
    ],
  },
  {
    skillName: 'budget-explorer',
    agentName: 'explore',
    fetchTarget: '@sai/policies/explore-agent.md',
    forbidden: [/^## Output contract$/m, /Every subagent spawn MUST declare/i],
    markers: [
      /`explore` \(lowercase\)[\s\S]{0,100}keyword/i,
      /synchronously/i,
      /`model` frontmatter of the explore agent file/i,
      /30 tool calls/i,
      /output contract/i,
      /explore-agent\.md/i,
      /## Cost model/i,
    ],
  },
];

function extractSkillFetchTargets(content) {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^Fetch @sai\/policies\/(?:budget|executor|explore)-agent\.md$/.test(line));
}

test('OpenCode budget skills match their generic-agent policy targets and local contracts', () => {
  for (const contract of OPENCODE_BUDGET_SKILL_CONTRACTS) {
    const skillPath = path.join(REPO_ROOT, 'skills', 'opencode', contract.skillName, 'SKILL.md');
    const agentPath = path.join(REPO_ROOT, 'agents', 'opencode', `${contract.agentName}.md`);
    const skill = fs.readFileSync(skillPath, 'utf8');
    const agent = fs.readFileSync(agentPath, 'utf8');
    const skillTargets = extractSkillFetchTargets(skill);
    const agentTargets = extractSkillFetchTargets(agent);

    assert.deepEqual(skillTargets, [`Fetch ${contract.fetchTarget}`],
      `${contract.skillName} must contain exactly one matching canonical Fetch target`);
    assert.deepEqual(agentTargets, [`Fetch ${contract.fetchTarget}`],
      `${contract.agentName} must contain exactly one matching canonical Fetch target`);
    assert.doesNotMatch(skill,
      /(?:import|require)\s+(?:[^\n]*\b)?(?:open\s*code|opencode)\b|from\s+['"](?:open\s*code|opencode)/i,
      `${contract.skillName} must not use a native OpenCode policy import`);

    for (const forbidden of contract.forbidden) {
      assert.doesNotMatch(skill, forbidden,
        `${contract.skillName} must not retain policy-owned duplicated behavior`);
    }
    for (const marker of contract.markers) {
      assert.match(skill, marker,
        `${contract.skillName} must retain its skill-specific OpenCode contract marker ${marker}`);
    }
  }
});

const CLAUDE_BUDGET_SKILL_CONTRACTS = [
  {
    skillName: 'budget-explorer',
    subagentType: 'budget-explorer',
    fetchTarget: '@sai/policies/explore-agent.md',
    markers: [
      /Agent\s*\(\s*subagent_type:\s*budget-explorer\s*,\s*run_in_background:\s*true\s*,/i,
      /read[- ]only/i,
      /30\s+tool\s+calls/i,
      /main\s+agent/i,
      /output\s+contract/i,
    ],
  },
  {
    skillName: 'budget-executor',
    subagentType: 'budget-executor',
    fetchTarget: '@sai/policies/executor-agent.md',
    markers: [
      /Agent\s*\(\s*subagent_type:\s*budget-executor\s*,\s*run_in_background:\s*true\s*,/i,
      /execute[- ]only/i,
      /minimal\s+output|low[- ]output/i,
      /structured\s+failure/i,
    ],
  },
  {
    skillName: 'budget-subagent',
    subagentType: 'budget-subagent',
    fetchTarget: '@sai/policies/budget-agent.md',
    markers: [
      /Agent\s*\(\s*subagent_type:\s*budget-subagent\s*,\s*run_in_background:\s*true\s*,/i,
      /general[- ]purpose/i,
      /structured\s+completion\s+report/i,
      /cost[- ]controlled|cost[- ]discipline|cost\s+model/i,
    ],
  },
];

test('Claude budget skills route dispatch through their agent basenames with no per-spawn model or hardcoded model tier', () => {
  for (const contract of CLAUDE_BUDGET_SKILL_CONTRACTS) {
    const skillPath = path.join(REPO_ROOT, 'skills', 'claude', contract.skillName, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath),
      `${contract.skillName} should have a Claude skill at ${skillPath}`);
    const skill = fs.readFileSync(skillPath, 'utf8');

    assert.doesNotMatch(skill, /\b(?:haiku|sonnet)\b/i,
      `${contract.skillName} must not hardcode a Claude model identifier`);
    assert.doesNotMatch(skill, /\bmodel\s*:/i,
      `${contract.skillName} must pass no per-spawn model:`);
    assert.doesNotMatch(skill, /\bescalat/i,
      `${contract.skillName} must not retain a retired explorer escalation tier`);

    const skillTargets = extractSkillFetchTargets(skill);
    assert.deepEqual(skillTargets, [`Fetch ${contract.fetchTarget}`],
      `${contract.skillName} must contain exactly one matching canonical Fetch target`);

    for (const marker of contract.markers) {
      assert.match(skill, marker,
        `${contract.skillName} must retain its skill-specific Claude contract marker ${marker}`);
    }
  }
});

test('worker-count parity: every harness projects exactly nine matrix bindings and nine managed agents', () => {
  const os = require('node:os');
  const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(REPO_ROOT);
  const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
  const workers = [
    'sai-1-spec-proposal-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
    'sai-4-red-worker',
    'sai-4-green-worker',
  ];
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = {
      commands: path.join(os.tmpdir(), `sai-parity-${harness}-commands`),
      sai: path.join(os.tmpdir(), `sai-parity-${harness}-sai`),
      skills: path.join(os.tmpdir(), `sai-parity-${harness}-skills`),
      agents: path.join(os.tmpdir(), `sai-parity-${harness}-agents`),
      config: os.tmpdir(),
      root: os.tmpdir(),
    };
    const active = expandInstallManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot });
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 9, `${harness} should project exactly nine worker bindings`);
    const phaseBindingNames = bindingNames.filter(name => phases.includes(name.replace(/-worker\.md$/, '')));
    assert.deepEqual(phaseBindingNames.sort(), phases.map(phase => `${phase}-worker.md`).sort(),
      `${harness} phase worker binding names should match the canonical phase matrix`);
    const agentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents) &&
        workers.includes(path.basename(projection.destinationPath, '.md')))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(agentNames.length, 9, `${harness} should project exactly nine managed agents`);
    assert.deepEqual(agentNames.sort(), [...workers].sort(),
      `${harness} managed agent names should match the canonical worker matrix`);
  }
});
