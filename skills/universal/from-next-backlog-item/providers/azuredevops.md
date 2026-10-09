# Azure DevOps selection

Selection JSON: `{"provider":"azuredevops","organization":"https://dev.azure.com/ORG","project":"PROJECT","team":"TEAM","backlog":"Microsoft.RequirementCategory"}`.
Use existing conversation organization/project/team context. Ask only for missing
components. Omit `backlog` to retrieve actual levels for that team. Requires
existing Azure CLI and azure-devops extension access; the transport disables
dynamic extension installation. Additional `view` or `filters` remain pending.
The team backlog endpoint establishes membership; the team backlog configuration
supplies its process-specific manual rank field. Retrieve member ranks before
comparing them. Missing ranks or a top tie leave selection pending. Work-item
types, including custom types, are supported by the existing Azure importer;
retain the exact type and supply a full organization/project work-item link.
