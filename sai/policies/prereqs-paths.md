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
