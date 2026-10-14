import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/** Instance-specific bearer key issued in the Politmonitoring Django admin. */
export class PolitmonitoringApi implements ICredentialType {
	name = 'politmonitoringApi';

	displayName = 'Politmonitoring API';

	documentationUrl = 'https://github.com/digital-organizing/n8n-nodes-digital-organizing';

	icon: Icon = {
		light: 'file:../icons/politmonitoring.svg',
		dark: 'file:../icons/politmonitoring.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://monitoring.example.ch',
			description: 'Root URL of the customer instance. A trailing /api/v1 is ignored.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'pm_…',
			description: 'Created in the instance admin under API keys. It is shown only once.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	/** /me/ needs no scope, so any valid, unexpired key passes. */
	test: ICredentialTestRequest = {
		request: {
			// The same normalisation as normalizeBaseUrl in the node's shared/request.ts.
			baseURL:
				'={{ (/^https?:\\/\\//i.test($credentials.baseUrl.trim()) ? "" : "https://") + $credentials.baseUrl.trim().replace(/\\/+$/, "").replace(/\\/api\\/v1$/i, "") }}',
			url: '/api/v1/me/',
			method: 'GET',
		},
	};
}
