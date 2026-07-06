# Spec: Glossary canonical location at project root

## ADDED Requirements

### Requirement: Canonical single-root location

`GLOSSARY.md` SHALL have exactly one canonical location — the project root — and `sai/instructions/glossary-format.md` SHALL state this as the single, explicit canonical location. No SAI instruction or spec SHALL describe a location for `GLOSSARY.md` that contradicts the project root.

#### Scenario: glossary-format states the single canonical root

- **WHEN** `sai/instructions/glossary-format.md` is read
- **THEN** it explicitly names the project root as the single canonical location for `GLOSSARY.md`
- **AND** no statement in the file places `GLOSSARY.md` inside `openspec/changes/{name}/` or any other directory as the canonical location

### Requirement: Spec command writes GLOSSARY.md at project root

The spec command's MAY-modify list in `sai/instructions/spec.propose.md` SHALL identify the glossary file as `./GLOSSARY.md` at the project root, not `openspec/changes/{name}/GLOSSARY.md`. When the spec phase bootstraps or appends a domain term, it SHALL write to the project-root `GLOSSARY.md`.

#### Scenario: MAY-modify list points to project root

- **WHEN** `sai/instructions/spec.propose.md` is read
- **THEN** its MAY-modify list references `./GLOSSARY.md` (project root)
- **AND** it does NOT reference `openspec/changes/{name}/GLOSSARY.md`

#### Scenario: bootstrap writes to root

- **WHEN** the spec phase resolves the first domain term with no existing `GLOSSARY.md`
- **THEN** it creates `GLOSSARY.md` at the project root

### Requirement: Reader phases resolve GLOSSARY.md at project root

The implement and review phases SHALL resolve `GLOSSARY.md` at the project root. `sai/instructions/implement.md` SHALL state the project-root location explicitly rather than an unqualified "if it exists". `sai/instructions/review.md` SHALL continue to resolve `GLOSSARY.md` at the repo root.

#### Scenario: implement resolves at root

- **WHEN** `sai/instructions/implement.md` is read
- **THEN** its `GLOSSARY.md` reader step names the project root as the location
- **AND** the "if it exists" wording resolves to the project-root path, not the change folder

#### Scenario: review resolves at root

- **WHEN** `sai/instructions/review.md` is read
- **THEN** its Domain Language Consistency step resolves `GLOSSARY.md` at the repo root

### Requirement: Multi-context mechanism does not contradict single root

The multi-context `GLOSSARY-MAP.md` mechanism SHALL be presented as deferred/optional and SHALL NOT contradict the single-root rule. Resolving multi-context bounded contexts is out of scope for this capability.

#### Scenario: multi-context note is subordinate to single root

- **WHEN** the "Multi-context repos" content in `sai/instructions/glossary-format.md` is read
- **THEN** it is marked as deferred or optional
- **AND** it does not override or contradict the single canonical project-root location for `GLOSSARY.md`

### Requirement: One-way migration with no backward-compat shim

The SAI tooling SHALL look only at the project-root `GLOSSARY.md` going forward. It SHALL NOT read from `openspec/changes/{name}/GLOSSARY.md`, and no backward-compatibility shim SHALL be added for projects that previously bootstrapped a glossary inside a change folder.

#### Scenario: change-folder glossary is ignored

- **WHEN** a `GLOSSARY.md` exists only inside `openspec/changes/{name}/` and none exists at the project root
- **THEN** the SAI phases treat the glossary as absent
- **AND** no instruction directs the agent to fall back to the change-folder copy
