import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * The link shortener authenticates with a key created in the Django admin,
 * sent as `Authorization: Api-Key <key>`.
 *
 * A key acts on behalf of its owner and inherits that user's group membership:
 * it only sees links filed under groups the owner belongs to, and can only put
 * links on domains those groups may use. Keys can carry an expiry, after which
 * every request answers 401.
 */
export class LinkShortenerApi implements ICredentialType {
	name = 'linkShortenerApi';

	displayName = 'Link Shortener API';

	documentationUrl = 'https://github.com/digital-organizing/n8n-nodes-digital-organizing';

	icon: Icon = {
		light: 'file:../icons/linkshortener.svg',
		dark: 'file:../icons/linkshortener.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://links.example.ch',
			description: 'Root URL of the instance, without a trailing slash and without /api',
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
				Authorization: '=Api-Key {{$credentials.apiKey}}',
			},
		},
	};

	/** The API's own smoke test: it answers with the identity behind the key. */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/whoami/',
			method: 'GET',
		},
	};
}
