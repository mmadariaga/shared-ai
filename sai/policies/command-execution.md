# Portable Command Execution

Use this policy at the command-execution mutation points in commit, merge,
archive, and Direct Build close flows.
Tool paths remain owned by `@sai/policies/tool-resolution.md`; this policy
governs how to invoke a resolved path and deliver its input.

## Select the available shell

- Use the active command-execution tool, whatever its displayed name. Do not
  require a tool named `Bash` when the available tool runs PowerShell 7.
- The supported shells are Bash and PowerShell 7. Windows PowerShell 5.1 is not
  supported by this contract. If no command-execution tool or supported shell
  is available, stop before mutation and use the consuming command's existing
  failure path. Never substitute Write or Edit for command execution.
- Preserve argument boundaries, working directory, operation order,
  authorization, output, and exit status. Pass arguments as separate arguments;
  do not build a command string for `eval` or `Invoke-Expression`. A failed or
  unavailable command stops every dependent action.
- In PowerShell 7, invoke ordinary commands with the call operator and a
  separate argument array (`& $executable @arguments`). In Bash, quote each
  argument for that shell. This changes transport only; it does not change the
  command or its failure handling.
- Pass the archive push reference as one quoted argument in either shell:
  `git log '@{push}..HEAD' --oneline`. Quoting does not change the existing
  handling when the reference does not resolve.

## Deliver literal commit messages

Pass the complete message on standard input. Do not put message text in a
command string or a `git commit -m` argument.

### Bash

Represent the complete message as adjacent Bash single-quoted segments. For
each apostrophe in the message, close the current segment, write `\'`, and open
a new segment; for example, the message `author's text` is
`'author'\''s text'`. Newlines, `$`, backticks, and other shell metacharacters
stay literal inside the quoted segments. Put the final closing quote
immediately after the complete message: on the same line if it has no final
LF, or after that LF if it does. This preserves the message's exact final-LF
state.

```bash
set -e -o pipefail
message='first line
second line'
printf '%s' "$message" | node "$tool_path" apply [options]
```

The fixed `printf` format does not interpret message characters or append a
newline. `pipefail` exposes a failed process, and `-e` stops dependent shell
commands. The example message has no final LF; when it has a final LF, put the
closing quote after that LF. For a direct Git commit, use `git commit -F -`
instead of the `node` invocation in the same `printf` pipeline and keep the
route's authorization.

### PowerShell 7

Build `$message` from an array of single-quoted line literals joined with LF.
Double each apostrophe in a line; quotes, `$`, backticks, and Unicode then stay
literal. Retain blank lines, and include a final empty array item only when the
message ends in LF. This form has no here-string terminator, so any message
line (including `'@`) is safe:

Use this transport, replacing the placeholders and adding each actual argument
separately:

```powershell
$message = [string]::Join("`n", [string[]]@(
  'first line'
  'second line'
))
# If the message ends in LF, add a final empty item after 'second line'.
$psi = [System.Diagnostics.ProcessStartInfo]::new('node')
$psi.UseShellExecute = $false
$psi.WorkingDirectory = (Get-Location).Path
$psi.RedirectStandardInput = $true
$psi.StandardInputEncoding = [System.Text.UTF8Encoding]::new($false)
$psi.ArgumentList.Add('<tool-path>')
$psi.ArgumentList.Add('apply')
# Add the applicable flags as separate ArgumentList entries.
$process = [System.Diagnostics.Process]::Start($psi)
$process.StandardInput.Write($message)
$process.StandardInput.Close()
$process.WaitForExit()
if ($process.ExitCode -ne 0) { exit $process.ExitCode }
```

Do not pipe a PowerShell string to a native process for this use: that pipeline
can change line endings and add a final newline. Keep standard output and error
visible to the command-execution tool. For `/sai-commit`, start `node`, add the
resolved `commit.js` path, `apply`, the applicable optional flags, `--json`, and
`--cwd` plus the repository path as separate arguments. For a direct Git commit,
start `git` with `commit`, `-F`, and `-` as separate arguments. Set the process
working directory to the repository when the invocation requires it.

`commit.js apply` remains the `/sai-commit` execution path because it validates
that route's message and sensitive-file authorization. Do not reuse it for
`/sai-merge`: it also imposes the `/sai-commit` Conventional Commits validator
and sensitive-file gate, while merge keeps its own message and authorization
contract. Merge sends its authorized informative message directly to
`git commit -F -`.
