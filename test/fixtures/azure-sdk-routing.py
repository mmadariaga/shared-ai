# Offline route-template fixture. IDs and templates are from Microsoft's
# Work Item Tracking REST/SDK and Location SDK. No network or publication.
import sys, types

class Response:
    def __init__(self, data): self.data = data
    def json(self): return self.data

class Client:
    def __init__(self, organization, kind):
        self.organization, self.kind = organization, kind
    def _send(self, http_method, location_id, version, route_values, query_parameters, content, media_type):
        # Selection uses the explicit SDK location ID, never resource name.
        templates = {
            '62d3d110-0047-428c-ad3c-4fe872c91c74': ('POST', '/{project}/_apis/wit/workitems/${type}'),
            '72c7ddf8-2cdc-4f60-90cd-ab71c14a399b': ('GET|PATCH', '/{project}/_apis/wit/workitems/{id}'),
            '00d9565f-ed9c-4a06-9a50-00e7896ccab4': ('GET', '/_apis/connectionData'),
            '9946fd70-0d40-406e-b686-b4744cbbcc37': ('GET|POST|PATCH', '/{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}')
        }
        kinds = {'62d3d110-0047-428c-ad3c-4fe872c91c74': 'wit', '72c7ddf8-2cdc-4f60-90cd-ab71c14a399b': 'wit',
                 '00d9565f-ed9c-4a06-9a50-00e7896ccab4': 'location', '9946fd70-0d40-406e-b686-b4744cbbcc37': 'git'}
        methods, template = templates[location_id]
        assert http_method in methods.split('|')
        assert self.kind == kinds[location_id]
        # The pull-request template ends in an optional segment: list and create omit it.
        url = self.organization + template.format(**{'pullRequestId': '', **route_values}).rstrip('/')
        return Response({'url': url, 'method': http_method, 'body': content,
                         'authenticatedUser': {'id': 'offline-actor'}})

services = types.ModuleType('azext_devops.dev.common.services')
services.get_work_item_tracking_client = lambda organization: Client(organization, 'wit')
services.get_location_client = lambda organization: Client(organization, 'location')
services.get_git_client = lambda organization: Client(organization, 'git')
sys.modules['azext_devops.dev.common.services'] = services
