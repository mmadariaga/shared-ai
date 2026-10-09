'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const azure = require('../sai/tools/azure-publication');
const { convert } = require('../sai/tools/azure-markdown');
const { SDK_SCRIPT } = require('../sai/tools/from-backlog');

test('H1: actual shared spawn boundary overrides inherited dynamic installation for CLI and SDK; absent extension stops', () => {
  const script = `
    const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),child=require('node:child_process');
    Object.defineProperty(process,'platform',{value:'win32'});
    process.env.AZURE_EXTENSION_USE_DYNAMIC_INSTALL='yes_without_prompt';
    process.env.AZURE_DEVOPS_EXT_PAT='preserved-test-token';
    const calls=[];let absent=false;
    child.spawnSync=(command,args,options)=>{
      calls.push({command,args});
      if(command==='where.exe') return {stdout:'C:\\cli\\wbin\\az.cmd\\r\\n'.replace(/\\\\r\\\\n/,'\\r\\n'),status:0};
      assert.equal(options.shell,false);
      assert.equal(options.env.AZURE_EXTENSION_USE_DYNAMIC_INSTALL,'no');
      assert.equal(options.env.AZURE_DEVOPS_EXT_PAT,'preserved-test-token');
      if(args.includes('show')) return absent?{status:1,stderr:'azure-devops extension not installed'}:{status:0,stdout:JSON.stringify({name:'azure-devops',path:'C:\\extension'})};
      assert.ok(!args.includes('add')&&!args.includes('login')&&!args.includes('configure'));
      return {status:0,stdout:'{}'};
    };
    const shared=require('./sai/tools/to-backlog'),reader=require('./sai/tools/from-backlog');
    fs.existsSync=()=>true;fs.readFileSync=()=>'-IBm azure.cli';fs.statSync=()=>({isDirectory:()=>true});
    shared.run('az',['devops','invoke'],process.cwd());
    shared.run('azure-sdk',[],process.cwd(),JSON.stringify({organization:'https://dev.azure.com/org'}));
    const sdkCalls=calls.filter(c=>c.args[0]==='-IBc').length;assert.equal(sdkCalls,1);
    absent=true;
    assert.throws(()=>shared.run('azure-sdk',[],process.cwd(),'{}'),/extension not installed/);
    assert.equal(calls.filter(c=>c.args[0]==='-IBc').length,1);
    assert.equal(process.env.AZURE_EXTENSION_USE_DYNAMIC_INSTALL,'yes_without_prompt');
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('H2: installed-SDK bridge selects distinct official location IDs and resolves final encoded REST templates', () => {
  const prefix = fs.readFileSync(path.join(__dirname, 'fixtures/azure-sdk-routing.py'), 'utf8');
  const cases = [
    { identity: false, location: '62d3d110-0047-428c-ad3c-4fe872c91c74', method: 'POST', route: { project: 'Team Ω', type: 'User Story' }, expected: '/Team%20%CE%A9/_apis/wit/workitems/$User%20Story' },
    { identity: false, location: '72c7ddf8-2cdc-4f60-90cd-ab71c14a399b', method: 'GET', route: { project: 'Team Ω', id: 12 }, expected: '/Team%20%CE%A9/_apis/wit/workitems/12' },
    { identity: false, location: '72c7ddf8-2cdc-4f60-90cd-ab71c14a399b', method: 'PATCH', route: { project: 'Team Ω', id: 12 }, expected: '/Team%20%CE%A9/_apis/wit/workitems/12', body: [{ op: 'test', path: '/rev', value: 3 }, { op: 'add', path: '/fields/System.Title', value: 'New' }] },
    { identity: true, location: '00d9565f-ed9c-4a06-9a50-00e7896ccab4', method: 'GET', route: {}, expected: '/_apis/connectionData' }
  ];
  for (const request of cases) {
    const result = spawnSync('python', ['-c', prefix + '\n' + SDK_SCRIPT], { encoding: 'utf8', input: JSON.stringify({ ...request,
      organization: 'https://dev.azure.com/org', extension: 'offline-installed-extension', version: '7.1-preview.3', query: {}, mediaType: 'application/json-patch+json' }) });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    const response = JSON.parse(result.stdout);
    assert.equal(response.url, `https://dev.azure.com/org${request.expected}`);
    assert.equal(response.method, request.method);
    assert.deepEqual(response.body, request.body || null);
    if (request.identity) assert.equal(response.authenticatedUser.id, 'offline-actor');
  }
  const calls = [];
  for (const [route, location] of [[{ project: 'Team', type: 'Task' }, cases[0].location], [{ project: 'Team', id: 1 }, cases[1].location]]) {
    azure.api({ organization: 'https://dev.azure.com/org' }, 'wit', 'workitems', route, { run(command, args, input) {
      assert.equal(command, 'azure-sdk'); const request = JSON.parse(input); calls.push(request); assert.equal(request.location, location); return '{}';
    } });
  }
  assert.equal(calls.length, 2);
});

test('H3: escapes, reference definitions in paragraphs and task-list semantics fail closed before approval', () => {
  for (const value of ['Text\\*literal\\*', 'Intro\n[x]: https://example.com\n\n[x]', '- [ ] Keep approval\n- [x] Done', 'Intro\n    indented', '> Intro\n> [x]: https://example.com']) {
    assert.throws(() => convert(value), /Unsupported/);
  }
  assert.equal(convert('`Text\\*literal\\*`'), '<p><code>Text\\*literal\\*</code></p>');
  assert.equal(convert('## Goal\n\nKeep **approval** and [guide](https://example.com).\n\n- E1: Keep `x[y]` literal'), '<h2>Goal</h2>\n<p>Keep <strong>approval</strong> and <a href="https://example.com">guide</a>.</p>\n<ul><li>E1: Keep <code>x[y]</code> literal</li></ul>');
  const format = fs.readFileSync('skills/universal/to-backlog/issue-format.md', 'utf8');
  const skeleton = /```markdown\n([\s\S]*?)\n```/.exec(format)[1];
  const html = convert(skeleton);
  for (const name of ['Problem', 'Goal', 'Scope', 'Non-goals', 'Open questions', 'Maturity']) assert.ok(html.includes(`<h2>${name}</h2>`));
  assert.ok(html.includes('<!-- backlog-id-counters: E=0 I=0 Q=0 -->'));
});

test('M1: only owned transport payloads are removed on success, runner/JSON/preparation errors; receipts survive', () => {
  let created;
  const originalMkdtemp = fs.mkdtempSync, originalWrite = fs.writeFileSync;
  const receiptDirectory = originalMkdtemp(path.join(require('node:os').tmpdir(), 'azure-receipt-'));
  const receiptFile = path.join(receiptDirectory, 'receipt.json');
  originalWrite(receiptFile, '{"evidence":"preserved"}');
  fs.mkdtempSync = (...args) => { created = originalMkdtemp(...args); return created; };
  try {
    for (const outcome of ['success', 'runner-error', 'parse-error', 'prepare-error']) {
      created = undefined;
      fs.writeFileSync = (...args) => {
        if (outcome === 'prepare-error' && path.basename(args[0]) === 'payload.json') throw new Error('Preparation failed');
        return originalWrite(...args);
      };
      const call = () => azure.api({ organization: 'https://dev.azure.com/org' }, 'git', 'pullrequests', {}, { run(command, args) {
        const file = args[args.indexOf('--in-file') + 1]; assert.ok(fs.existsSync(file));
        if (outcome === 'runner-error') throw new Error('Runner failed');
        return outcome === 'parse-error' ? '{invalid' : '{}';
      } }, 'POST', { title: 'Private title', description: 'Private body' });
      if (outcome === 'success') assert.deepEqual(call(), {}); else assert.throws(call);
      assert.ok(created); assert.equal(fs.existsSync(created), false, `${outcome} cleans its directory and payload`);
      assert.equal(fs.readFileSync(receiptFile, 'utf8'), '{"evidence":"preserved"}');
    }
  } finally {
    fs.mkdtempSync = originalMkdtemp; fs.writeFileSync = originalWrite;
    fs.unlinkSync(receiptFile); fs.rmdirSync(receiptDirectory);
  }
});
