import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DoCounterApi implements ICredentialType {
	name = 'doCounterApi';

	displayName = 'Do Counter API';

	documentationUrl = 'https://github.com/digital-organizing/n8n-nodes-digital-organizing';

	icon: Icon = { light: 'file:../icons/counter.svg', dark: 'file:../icons/counter.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: '',
			description: 'Base URL of the Do Counter instance, without a trailing slash',
			placeholder: 'https://counter.d-o.li',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Sent as the X-API-Key header on the endpoints that create or update counters and campaigns',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		// The API exposes no authenticated read endpoint, so the test only checks
		// that the URL points at a Do Counter instance. Creating a counter here
		// would fail on the unique name as soon as the test runs twice.
		request: {
			baseURL: '={{$credentials?.apiUrl}}',
			url: '/api/openapi.json',
			method: 'GET',
		},
	};
}
