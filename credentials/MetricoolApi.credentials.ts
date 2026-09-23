import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Metricool — social media analytics and scheduling — identifies a caller with
 * three values rather than one:
 *
 * - `userToken`, the secret, from Account Settings → API in the web app,
 * - `userId`, the account it belongs to, shown next to it, and
 * - `blogId`, the brand the call is about.
 *
 * The first two are the credential, since they are the same for every call. The
 * third is a node parameter: one account manages many brands, and which brand a
 * workflow means is a per-operation decision.
 *
 * The token may travel as the `X-Mc-Auth` header instead of a query parameter,
 * which is what this does so it stays out of logs and proxy access records. The
 * user ID has no header form and goes on the query string.
 *
 * https://app.metricool.com/api/swagger.json
 */
export class MetricoolApi implements ICredentialType {
	name = 'metricoolApi';

	displayName = 'Metricool API';

	documentationUrl = 'https://app.metricool.com/api/swagger.json';

	icon: Icon = {
		light: 'file:../icons/metricool.svg',
		dark: 'file:../icons/metricool.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			required: true,
			description:
				'Numeric ID of the Metricool account, shown next to the token in Account Settings → API',
		},
		{
			displayName: 'User Token',
			name: 'userToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Personal access token from Account Settings → API. It carries the whole account, so treat it as a password.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.metricool.com/api',
			required: true,
			description:
				'Root URL of the API, including /api and without a trailing slash. Only change it for a white-label deployment.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Mc-Auth': '={{$credentials.userToken}}',
			},
			qs: {
				userId: '={{$credentials.userId}}',
			},
		},
	};

	/** The brand list is what every other call needs a blogId from, so it is the smoke test. */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v2/settings/brands',
			method: 'GET',
		},
	};
}
