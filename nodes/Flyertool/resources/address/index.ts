import type { INodeProperties } from 'n8n-workflow';

const resource = 'address';
const show = { resource: [resource] };

/**
 * Buildings from the Swiss building register (EGWR), under /api/egwr.
 *
 * These two endpoints are public — Flyertool leaves them unauthenticated so the
 * signup form can use them. They are here because a workflow setting a contact's
 * address needs an EGID, and this is how you find one.
 */
export const addressDescription: INodeProperties[] = [
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
				action: 'Get an address by EGID',
				routing: {
					request: { method: 'GET', url: '=/api/egwr/building/{{$parameter.egid}}' },
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search addresses',
				routing: {
					request: { method: 'GET', url: '/api/egwr/search' },
				},
			},
		],
		default: 'search',
	},

	{
		displayName: 'EGID',
		name: 'egid',
		type: 'number',
		default: 0,
		required: true,
		description: 'Federal building identifier',
		displayOptions: { show: { ...show, operation: ['get'] } },
	},

	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Hauptstrasse 12, 8001 Zürich',
		description:
			'Address to search for. Needs at least two characters and returns at most ten matches, best first.',
		displayOptions: { show: { ...show, operation: ['search'] } },
		routing: { send: { type: 'query', property: 'query' } },
	},
	{
		displayName: 'Campaign ID',
		name: 'searchCampaignId',
		type: 'number',
		default: 0,
		description:
			"Restrict the search to the campaign's address filters, the same way the signup form does",
		displayOptions: { show: { ...show, operation: ['search'] } },
		routing: { send: { type: 'query', property: 'campaign_id' } },
	},
];
