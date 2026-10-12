# category-planning-agents Specification

## Purpose
Route implementation planning to independently configurable agents while preserving existing task categories and shared planning rules.

## Requirements

### Requirement: Fixed category-to-planner mapping

Implementation planning SHALL use one shared mapping: frontend-ui to ui, frontend-code to frontend, backend and data to backend, infra to infra, and docs and other to other. Routing SHALL depend on tasks.md categories, not paths, context, difficulty, or inferred model ability. Original categories, Step numbers, and tasks.md ordering SHALL remain unchanged.

#### Scenario: Several categories share a destination

- **WHEN** tasks.md contains backend and data Steps or docs and other Steps
- **THEN** backend receives all backend/data Steps and other receives all docs/other Steps, preserving their original numbers and order.

#### Scenario: A category is absent or invalid

- **WHEN** a Step has missing, duplicate, or unsupported category metadata
- **THEN** routing stops before worker activation and identifies the affected Step without inventing a category or substituting other.

### Requirement: One complete task per required planner

Each invocation SHALL activate exactly one worker for each required destination and SHALL give that worker all assigned Steps as one complete task. Workers without assigned Steps SHALL not activate. Required tasks SHALL run concurrently after their ready handshakes. Assigned-Step ownership SHALL restrict generated output, not necessary access to shared context.

#### Scenario: Several planning destinations are required

- **WHEN** Steps map to multiple destinations
- **THEN** the required workers receive complete tasks concurrently and each generates only its assigned Step content in one independent temporary artifact.

#### Scenario: Cross-category dependencies need context

- **WHEN** an assigned Step depends on another category's work
- **THEN** its worker may consult shared documents and dependency context without generating unassigned Steps or editing another worker's artifact.

### Requirement: Identical initial definitions and project-local customization

The five agents SHALL initially share the same planning contract and skills. Their Claude Code defaults SHALL be opus with medium effort; their opencode defaults SHALL be opencode-go/deepseek-v4.1-flash with max variant, preserving the previous sai-3 defaults. Project-local agent definitions SHALL permit independent model and required-skill customization without changing routing, ownership, or final-plan format.

#### Scenario: A user customizes one planner

- **WHEN** a user supplies .claude/agents/sai-3-ui-worker.md or .opencode/agents/sai-3-ui-worker.md
- **THEN** that harness uses the project-local definition for ui while the remaining planners retain their own definitions and the shared planning boundaries.

#### Scenario: A configured resource is unavailable

- **WHEN** a planner's configured model or required skill is unavailable
- **THEN** the affected task reports the agent and resource without substituting a model or transferring the assignment to another agent.
