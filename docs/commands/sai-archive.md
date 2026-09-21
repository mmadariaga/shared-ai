# `/sai-archive`

## Command function

Checks that a change is ready and moves it from the active changes area to the archive of completed changes, keeping the active workspace clean.

## Flags and behavior modifiers

- `--fast-track`: automatically continues after reporting pending tasks or checks. Other safety confirmations remain in place.
- `Direct Build - Unattended` route: allows an authorized run to prepare and complete the order of synchronization, archiving, staging changes, and creating a local commit.

## In detail

The command reviews the state of the change before moving it. It checks which documents exist, which actions are still pending, and whether another destination archive already has the same name. It also reports any update that should be reflected in the general documentation.

If it finds pending tasks, it displays them and asks for confirmation before continuing. The user can correct them, accept continuation, or stop the process. With `--fast-track`, that continuation is accepted automatically, but controls protecting sensitive operations remain active.

Once everything is authorized, the change is removed from the active changes area and moved to the archive with its documentation. On the normal route, the operation that moves the change belongs to the main run, and the usual commit control is then offered.

In a `Direct Build - Unattended` run, the user has already explicitly authorized the complete process: prepare the required documentation, synchronize it, move the change to the archive, stage only the relevant files, and create one local commit. Nothing is sent to a remote server.
