# `/sai-1-spec`

## Command function

Turns an initial description of a need or feature into a clear proposal. The proposal explains what should be achieved and defines criteria that can later be used to check whether the result meets expectations.

## Flags and behavior modifiers

For a new change, supply the complete `Ready to Propose` block produced by `/sai-explore`. For refinement, supply an existing change name and feedback. It has no ordinary user-facing behavior flags.

## In detail

The command turns the crystallized idea into `proposal.md` and capability specs under `openspec/changes/{change-name}/`. Start with `/sai-explore` when the idea is still incomplete; creation requires its complete block rather than a free-form description alone.

It also prepares acceptance criteria: concrete examples of what should happen when the feature is finished. These criteria help detect misunderstandings before design or coding begins.

The command stops after preparing the proposal and criteria. It does not write design or implementation artifacts or project code. Review the result and invoke `/sai-2-design {change-name}` to approve it and continue. Ambiguous domain terms may require clarification and permitted glossary updates. Proposals describe purpose and scope without a project-wide Complexity rating.
