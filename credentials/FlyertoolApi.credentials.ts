import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Flyertool authenticates with a key created in the Django admin under
 * "API-Schlüssel", sent in the `X-API-Key` header.
 *
 * A key belongs to a user and inherits that user's visibility: a key of a
 * non-superuser only ever sees contacts and assignments of campaigns that user
 * owns. Anything outside them answers 404 rather than 403, so an empty result
 * can mean the key is scoped too narrowly rather than that nothing matched.
 */
export class FlyertoolApi implements ICredentialType {
	name = 'flyertoolApi';

	displayName = 'Flyertool API';

	documentationUrl = 'https://github.com/digital-organizing/n8n-nodes-digital-organizing';

	icon: Icon = { light: 'file:../icons/flyertool.svg', dark: 'file:../icons/flyertool.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://flyertool.example.ch',
			description: 'Root URL of the Flyertool instance, without a trailing slash and without /api',
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
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/flyertool/contacts',
			method: 'GET',
			qs: { limit: 1 },
		},
	};
}
