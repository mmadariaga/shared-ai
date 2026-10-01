# Tool Execution Permissions

Before executing a SAI tool, consult `@sai/policies/tool-access.md` for the
active command or agent's required access. Capability profiles and assignments
are executable data in `sai/install-manifest.json`, translated by
`bin/capabilities.js`; native inventories are not maintained in this document.

Copy selection stays first-existing-verbatim under
`@sai/policies/tool-resolution.md`: project-local relative path first, then the
literal user-global candidate. A shell grant is separate from authorization
to mutate files or git; retain the calling contract's boundaries and gates.

Claude Code command `allowed-tools` is a pre-approval surface, not an allow-list
that denies other tools. Agent `tools` does filter the pool, subject to native
availability and inherited permissions. Opencode agent `permissions` uses V2
actions and ordered rules; commands use the active primary agent, with no
command-local permission field. Required command rules are supplied in the
installed `sai/capability-requirements.json` for inspection and configuration,
not silently applied to user settings.

An unresolvable required tool or store/guard failure stops the phase naming the
tried candidates. A missing validator never skips validation; missing
prerequisites never continue as `verdict: pass`. Unattended routes cannot depend
on an unanswered permission prompt. The existing consent and commit limits
remain unchanged on both harnesses.
