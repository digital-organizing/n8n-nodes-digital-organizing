import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * funtrade — the CRM, fundraising and accounting system by Arenae Consulting —
 * authenticates with an API key sent in the `apikey` header. The key can also be
 * passed as a query parameter; the header is used here so it stays out of logs.
 *
 * Keys are not self-service: they are requested from the assigned funtrade
 * support contact, quoting the account identifier.
 *
 * https://app.funtrade.ch/api/
 */
export class FuntradeApi implements ICredentialType {
	name = 'funtradeApi';

	displayName = 'Funtrade API';

	documentationUrl = 'https://app.funtrade.ch/api/';

	icon: Icon = { light: 'file:../icons/funtrade.svg', dark: 'file:../icons/funtrade.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.funtrade.ch',
			required: true,
			description:
				'Root URL of the funtrade instance, without a trailing slash and without /api. The hosted instance is https://app.funtrade.ch.',
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
				apikey: '={{$credentials.apiKey}}',
			},
		},
	};

	/** A reference list every key may read, so a green test means the key works. */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1.0/crmapi/countries',
			method: 'GET',
		},
	};
}
