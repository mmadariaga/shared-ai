# opencode-default-models Specification

## Purpose
TBD - created by archiving change update-opencode-default-models. Update Purpose after archive.
## Requirements
### Requirement: Opencode command wrappers declare the new default lineup
Each opencode command wrapper SHALL declare the corrected default model and variant in its YAML frontmatter: cheap utility paths SHALL use `opencode/muse-spark-1.3-contributor-free` with `variant: high`, main pipeline wrappers SHALL use `opencode-go/muse-spark-1.3-contributor` with `variant: xhigh`, and the four review wrappers (`sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`) SHALL use `opencode-go/muse-spark-1.3-contributor` with `variant: xhigh`. The Claude wrappers SHALL remain unchanged.

#### Scenario: Wrapper frontmatter matches the new lineup
- **WHEN** the cheap, pipeline, and review opencode wrappers are read after the change
- **THEN** cheap declares free high, pipeline declares contributor xhigh, and review declares contributor xhigh with no stale value

### Requirement: Generic opencode agents default to the free model with high variant
Each file in `agents/opencode/` SHALL declare `model: opencode/muse-spark-1.3-contributor-free` with `variant: high` alongside its preserved name, description, and `mode: subagent`.

#### Scenario: Generic agent frontmatter uses the free model
- **WHEN** the three generic agent files are read after the change
- **THEN** each declares the free model with variant high and retains its name and mode

### Requirement: Worker-matrix opencodeAgent entries match the wrapper lineup
The worker-matrix in `sai/install-manifest.json` SHALL declare matching opencodeAgent defaults: `opencode-go/muse-spark-1.3-contributor` with high variant for spec, design, implementation, archive, backfill, merge, red, green, and direct-build workers, `opencode/muse-spark-1.3-contributor-free` with high variant for the commit worker, `opencode-go/gpt-5.6-luna` with max variant for the review worker, `opencode-go/deepseek-v4.1-flash` with max variant for the security worker, and `opencode-go/glm-5.3-flash` with max variant for the performance and accessibility workers.

#### Scenario: Manifest entries mirror the new defaults
- **WHEN** the install manifest opencodeAgent entries are read after the change
- **THEN** review declares luna max, security declares deepseek max, and performance and accessibility declare glm flash max with no stale value

### Requirement: README documents the new opencode defaults
The `README.md` opencode model table and design paragraph SHALL document the new defaults in the same change, with cheap paths on the free model with high variant, the main pipeline on the contributor model with xhigh variant, and the review workers on deepseek-v4.1-flash with max variant.

#### Scenario: README table matches the implementation
- **WHEN** the README model table is read after the change
- **THEN** every opencode cell shows the corrected model and variant from the staged diff

