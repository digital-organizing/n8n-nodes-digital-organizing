import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Template Studio is our own image service: a Canva design is imported once, its
 * texts and images are marked as fields, and every request renders a personalised
 * image from it. Self-hosted, so the base URL points at our own instance.
 *
 * Keys are created in the admin under API → API keys and are shown once. A key can
 * be limited to certain templates; it then only lists and renders those.
 */
export class TemplateStudioApi implements ICredentialType {
	name = 'templateStudioApi';

	displayName = 'Template Studio API';

	documentationUrl = 'https://github.com/sacovo/testimonial-generator';

	icon: Icon = {
		light: 'file:../icons/templatestudio.svg',
		dark: 'file:../icons/templatestudio.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://studio.example.ch',
			description: 'Root URL of the instance, without a trailing slash and without /api',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Created in the admin under API → API keys',
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

	/** The template list is the cheapest authenticated route; /api/health/ takes no key. */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl.trim().replace(/\\/+$/, "") }}',
			url: '/api/templates/',
			method: 'GET',
		},
	};
}
