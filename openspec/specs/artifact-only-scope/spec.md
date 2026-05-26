# Spec: Reinforce artifact-only scope in sai-1-spec

## ADDED requirements

### Requirement: Explicit artifact-only prohibition

The `spec.propose.md` instruction file SHALL contain an "Artifact-Only Scope" section that explicitly lists:

1. File types the spec command must NEVER edit, create, or delete (source files, configuration files, infrastructure files)
2. Commands the spec command must NEVER run (build, test, lint, deploy)
3. The ONLY files the spec command MAY create or modify (proposal.md, specs/**/*.md, GLOSSARY.md, .openspec.yaml approval metadata)

#### Scenario: Agent reads artifact-only scope before acting

- **WHEN** the spec-propose agent is loaded
- **THEN** it reads the Artifact-Only Scope section
- **AND** refuses to modify any project source or configuration file
- **AND** directs code generation tasks to downstream commands (sai-3-implement, sai-4-apply)

### Requirement: Downstream responsibility clarity

The Artifact-Only Scope section SHALL state that code generation, test writing, and project file modification are the responsibility of `/sai-3-implement` and `/sai-4-apply`, not the spec command.
