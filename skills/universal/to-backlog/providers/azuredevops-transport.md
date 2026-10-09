# Azure publication transport verification

The installed Azure CLI interpreter and its already-installed azure-devops
extension supply authentication. Every CLI/SDK process overrides
`AZURE_EXTENSION_USE_DYNAMIC_INSTALL=no` locally, even when the inherited value
is `yes_without_prompt`. A built-in `az extension show --name azure-devops`
preflight must succeed before the SDK bridge; it never installs the extension.
Global configuration and credentials are not modified.

`az devops invoke` chooses a location by area/resource/version, not by method or
route keys. WorkItems creation and ID-based access have different location IDs
but the same resource name, so publication does not use invoke for them.
The bridge uses the installed extension's `get_work_item_tracking_client` and
its SDK `_send` with these official location IDs:

- Create: `62d3d110-0047-428c-ad3c-4fe872c91c74`, POST,
  `{project}/_apis/wit/workitems/${type}`. The template supplies the literal `$`;
  the type itself is URI-encoded, with no extra dollar prefix.
- Read/update: `72c7ddf8-2cdc-4f60-90cd-ab71c14a399b`, GET/PATCH,
  `{project}/_apis/wit/workitems/{id}`. PATCH carries the `/rev` test and the
  title/description changes in one JSON Patch body.
- Identity: `get_location_client`, `00d9565f-ed9c-4a06-9a50-00e7896ccab4`, GET
  `_apis/connectionData`. Location has no resource-area identifier; do not
  assume an invoke area named `location` exists.

Route values are percent-encoded once before SDK template expansion. The
bridge supports the existing standard Windows MSI interpreter and absolute
Python-shebang CLI launchers. Other packaging stops with a concrete launcher
blocker before publication; it does not guess a system Python or install one.
Other unambiguous resources retain invoke. Its temporary input files are removed
in finally, including on preparation/command/JSON failures; recovery receipts
are separate and remain available.

Grounding: official Azure CLI extension `dev/boards/work_item.py`,
`dev/team/invoke.py`, `dev/common/services.py`, and `devops_sdk/client.py` at
https://github.com/Azure/azure-devops-cli-extension/tree/master/azure-devops/azext_devops;
official location IDs in
https://github.com/microsoft/azure-devops-python-api/blob/dev/azure-devops/azure/devops/v7_1/work_item_tracking/work_item_tracking_client.py
and the extension's `devops_sdk/v5_0/location/location_client.py`.
Protocol tests check final template-expanded URLs and runner environment using
offline SDK/launcher doubles. They are not live Azure integration validation.
