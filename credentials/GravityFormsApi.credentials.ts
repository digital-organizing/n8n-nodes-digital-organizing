import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Gravity Forms rides on the WordPress REST API, under `/wp-json/gf/v2`, and
 * authenticates with HTTP Basic over TLS.
 *
 * Two kinds of credentials fit the same two fields:
 *
 *   - an API key pair created under Forms → Settings → REST API, `ck_…` / `cs_…`
 *   - a WordPress username together with an application password from the user's
 *     profile page
 *
 * Either way the request runs with the capabilities of the WordPress user behind
 * it, so a key that cannot see entries answers 401 rather than an empty list.
 * Basic authentication is only supported over HTTPS.
 *
 * https://docs.gravityforms.com/rest-api-v2-basic-authentication/
 */
export class GravityFormsApi implements ICredentialType {
	name = 'gravityFormsApi';

	displayName = 'Gravity Forms API';

	documentationUrl = 'https://docs.gravityforms.com/rest-api-v2-basic-authentication/';

	icon: Icon = {
		light: 'file:../icons/gravityforms.svg',
		dark: 'file:../icons/gravityforms.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://example.com',
			description:
				'Root URL of the WordPress site, without a trailing slash and without /wp-json. Must be https, Gravity Forms rejects Basic Auth over plain http.',
		},
		{
			displayName: 'Consumer Key',
			name: 'consumerKey',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'ck_5f86565df60696c43af25f9194e106800770b8e9',
			description:
				'Key from Forms → Settings → REST API, or a WordPress username when authenticating with an application password',
		},
		{
			displayName: 'Consumer Secret',
			name: 'consumerSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'cs_be0190310fefc061c564168670d0a96d68873c29',
			description: 'Secret belonging to the key, or the application password',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.consumerKey}}',
				password: '={{$credentials.consumerSecret}}',
			},
		},
	};

	/**
	 * Listing forms is the cheapest authenticated call: it needs the
	 * `gravityforms_edit_forms` capability and answers with titles and entry
	 * counts only.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/wp-json/gf/v2/forms',
			method: 'GET',
		},
	};
}
