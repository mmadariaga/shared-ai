# SAI_AGENTS.md

An orientation index for the SAI documentation surfaces: where each durable documentation artifact lives, which pipeline phase writes it, and where its canonical format is defined. Read this file from the harness root; every format pointer below is relative to this directory.

## GLOSSARY.md

- **Canonical location**: project root — `./GLOSSARY.md`
- **Purpose**: the project's domain vocabulary — the terms every SAI phase uses for identifiers.
- **Writer**: the spec phase (bootstrap and appends) and the planning phase (appends).
- **Format**: sai/policies/glossary-format.md

If this file exists, it means the project's domain language is recorded for the pipeline to use.

## SAI_LEARNINGS.md

- **Canonical location**: project root — `./SAI_LEARNINGS.md`
- **Purpose**: durable, execution-observed facts about how the repository builds, tests, and behaves.
- **Writer**: the apply phase's Learnings Promotion Pass.
- **Format**: sai/policies/sai-learnings-format.md

If this file exists, it means execution-observed repository facts are recorded here.

## ADR index

- **Canonical location**: `docs/adr/0000-INDEX.md`
- **Purpose**: the relational map of the project's architecture decision records.
- **Writer**: the implementation phase's Step 3 index maintenance.
- **Format**: sai/instructions/_templates/adr-index.md

If this file exists, it means the project maintains architecture decision records.

## DDR index

- **Canonical location**: `docs/ddr/0000-INDEX.md`
- **Purpose**: the relational map of the project's domain decision records.
- **Writer**: the implementation phase's Step 3 index maintenance.
- **Format**: sai/instructions/_templates/ddr-index.md

If this file exists, it means the project maintains domain decision records.
