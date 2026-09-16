import type { INodeProperties } from 'n8n-workflow';
import { mergeCustomFields } from '../../shared/mergeCustomFields';

const show = { resource: ['campaign'] };

/**
 * Campaign submissions: a contact plus its consent record, posted to the tenant's
 * campaign endpoint. The field names below are the ones our first tenant accepts
 * (see mv-mietzinsrechner/rechner/serializers.py); other tenants may name them
 * differently — anything non-standard goes through Custom Fields.
 */
export const campaignDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a campaign entry',
				routing: {
					request: {
						method: 'POST',
						url: '=/{{$parameter.endpoint}}',
					},
					send: {
						preSend: [mergeCustomFields],
					},
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Endpoint',
		name: 'endpoint',
		type: 'string',
		default: 'campaign',
		required: true,
		description: 'Path segment below the base URL that receives the submission',
		displayOptions: { show: { ...show, operation: ['create'] } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Contact Fields',
		name: 'contactFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Consent IP',
				name: 'einwilligung_ip',
				type: 'string',
				default: '',
				description: 'IP address the consent was given from',
				routing: { send: { type: 'body', property: 'einwilligung_ip' } },
			},
			{
				displayName: 'Consent Timestamp',
				name: 'einwilligung_timestamp',
				type: 'dateTime',
				default: '',
				description: 'When the contact gave consent',
				routing: { send: { type: 'body', property: 'einwilligung_timestamp' } },
			},
			{
				displayName: 'Consent URL',
				name: 'einwilligung_url',
				type: 'string',
				default: '',
				description: 'URL of the form the consent was given on',
				routing: { send: { type: 'body', property: 'einwilligung_url' } },
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'first_name' } },
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'last_name' } },
			},
			{
				displayName: 'Newsletter Opt-In',
				name: 'nl_abo',
				type: 'boolean',
				default: false,
				description: 'Whether the contact subscribed to the newsletter',
				routing: { send: { type: 'body', property: 'nl_abo' } },
			},
			{
				displayName: 'Salutation',
				name: 'anrede',
				type: 'string',
				default: '',
				description: 'Form of address, e.g. Herr or Frau',
				routing: { send: { type: 'body', property: 'anrede' } },
			},
			{
				displayName: 'Source',
				name: 'quelle',
				type: 'string',
				default: '',
				description: 'Where the submission came from',
				routing: { send: { type: 'body', property: 'quelle' } },
			},
			{
				displayName: 'ZIP Code',
				name: 'zip_code',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'zip_code' } },
			},
		],
	},
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'json',
		default: '{}',
		description: 'Campaign-specific fields, merged into the request body as-is',
		hint: 'For example the mzr_* fields of the Mietzinsrechner campaign',
		displayOptions: { show: { ...show, operation: ['create'] } },
	},
];
