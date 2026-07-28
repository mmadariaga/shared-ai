# Prerequisite check

## OpenSpec

### Prerequisite checks (halt if any fails)

1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec". To verify, run: `openspec --version`
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"
3. `openspec/config.yaml` contains a line matching `^schema:\s*sai-workflow\s*$`. If not, STOP and print: "openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml."

### Path resolution

As verified above, OpenSpec artifacts live under `openspec/` in the project root. Use direct paths to locate them — no recursive globbing:

- `openspec/config.yaml`
- `openspec/specs/{name}/spec.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/changes/{change-name}/proposal.md`
- `openspec/changes/{change-name}/specs/**/*.md`
- `openspec/changes/{change-name}/design.md`
- `openspec/changes/{change-name}/tasks.md`
- `openspec/changes/{change-name}/implementation.md`
- `openspec/changes/{change-name}/review.md`
- `openspec/changes/{change-name}/security.md`
- `openspec/changes/{change-name}/performance.md`
- `openspec/changes/{change-name}/accessibility.md`
- `openspec/changes/archive/YYYY-MM-DD-{change-name}/`

Do not create or modify any files if any prerequisite check fails.
