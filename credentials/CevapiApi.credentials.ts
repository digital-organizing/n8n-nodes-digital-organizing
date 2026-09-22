import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * cevAPI is our own decision service: it answers typed questions (yes/no, one of
 * N, a level) about a piece of content and returns a calibrated confidence with
 * every answer. Self-hosted, so the base URL points at our own instance.
 *
 * The token is the one set as CEVAPI_TOKEN on the server and is sent as
 * `Authorization: Bearer <token>`. An instance started without that variable
 * accepts any request, in which case the key here can be left empty.
 */
export class CevapiApi implements ICredentialType {
	name = 'cevapiApi';

	displayName = 'cevAPI API';

	documentationUrl = 'https://github.com/digital-organizing/cevapi';

	icon: Icon = {
		light: 'file:../icons/cevapi.svg',
		dark: 'file:../icons/cevapi.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'http://spark.example.ch:8090',
			description: 'Root URL of the gateway, without a trailing slash and without /v1',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: "The server's CEVAPI_TOKEN. Leave empty if the instance runs without auth.",
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

	/** /health needs no auth, but a wrong base URL fails here instead of mid-workflow. */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/health',
			method: 'GET',
		},
	};
}
