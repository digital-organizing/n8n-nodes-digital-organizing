import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * The LibraCore service platform sits behind Auth0: a client-credentials grant
 * exchanges client ID + secret for a bearer token scoped to an audience, and that
 * token is sent to the service API.
 *
 * Both the API base URL and the audience are per customer and per environment,
 * and take this shape:
 *   Base URL  https://services-api-staging.example.ch/api/v1/yourtenant
 *   Audience  same as the base URL
 *   Domain    example.eu.auth0.com
 *
 * Mirrors the token handling in mv-mietzinsrechner/mv_api/services.py. n8n caches
 * the token in the credential and re-runs `preAuthentication` when a request comes
 * back unauthorised, so expiry needs no handling here.
 */
export class LibraCoreApi implements ICredentialType {
	name = 'libraCoreApi';

	displayName = 'LibraCore Service Platform API';

	documentationUrl =
		'https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow';

	icon: Icon = { light: 'file:../icons/libracore.svg', dark: 'file:../icons/libracore.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://services-api.example.ch/api/v1/yourtenant',
			description:
				'Base URL of the service platform including the tenant path, without a trailing slash',
		},
		{
			displayName: 'Auth0 Domain',
			name: 'authDomain',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'example.eu.auth0.com',
			description: 'Auth0 tenant domain, without protocol and without a trailing slash',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Audience',
			name: 'audience',
			type: 'string',
			default: '',
			placeholder: 'https://services-api.example.ch/api/v1/yourtenant',
			description:
				'Auth0 API audience the token is issued for. Defaults to the API base URL, which is how it is usually configured.',
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			default: '',
			typeOptions: { expirable: true, password: true },
		},
	];

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<IDataObject> {
		const domain = (credentials.authDomain as string)
			.replace(/^https?:\/\//, '')
			.replace(/\/+$/, '');
		const audience = ((credentials.audience as string) || (credentials.baseUrl as string)).replace(
			/\/+$/,
			'',
		);

		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `https://${domain}/oauth/token`,
			body: {
				grant_type: 'client_credentials',
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
				audience,
			},
			json: true,
		})) as { access_token: string };

		return { sessionToken: response.access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.sessionToken}}',
			},
		},
	};

	/**
	 * The service API exposes no cheap read-only endpoint we could probe without
	 * writing data, so the test verifies the half that actually goes wrong in
	 * practice: whether Auth0 issues a token for this client and audience.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.authDomain}}',
			url: '/oauth/token',
			method: 'POST',
			body: {
				grant_type: 'client_credentials',
				client_id: '={{$credentials.clientId}}',
				client_secret: '={{$credentials.clientSecret}}',
				audience: '={{$credentials.audience || $credentials.baseUrl}}',
			},
		},
	};
}
