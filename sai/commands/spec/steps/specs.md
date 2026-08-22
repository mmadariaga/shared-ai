# Spec Step — Specs

Active step: specs. Write the capability delta specs, then report the `specs` progress event per the worker contract.

Write `openspec/changes/{name}/specs/**/*.md` per the `openspec-propose` skill already loaded in this session — one capability delta spec per capability, each with its requirements and scenarios in the skill's format. Generate ONLY spec files in this step; never write `design.md` or `tasks.md`.

Append every newly resolved domain term to the project-root `GLOSSARY.md` immediately (do not batch): bootstrap the glossary if absent, insert the term alphabetically with its `*Avoid*` aliases, and conform to the `<glossary_format>` block pre-loaded in context. This is the single permitted write outside `openspec/changes/{name}/`.
