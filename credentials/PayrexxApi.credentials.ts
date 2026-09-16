import { createHmac } from 'crypto';
import type {
	IAuthenticate,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Payrexx signs every request: the request parameters are serialised as a query
 * string, HMAC-SHA256'd with the API secret and sent base64 encoded as
 * `ApiSignature`. The instance name goes into the query string as `instance`.
 *
 * Because that cannot be expressed with n8n's declarative `IAuthenticateGeneric`,
 * authentication is done with a request function instead.
 *
 * TODO: verify against https://developers.payrexx.com/reference before the first
 * production run — in particular the serialisation of nested parameters
 * (`key[sub]=value`), which is not handled below.
 */
export class PayrexxApi implements ICredentialType {
	name = 'payrexxApi';

	displayName = 'Payrexx API';

	documentationUrl = 'https://developers.payrexx.com/reference/authentication';

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
				'The instance name, i.e. the subdomain of your Payrexx account (myshop.payrexx.com → myshop)',
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
			default: 'https://api.payrexx.com/v1.0',
			required: true,
			description: 'Change only if you are pointed at a different Payrexx environment',
		},
	];

	authenticate: IAuthenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		const instance = credentials.instance as string;
		const apiSecret = credentials.apiSecret as string;

		// Payrexx expects form-encoded parameters, and the signature is computed
		// over exactly the string that is sent as the body.
		const body = (requestOptions.body ?? {}) as Record<string, unknown>;
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(body)) {
			if (value === undefined || value === null) continue;
			params.append(key, String(value));
		}
		const payload = params.toString();

		const signature = createHmac('sha256', apiSecret).update(payload).digest('base64');

		requestOptions.qs = { ...(requestOptions.qs ?? {}), instance };
		requestOptions.headers = {
			...(requestOptions.headers ?? {}),
			'Content-Type': 'application/x-www-form-urlencoded',
		};

		params.append('ApiSignature', signature);
		requestOptions.body = params.toString();

		return requestOptions;
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/SignatureCheck/',
			method: 'GET',
		},
	};
}
