import type { INodeProperties } from 'n8n-workflow';
import { API } from '../../shared/descriptions';

const resource = 'definition';
const show = { resource: [resource] };

/**
 * Definitions — `/definition`, the field configuration of the whole account.
 *
 * This is the schema nothing else in the API carries: which properties a member
 * has, what they are called in this account, their datatype, the allowed values
 * of an enum, and the internal ID behind each name. A workflow that writes to a
 * Webling it did not configure itself should read this first.
 *
 * It is also the only place the `/object` endpoint's numeric property keys can
 * be resolved back to names.
 */
export const definitionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the field definitions',
				routing: { request: { method: 'GET', url: `${API}/definition` } },
			},
		],
		default: 'get',
	},

	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'Simple',
				value: 'simple',
				description: 'Readable, and enough to learn the field names and datatypes',
			},
			{
				name: 'Full',
				value: 'full',
				description: 'Every detail, and the format a definition change is written in',
			},
			{ name: 'Zapier', value: 'zapier', description: "The shape Webling's Zapier app uses" },
		],
		default: 'simple',
		displayOptions: { show },
		routing: { send: { type: 'query', property: 'format' } },
	},
];
