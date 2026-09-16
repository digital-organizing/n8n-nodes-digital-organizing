import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * TODO: fill in once we have the Cura Fundraising API documentation for our
 * instance. Base URL is per customer, so it is a credential field rather than a
 * constant in the node.
 */
export class CuraApi implements ICredentialType {
	name = 'curaApi';

	displayName = 'Cura Fundraising API';

	documentationUrl = 'https://www.curasoftware.ch/';

	icon: Icon = { light: 'file:../icons/cura.svg', dark: 'file:../icons/cura.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://cura.example.ch/api',
			description: 'Base URL of the Cura instance, without a trailing slash',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
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

	// TODO: point at a cheap read-only endpoint once the API surface is confirmed.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/',
			method: 'GET',
		},
	};
}
