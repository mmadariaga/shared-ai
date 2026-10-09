# Creation branch

## Destination selection — before extraction

Run `node <tool> resolve <registry>` with JSON on stdin:
`{"explicit":{"provider":"...","repository":"...","project":"...","organization":"..."}}`.
Include only user-supplied fields. Optional `.to-backlog.json` in the working
directory has the same destination string fields (no work-item type default). Resolution applies explicit input,
then configuration, then Git remotes; hosting never overrides a backlog choice.
For `needs_input`, ask for the missing choice using returned candidates and
resolve again. On `unsupported`, keep the draft and stop. On errors, request
correction of missing tools, access or destination rather than inventing one.
Read the returned `instructions` relative to this skill's directory.
**Complete when:** one provider and repository are resolved and creation
mechanics are loaded.

## Proposal — after extraction

Run the provider's read-only query with the draft. Follow clarification until
one verified destination, visibility, exact proposal and token are available.
Linked destinations are candidates only; explicit or configured choices take
precedence. **Complete when:** query returns `ready`.

## Publication — after common confirmation

Use the provider's publish operation and creation recovery from its instructions.
**Complete when:** issue and any provider-required Project insertion are verified, or a concrete
failure or uncertain outcome and receipt are available for common reporting.
