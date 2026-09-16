import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * TODO: confirm the auth scheme against the RaiseNow developer docs before use.
 * The bearer-token setup below is the common case; RaiseNow also issues
 * basic-auth API users for some products, in which case swap `authenticate`
 * for `{ type: 'generic', properties: { auth: { username, password } } }`.
 */
export class RaiseNowApi implements ICredentialType {
	name = 'raiseNowApi';

	displayName = 'RaiseNow API';

	documentationUrl = 'https://docs.raisenow.io/';

	icon: Icon = { light: 'file:../icons/raisenow.svg', dark: 'file:../icons/raisenow.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.raisenow.io',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Organisation ID',
			name: 'organisationId',
			type: 'string',
			default: '',
			description: 'Optional, used by endpoints that are scoped to one organisation',
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
