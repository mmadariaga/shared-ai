# archive-capability-retirement-declaration Specification

## Purpose
TBD - created by archiving change archive-retire-capabilities-key. Update Purpose after archive.

## Requirements

### Requirement: Archive SHALL complete a capability-emptying archive by declaring the retirement

When the read-only pre-flight detects one or more capability-emptying deltas, archive SHALL evaluate the declaration preconditions read-only before writing anything, and SHALL declare the retirement only when every precondition passes. Declaring means ensuring the single key `retire_capabilities: true` is present in `openspec/changes/<name>/.openspec.yaml`, after which archive SHALL invoke `openspec archive <name> --yes --json` unchanged as the sole synchronization-and-move primitive. The declaration SHALL be written before that invocation by whoever runs it: the coordinator on the ordinary route, the archive worker inside the validated Direct Build (unattended) execution continuation. When any precondition blocks, archive SHALL NOT write the key and SHALL NOT invoke the CLI archive.

#### Scenario: A detected capability-emptying delta is archived instead of refused

- **WHEN** the pre-flight detects a delta whose REMOVED section empties a published capability and every declaration precondition passes
- **THEN** `retire_capabilities: true` is present in the change's `.openspec.yaml` before `openspec archive <name> --yes --json` runs, and the archive completes

### Requirement: The retirement SHALL be silent on every route

The retirement SHALL introduce no new question, no new gate, and no per-route branch. The ordinary
route, the Direct Build (unattended) route, and `--fast-track` SHALL behave identically with
respect to it. The human decision SHALL be located upstream, in the capability-emptying delta the
author wrote into the change, and the contract SHALL NOT present the post-archive commit gate as
the human checkpoint for the retirement, because `--fast-track` suppresses that selector and the
Direct Build (unattended) route commits unattended, so on both routes the published spec is
deleted and committed within a single invocation with nobody watching. Recovery SHALL be stated as
git on every route, and the declared `retire_capabilities: true` SHALL be stated as travelling
with the change into `openspec/changes/archive/YYYY-MM-DD-{name}/.openspec.yaml` as the durable
record that the retirement was declared.

#### Scenario: No route gains a retirement question

- **WHEN** a capability-emptying delta is archived on the ordinary route, on the Direct Build route, or under `--fast-track`
- **THEN** no retirement question or gate is presented on any of them

#### Scenario: The published justification names the real decision point

- **WHEN** a reader consults the retirement contract for the human checkpoint behind a capability retirement
- **THEN** the contract names the capability-emptying delta as the decision point, states that the post-archive commit gate is not that checkpoint on the unattended routes, and names git plus the archived `retire_capabilities: true` record as recovery and evidence

### Requirement: Archive SHALL name every retired capability in its report

The archive worker SHALL record the detected capability names as invocation-scoped
`retired_capabilities` state and SHALL name each one in its terminal summary. Whenever one or more
capabilities were retired, the visible archive output SHALL name every retired capability id, and
the line SHALL be emitted identically on the ordinary route, under `--fast-track`, and under
Direct Build (unattended); an identical report on all three routes is not a per-route branch. The
disclosure SHALL be conditioned solely on a retirement having occurred: with an empty
`retired_capabilities` set the summary SHALL name nothing and no disclosure line SHALL be emitted.
The disclosure SHALL be pure output — it SHALL carry no options, accept no answer, wait for
nothing, and SHALL NOT be able to block or fail the invocation. On the ordinary route the
disclosure SHALL precede `openspec archive <name> --yes --json`, so it names what the CLI is about
to delete, while the post-archive commit gate comes last and declining the commit there SHALL NOT
undo the retirement the CLI has already performed on disk.

#### Scenario: The report exposes what will be deleted

- **WHEN** the worker closes a run in which one or more capability-emptying deltas were detected
- **THEN** its terminal summary names every detected capability id, not only the first

#### Scenario: The disclosure is identical under fast-track and Direct Build

- **WHEN** a capability-emptying archive completes under `--fast-track` or on the Direct Build (unattended) route
- **THEN** the same retired-capability disclosure is emitted as on the ordinary route, with no option set, no answer accepted, and no ability to block the invocation

#### Scenario: No retirement emits no disclosure

- **WHEN** an archive completes with no capability-emptying delta detected
- **THEN** no retired-capability line is emitted in the visible output or the terminal summary

### Requirement: The OpenSpec CLI SHALL remain the only deleter under `openspec/specs/**`

Archive SHALL gain no move and no delete power under `openspec/specs/**`; the deletion of an emptied spec SHALL be performed by the OpenSpec CLI during the archive invocation. `/sai-retire-docs` and `openspec/specs/_archived/` SHALL remain untouched by this path and retain their ownership of retirement that has no change behind it.

#### Scenario: Deletion is performed by the CLI

- **WHEN** a declared retirement is archived
- **THEN** no archive-owned move or delete operation runs under `openspec/specs/**` and the emptied spec is deleted by the OpenSpec CLI

### Requirement: A failed CLI archive SHALL NOT revert the declaration

If `openspec archive <name> --yes --json` fails after the declaration was written, the written key SHALL remain in the working tree. Archive MUST NOT revert it.

#### Scenario: The key survives a failed archive

- **WHEN** the CLI archive invocation fails after the declaration was written
- **THEN** `retire_capabilities: true` remains present in the change's `.openspec.yaml` and archive performs no revert

### Requirement: Archive SHALL NOT validate cross-capability references after a retirement

Archive SHALL NOT detect or report a live capability that cites a retired one. Such a reference is left dangling and its detection is outside the scope of this capability.

#### Scenario: A dangling citation is not reported

- **WHEN** a surviving capability cites a capability that the archive retired
- **THEN** archive reports no cross-capability reference finding and the archive completes

### Requirement: An explicit `retire_capabilities: false` SHALL refuse the declaration as an author veto

When `retire_capabilities` is already present and its parsed value is `false`, archive SHALL treat it as an explicit author veto, SHALL refuse to declare, SHALL write nothing, and SHALL NOT invoke the CLI archive. The refusal SHALL name both ways forward: remove the `retire_capabilities: false` entry, or reshape the delta so it does not empty the capability. Archive MUST NOT skip the veto and run the CLI anyway, because the CLI cannot distinguish `retire_capabilities: false` from an absent key and the archive would fail with `archive_spec_validation_failed` on every rerun.

#### Scenario: The veto stops the run with a stated way forward

- **WHEN** a capability-emptying delta is detected on a change whose `.openspec.yaml` carries `retire_capabilities` with the parsed value `false`
- **THEN** archive writes nothing, runs no CLI archive, and reports the author veto naming both ways forward

### Requirement: An unhonoured `retire_capabilities` value SHALL refuse the declaration

When `retire_capabilities` is already present and its parsed YAML value is not a boolean — a string such as `"yes"` or `"no"`, `null`, or a number — archive SHALL refuse to declare and MUST NOT overwrite it. The refusal SHALL name the file, the key, and its current value, and SHALL state the three ways forward: set `retire_capabilities` to `true` to declare the retirement, to `false` to veto it, or remove the key. Archive SHALL never guess which boolean an unhonoured value meant, because guessing `true` would delete a published spec on a guess, including unattended under `--fast-track` and Direct Build (unattended).

#### Scenario: An unhonoured value is refused rather than coerced

- **WHEN** a capability-emptying delta is detected on a change whose `.openspec.yaml` carries `retire_capabilities: "no"`
- **THEN** archive writes nothing, runs no CLI archive, and reports the unhonoured value with the three ways forward

### Requirement: Unaccounted content in an emptied capability SHALL refuse the declaration

For each capability the delta empties, archive SHALL read its published spec at `openspec/specs/<capability>/spec.md`, read-only, and SHALL look for **unaccounted content**: any `##` section other than `## Purpose` above the spec's requirements. When any emptied capability carries unaccounted content, archive SHALL refuse to declare, SHALL name the capability and each offending section heading, and SHALL state the way forward: move that content out of the spec, then rerun `sai-archive`.

#### Scenario: A spec the merge cannot name blocks the declaration

- **WHEN** an emptied capability's published spec carries a `##` section other than `## Purpose` above its requirements
- **THEN** archive refuses to declare, names the capability and each offending heading, and states that the content must be moved before `sai-archive` is rerun

### Requirement: A single blocked capability SHALL refuse the whole declaration

When a change empties several capabilities and any one of them is blocked by a declaration precondition, archive SHALL refuse the whole declaration. Archive SHALL never declare partially and SHALL never retire the unblocked subset.

#### Scenario: One blocked capability stops the whole retirement

- **WHEN** a change empties two capabilities and exactly one of them carries unaccounted content
- **THEN** archive refuses the whole declaration, writes nothing, and retires neither capability

### Requirement: Every declaration refusal SHALL be a stop, not a question

Each refusal SHALL be presented and the run SHALL stop without the CLI archive. No route SHALL gain a prompt, a gate, or a `needs_input` result for it, and the ordinary route, `--fast-track`, and the Direct Build (unattended) route SHALL behave identically. On the Direct Build (unattended) route the worker SHALL return the refusal instead of a mutation plan, so no route can treat a refused declaration as authorization.

#### Scenario: A refusal adds no prompt on any route

- **WHEN** a declaration precondition blocks under `--fast-track` or on the Direct Build (unattended) route
- **THEN** the run stops with the refusal reported, no question is presented, and no mutation plan or execution order is returned

### Requirement: Every shared retirement rule SHALL be stated in all three archive contract files

`sai/commands/archive/instructions.md`, `sai/commands/archive/worker.md`, and `sai/commands/archive/coordinator.md` SHALL state one contract: every shared retirement-declaration rule SHALL appear in all three files. The contract test suite SHALL assert each rule's clauses against each of the three files, so a rule present in one file and absent from another fails the suite.

#### Scenario: A rule stated in one contract file only fails the suite

- **WHEN** a shared retirement-declaration rule is present in one archive contract file and missing from another
- **THEN** the cross-file contract test fails and names the file and the rule clause it lacks
