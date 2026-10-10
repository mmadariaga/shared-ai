# implementation-plan-detail-range Specification

## Purpose
TBD - created by archiving change implement-detail-range. Update Purpose after archive.

## Requirements

### Requirement: The Detail range Hard Rule is single-sourced

`sai/commands/implement/steps/common.md` SHALL carry exactly one Hard Rule named **Detail range**, placed right after the **Valid RED failure** Hard Rule, in place of the former complete-production-code and no-TODO bullets. The Role line of `common.md`, the first-run generation bullets of `sai/commands/implement/steps/plan-generation.md`, the Pre-Delivery Verification item of `sai/commands/implement/steps/validation.md`, and `sai/commands/implement/implementation-plan.template.md` SHALL name **Detail range** and SHALL NOT restate a complete-code or no-TODO rule.

#### Scenario: Plan surfaces reference the rule
- **WHEN** a reader consults `plan-generation.md`, `validation.md`, or the implementation plan template
- **THEN** each names **Detail range** and none restates a rule that every code block is complete with no TODOs

### Requirement: Plan content per file follows the detail range in Steps with a RED block

In a Step with a RED block, the plan SHALL carry, for each file, content anywhere from a skeleton to complete copy-paste content, and the `/sai-4-apply` GREEN worker SHALL complete the rest by reading the Step's tests. A skeleton SHALL be the signatures plus one `TODO(sai-4)` comment per body stating what to implement and how. The criterion SHALL be that decisions go in the plan and typing goes to GREEN: a non-obvious decision appears as code, or as the how of a `TODO(sai-4)` comment. Code SHALL range from a skeleton to complete, final, executable code, with partial implementations between the two that complete the non-obvious parts, including private functions and services. Normative text (prompts, user-facing literals, requirements, configuration values) SHALL always be complete. Descriptive text (documentation sections, explanatory comments) SHALL range from instructions describing the content up to complete content.

#### Scenario: Code at the minimum
- **WHEN** a Step with a RED block creates a function whose body holds no non-obvious decision
- **THEN** the plan may carry only its signature with one what/how `TODO(sai-4)` comment under a `Complete the skeleton below in` instruction

#### Scenario: Normative text is never reduced to instructions
- **WHEN** a file of a Step with a RED block carries a prompt, user-facing literal, requirement, or configuration value
- **THEN** the plan carries that text complete

#### Scenario: Descriptive text delivered as instructions
- **WHEN** a file of a Step with a RED block carries a documentation section
- **THEN** the plan may describe its content under a `Write the content described below into` instruction instead of writing it out

### Requirement: The Step difficulty sets the point on the range

The Step's `difficulty` in `tasks.md` SHALL set how many decisions count as non-obvious. A Step without `difficulty` SHALL get the maximum of the range: complete content.

#### Scenario: Step without difficulty
- **WHEN** a Step with a RED block has no `difficulty` in `tasks.md`
- **THEN** the plan carries complete copy-paste content for each of its files

### Requirement: Steps without a RED block keep complete content

A Step without a RED block SHALL keep complete content under the `Copy and paste code below into` instruction. The `Complete the skeleton below in` and `Write the content described below into` instructions SHALL be valid only in a Step with a RED block.

#### Scenario: Non-testable Step
- **WHEN** the plan generates a Step without a RED block
- **THEN** each of its files uses `Copy and paste code below into` with complete content

### Requirement: Skeleton code keeps the declared signatures

When the Step has no `## Step N` entry in `interfaces.md`, or the file does not exist, the code minimum SHALL be the signatures of the functions the Step creates or changes, each with its what/how `TODO(sai-4)`. For a change to an existing function, the plan SHALL show only the fragment that changes, with the `TODO(sai-4)` where the logic is missing. Every signature SHALL keep the one `interfaces.md` declares, and in GREEN the plan's content (skeleton, partial, or complete) SHALL replace the RED stub while keeping those signatures.

#### Scenario: Change to an existing function
- **WHEN** a Step with a RED block changes the logic of an existing function
- **THEN** the plan shows only the changing fragment with a `TODO(sai-4)` where the logic is missing

#### Scenario: No interfaces entry for the Step
- **WHEN** a Step with a RED block has no `## Step N` entry in `interfaces.md`
- **THEN** the code minimum is the signatures of the functions the Step creates or changes, each with its what/how `TODO(sai-4)`

### Requirement: Markers are confined and the RED block keeps its format

The plan SHALL NOT leave a `TODO(sai-4)` outside a file named by `Complete the skeleton below in`, SHALL NOT carry any other placeholder or TODO, and SHALL NOT use "you may want to" or similar hedges. The RED block SHALL keep its format: the test plus a minimal stub, with no what/how comments.

#### Scenario: Validation checks marker placement
- **WHEN** the validation step reviews a written `implementation.md`
- **THEN** it requires every file's content to follow **Detail range**, with `TODO(sai-4)` only in files named by `Complete the skeleton below in`

#### Scenario: RED block stays free of what/how comments
- **WHEN** the plan writes the RED block of a Step whose GREEN carries a skeleton
- **THEN** the RED block holds only the test and a minimal stub, with no `TODO(sai-4)` what/how comment

### Requirement: The plan template offers the three GREEN instructions

`sai/commands/implement/implementation-plan.template.md` SHALL show, in the GREEN block of the Step with a RED block, a line stating one instruction per file chosen per **Detail range**, followed by the three instructions `Copy and paste code below into`, `Complete the skeleton below in`, and `Write the content described below into`, each with a placeholder that points to **Detail range**. Steps without a RED block SHALL keep `Copy and paste code below into` with the `{COMPLETE, FINAL CODE}` placeholder.

#### Scenario: Template GREEN block of a RED Step
- **WHEN** a reader consults the template's Step with a RED block
- **THEN** its GREEN block lists the three instructions, each placeholder naming **Detail range**

### Requirement: The detail range governs only first-run generation

The Detail range SHALL be one of the generation rules that govern the first-run generation path. On a `/sai-3-implement` re-run, preserved Steps SHALL keep their content, and the range SHALL apply only to the Steps generated in that run.

#### Scenario: Re-run preserves an existing Step
- **WHEN** `/sai-3-implement` re-runs over a plan whose Step 1 is preserved and Step 3 is generated
- **THEN** Step 1 keeps its existing content and only Step 3 follows **Detail range**
