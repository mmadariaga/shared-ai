# `/sai-6-security`

## Command function

Looks for vulnerabilities and security risks in the completed changes. It explains the impact of each finding, identifies the exact location where it appears, and links it to known references when useful.

## Flags and behavior modifiers

It has no documented behavior flags. It receives the change name and the changes to audit.

## In detail

The command analyzes modified code by considering how an unauthorized person could abuse it. It reviews situations including resource access, identity management, data validation, information exposure, and dependency use.

When it finds a risk, it describes what could happen, what conditions would be required, and why the problem matters. It also identifies the file and line to review so the correction is concrete rather than based on a vague explanation.

The report may relate findings to known practices or standards, such as OWASP or CVE, when there is a useful match. The command is a read-only audit: it does not fix code, change configuration, or publish anything by itself.
