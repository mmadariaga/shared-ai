# Offline route-template fixture. IDs and templates are from Microsoft's
# Work Item Tracking REST/SDK and Location SDK. No network or publication.
import sys, types

class Response:
    def __init__(self, data): self.data = data
    def json(self): return self.data

class Client:
    def __init__(self, organization, identity):
        self.organization, self.identity = organization, identity
    def _send(self, http_method, location_id, version, route_values, query_parameters, content, media_type):
        # Selection uses the explicit SDK location ID, never resource name.
        templates = {
            '62d3d110-0047-428c-ad3c-4fe872c91c74': ('POST', '/{project}/_apis/wit/workitems/${type}'),
            '72c7ddf8-2cdc-4f60-90cd-ab71c14a399b': ('GET|PATCH', '/{project}/_apis/wit/workitems/{id}'),
            '00d9565f-ed9c-4a06-9a50-00e7896ccab4': ('GET', '/_apis/connectionData')
        }
        methods, template = templates[location_id]
        assert http_method in methods.split('|')
        assert self.identity == (location_id == '00d9565f-ed9c-4a06-9a50-00e7896ccab4')
        url = self.organization + template.format(**route_values)
        return Response({'url': url, 'method': http_method, 'body': content,
                         'authenticatedUser': {'id': 'offline-actor'}})

services = types.ModuleType('azext_devops.dev.common.services')
services.get_work_item_tracking_client = lambda organization: Client(organization, False)
services.get_location_client = lambda organization: Client(organization, True)
sys.modules['azext_devops.dev.common.services'] = services
