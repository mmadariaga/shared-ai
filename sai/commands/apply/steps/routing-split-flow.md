# Routing: Split-Flow

RED block present, exact `## Step N` contract, at least one production file in scope. Dispatch a blind RED worker, then a GREEN worker. Each is a separate worker invocation carrying only `arguments_value` plus its task disclosure.

## RED dispatch

Task disclosure: the `## Step N` contract and the testing slice (framework and assertion libraries, the Step test command of coordinator § Verification commands). Never the Step's GREEN implementation body: the RED worker is blind to it.

## RED gate

Every RED return is intermediate until the coordinator has itself established `RED result: valid`. Only a valid RED result permits the subsequent GREEN dispatch, whether it comes from the first dispatch or from a same-worker recovery continuation. `passes`, `wrong-failure`, failed, vetoed, unresolved, out-of-scope, duplicate, exhausted, and STOP results never unlock GREEN.

When a RED return is non-clean, run coordinator § Known-False Report Recovery before any GREEN dispatch:

- An eligible in-scope diagnosis continues the **same RED worker** with `continue_after_recovery`, keeping its blind `test-authoring → red-verification` plan.
- Any other diagnosis hands the Step back or stops for a human with the concrete artifact and point when known; GREEN is not dispatched.
- A false veto (`unrecoverable: true` that coordinator evidence disproves) stays recovery-eligible, but the veto alone never authorizes GREEN.
- An unpassable RED closes `status: failed`, `failure_class: blocking-contradiction`, with evidence and `STOP reached?: yes`; it grants no GREEN authorization.

## GREEN dispatch

Dispatch GREEN only after a valid RED result. Task disclosure is the Step's GREEN body, its production allowed files, and the same Step test command RED received. Never the test files the RED worker wrote, and never declared interfaces.

An unpassable GREEN (a failed result with `STOP reached?: yes`) goes through coordinator § Known-False Report Recovery. When no eligible correction exists it is the GREEN-conflict STOP: the Step halts for a human, with no checkbox, commit, or advance, even under an active session commit grant. Present the halt per `@sai/policies/question-context.md`: what is being decided (implementation, test, or interface fault), why it matters, the conflict's essential state, and the options in plain language.

A GREEN `blocking-contradiction` that proves a test-infra point (setup, adapter, seed, import wiring) goes back to this Step's RED worker per coordinator § Unblock ladder, never to GREEN.
