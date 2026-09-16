import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Payrexx offers two authentication schemes. The older one signs every request
 * with an HMAC over the query string (`ApiSignature`); the newer one, which
 * Payrexx itself recommends, passes the API secret in an `X-API-KEY` header.
 * This credential uses the header — same secret, no signing.
 *
 * The instance name is a query parameter on every call, so it is attached here
 * rather than repeated in each node operation.
 *
 * https://developers.payrexx.com/reference/rest-api
 */
export class PayrexxApi implements ICredentialType {
	name = 'payrexxApi';

	displayName = 'Payrexx API';

	documentationUrl = 'https://developers.payrexx.com/reference/rest-api';

	icon: Icon = { light: 'file:../icons/payrexx.svg', dark: 'file:../icons/payrexx.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Instance Name',
			name: 'instance',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'myshop',
			description:
				'The instance name, i.e. the subdomain of your Payrexx account: myshop.payrexx.com is myshop',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.payrexx.com/v1.16',
			required: true,
			description:
				'The API version is part of the URL. The nodes are built against v1.16; older versions may not accept every field.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-KEY': '={{$credentials.apiSecret}}',
			},
			qs: {
				instance: '={{$credentials.instance}}',
			},
		},
	};

	/** Payrexx's own endpoint for checking that a request authenticates. */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/SignatureCheck/',
			method: 'GET',
		},
	};
}
