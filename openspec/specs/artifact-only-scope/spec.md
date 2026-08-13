# Spec: Reinforce artifact-only scope in sai-1-spec

## ADDED requirements

### Requirement: Explicit artifact-only prohibition

The `spec.propose.md` instruction file SHALL contain an "Artifact-Only Scope" section that explicitly lists:

1. File types the spec command must NEVER edit, create, or delete (source files, configuration files, infrastructure files)
2. Commands the spec command must NEVER run (build, test, lint, deploy)
3. The ONLY files the spec command MAY create or modify: `proposal.md`, `specs/**/*.md`, and `.openspec.yaml` approval metadata inside `openspec/changes/{name}/`, plus `./GLOSSARY.md` at the project root as an explicit named exception (the glossary is the single project-root file the spec command may touch outside the change folder)

#### Scenario: Agent reads artifact-only scope before acting

- **WHEN** the spec-propose agent is loaded
- **THEN** it reads the Artifact-Only Scope section
- **AND** refuses to modify any project source or configuration file
- **AND** directs code generation tasks to downstream commands (sai-3-implement, sai-4-apply)

#### Scenario: GLOSSARY.md exception is at project root

- **WHEN** the Artifact-Only Scope MAY-modify list is read
- **THEN** `GLOSSARY.md` is listed at the project root (`./GLOSSARY.md`) as a named exception
- **AND** it is NOT listed as an `openspec/changes/{name}/GLOSSARY.md` path

### Requirement: Downstream responsibility clarity

The Artifact-Only Scope section SHALL state that code generation, test writing, and project file modification are the responsibility of `/sai-3-implement` and `/sai-4-apply`, not the spec command.

### Requirement: artifact-only-sai-1-scope

During `/sai-1-spec` for this change, the worker SHALL write only `openspec/changes/fold-sai-instructions-templates/proposal.md`, its `specs/**/*.md` files, and the permitted root `GLOSSARY.md` exception if a domain term is resolved. It SHALL NOT move or edit the `sai/` source tree, `sai/install-manifest.json`, documentation, ADRs, tests, configuration, or any later-phase artifact.

#### Scenario: spec phase does not apply the fold

- **WHEN** the spec proposal worker completes this change
- **THEN** the folded source files and contract surfaces remain untouched, while proposal/spec artifacts are complete and validated for downstream design

#### Scenario: no later-phase artifacts are created

- **WHEN** the spec-only scope is verified
- **THEN** `design.md`, `tasks.md`, `interfaces.md`, `implementation.md`, and audit artifacts are absent from the change directory
