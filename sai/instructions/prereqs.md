## Prerequisite check

Before proceeding, verify:
1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec". To verify, run: `openspec --version`
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"
3. `openspec/config.yaml` contains a line matching `^schema:\s*sai-workflow\s*$`. If not, STOP and print: "openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml."

Do not create or modify any files if any check fails.
