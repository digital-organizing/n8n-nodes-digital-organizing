import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { customDescription } from './resources/custom';
import { entryDescription } from './resources/entry';
import { formDescription } from './resources/form';
import { submissionDescription } from './resources/submission';

/**
 * Gravity Forms, the WordPress form plugin, through its REST API v2.
 *
 * The API lives under `/wp-json/gf/v2` on the site itself, so the credential
 * carries the site URL. Every request runs as the WordPress user behind the API
 * key, and the key's Gravity Forms capabilities decide what it may do — reading
 * forms and reading entries are separate permissions.
 *
 * https://docs.gravityforms.com/rest-api-v2/
 */
export class GravityForms implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gravity Forms',
		name: 'gravityForms',
		icon: {
			light: 'file:../../icons/gravityforms.svg',
			dark: 'file:../../icons/gravityforms.dark.svg',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read and write Gravity Forms forms, entries and submissions',
		defaults: {
			name: 'Gravity Forms',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gravityFormsApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Custom API Call',
						value: 'custom',
					},
					{
						name: 'Entry',
						value: 'entry',
					},
					{
						name: 'Form',
						value: 'form',
					},
					{
						name: 'Submission',
						value: 'submission',
					},
				],
				default: 'entry',
			},
			...entryDescription,
			...formDescription,
			...submissionDescription,
			...customDescription,
		],
	};
}
