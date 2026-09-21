# `/sai-pr`

## Command function

Drafts a complete pull request description using the available information about the change and, after approval, opens the pull request on GitHub.

## Flags and behavior modifiers

It has no documented behavior flags. It receives the change name or works with the change that was resolved in the session.

## In detail

The command gathers the feature goal, decisions made, work completed, tests, reviews, and known risks. It uses this information to prepare a description that explains what changes and how it was checked.

The proposal is shown before anything is opened on GitHub. The user can review it, request changes, or reject it. The pull request is created only after the user authorizes it.

If the user does not approve it, the command does not publish a pull request. The command drafts and publishes the proposed collaboration, but it does not replace the review that others may perform later on GitHub.
