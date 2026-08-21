# {FEATURE_NAME}

## Goal
<!-- State exactly what this implementation accomplishes. -->

## Prerequisites
<!-- Establish the branch and other prerequisites before implementation. -->

### Step-by-Step Instructions

#### Step 1: {Action}
<!-- Testable step: use RED → GREEN when the behavior has an executable test. -->

##### RED phase
<!-- Add the minimal stub and failing test, then verify an assertion failure before GREEN. -->

##### GREEN phase (only after RED is verified)
<!-- After RED is verified, add the minimal implementation and verify the test passes. -->

##### Step 1 Verification Checklist
<!-- List automated checks and any required human checks before stopping. -->

#### Step 1 STOP & COMMIT
<!-- Follow sai/commands/apply/invocation.md at the per-Step STOP & COMMIT gate and the terminal documentation commit gate; apply its commit-authorization checklist before either commit. -->

#### Step 2: {Action — creates component not yet integrated into any page}
<!-- Non-testable/deferred variant: use the standard step format without RED/GREEN when behavior is not yet rendered; defer human checks to the first integration step. -->

##### Step 2 Verification Checklist
<!-- List automated checks for the non-testable or deferred step. -->

#### Step 2 STOP & COMMIT
<!-- Follow the per-Step STOP & COMMIT gate and the terminal documentation commit gate described by sai/commands/apply/invocation.md. -->

#### Step 3: {Action — service-side / non-UI step with no observable browser behavior}
<!-- Service-side variant: use automated verification without a human check when no browser-observable behavior exists. -->

##### Step 3 Verification Checklist
<!-- List automated checks for the service-side step. -->

#### Step 3 STOP & COMMIT
<!-- Follow the per-Step STOP & COMMIT gate and the terminal documentation commit gate described by sai/commands/apply/invocation.md. -->

#### Step N: {Integration step — first step where deferred components are rendered}
<!-- Integration variant: include deferred human checks when the component first becomes observable. -->

##### Step N Verification Checklist
<!-- List automated checks and the human checks for this integration step. -->

#### Step N STOP & COMMIT
<!-- Follow the per-Step STOP & COMMIT gate and the terminal documentation commit gate described by sai/commands/apply/invocation.md. -->

<!-- Write-time authority: planning, conditional RED/GREEN, verification, STOP & COMMIT, and commit-authorization checklist are defined in sai/commands/implement/implementation-plan.template.md -->
