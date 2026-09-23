import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * chaddr is our own address service: it matches a manually typed Swiss address
 * against the federal building and dwelling register (GWR/MADD) and returns the
 * canonical spelling with its EGID/EGAID and coordinates. Self-hosted, so the
 * base URL points at our own instance.
 *
 * The key is one of the comma-separated values in the server's CHADDR_API_KEYS
 * and is sent as `X-API-Key`. A server started without that variable answers
 * every request with 503, so an empty key here is never useful.
 */
export class AddressCleanupApi implements ICredentialType {
	name = 'addressCleanupApi';

	displayName = 'Address Cleanup API';

	documentationUrl = 'https://github.com/digital-organizing/address-cleanup';

	icon: Icon = {
		light: 'file:../icons/addresscleanup.svg',
		dark: 'file:../icons/addresscleanup.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'http://chaddr.example.ch:8000',
			description: 'Root URL of the service, without a trailing slash and without /v1',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'One of the keys in the server CHADDR_API_KEYS',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	/**
	 * /v1/status is the cheapest authenticated route, so a wrong key fails here
	 * instead of mid-workflow. On a fresh volume it answers 503 until the register
	 * is downloaded and indexed — the key is fine, the index is not there yet.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/status',
			method: 'GET',
		},
	};
}
