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
 * The RaiseNow EPayment API uses an OAuth2 client-credentials grant: POST the
 * client ID and secret to /oauth2/token, get a JWT back, send it as a bearer
 * token. n8n caches the token in the credential and re-runs `preAuthentication`
 * when a request comes back unauthorised, so the one-hour expiry needs no
 * handling here.
 *
 * https://docs.raisenow.com/api
 */
export class RaiseNowApi implements ICredentialType {
	name = 'raiseNowApi';

	displayName = 'RaiseNow API';

	documentationUrl = 'https://docs.raisenow.com/api';

	icon: Icon = { light: 'file:../icons/raisenow.svg', dark: 'file:../icons/raisenow.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.raisenow.io',
			required: true,
			description: 'Change only if RaiseNow pointed you at a different environment',
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
			displayName: 'Access Token',
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
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/oauth2/token`,
			body: {
				grant_type: 'client_credentials',
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
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
	 * Tests the grant itself rather than a resource endpoint: every resource needs
	 * an organisation or account UUID we do not have at credential level.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/oauth2/token',
			method: 'POST',
			body: {
				grant_type: 'client_credentials',
				client_id: '={{$credentials.clientId}}',
				client_secret: '={{$credentials.clientSecret}}',
			},
		},
	};
}
