import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Cura authenticates with a static token in the Authorization header, in the
 * form `token <ID>`. The token is issued by Cura support, not self-service.
 *
 * https://www.cura-fundraising.ch/support/systemintegration-und-schnittstellen/daten-via-schnittstelle/
 */
export class CuraApi implements ICredentialType {
	name = 'curaApi';

	displayName = 'Cura Fundraising API';

	documentationUrl =
		'https://www.cura-fundraising.ch/support/systemintegration-und-schnittstellen/daten-via-schnittstelle/';

	icon: Icon = { light: 'file:../icons/cura.svg', dark: 'file:../icons/cura.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://my.cura-fundraising.ch',
			required: true,
			description: 'Change only if Cura hosts your instance somewhere else',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The auth token issued by Cura support',
		},
		{
			displayName: 'Organisation Slug',
			name: 'organisationSlug',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'my-organisation',
			description: 'Identifies the organisation. Used by the connection test.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=token {{$credentials.apiToken}}',
			},
		},
	};

	/** The identification echo Cura documents for exactly this purpose. */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/latest/who-am-i/',
			method: 'GET',
			qs: {
				org: '={{$credentials.organisationSlug}}',
			},
		},
	};
}
