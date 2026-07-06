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
