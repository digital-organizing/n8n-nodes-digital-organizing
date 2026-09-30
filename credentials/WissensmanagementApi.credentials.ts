import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Wissensmanagement is our own knowledge base: documents go in, get split into
 * chunks and indexed, and come back out as search results and cited AI answers.
 * Every customer runs their own instance, so the base URL is per credential.
 *
 * Keys are created in the instance's Django admin under **API keys**, shown once,
 * and sent as `Authorization: Bearer wm_<id>.<secret>`. A key only carries the
 * scopes picked when it was made (minus any its owner lacks), and expires — after
 * 90 days unless another expiry was chosen.
 */
export class WissensmanagementApi implements ICredentialType {
	name = 'wissensmanagementApi';

	displayName = 'Wissensmanagement API';

	documentationUrl = 'https://github.com/digital-organizing/n8n-nodes-digital-organizing';

	icon: Icon = {
		light: 'file:../icons/wissensmanagement.svg',
		dark: 'file:../icons/wissensmanagement.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://wissen.example.ch',
			description: 'Root URL of the customer instance. A trailing /api/v1 is ignored.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'wm_…',
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
