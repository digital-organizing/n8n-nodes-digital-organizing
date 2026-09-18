import type { INodeProperties } from 'n8n-workflow';
import { slugProperty, keyProperty } from '../../shared/descriptions';

// The entry endpoints expect the payload as the raw JSON body (an object for
// create/update, an array of IDs for batch publish), which declarative routing
// can only build through `request.body`.
const dataExpression =
	'={{ typeof $parameter.data === "string" ? JSON.parse($parameter.data) : $parameter.data }}';

const entryIdsExpression =
	'={{ typeof $parameter.entryIds === "string" ? $parameter.entryIds.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : $parameter.entryIds }}';

export const campaignEntryDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
			},
		},
		options: [
			{
				name: 'Batch Publish',
				value: 'batchPublish',
				action: 'Batch publish campaign entries',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/counter/campaigns/{{$parameter.slug}}/entries/batch-publish',
						body: entryIdsExpression,
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a campaign entry',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/counter/campaign/{{$parameter.slug}}/entries',
					},
					send: {
						type: 'body',
						property: 'data',
						value: dataExpression,
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many campaign entries',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/counter/campaign/{{$parameter.slug}}/entries',
					},
				},
			},
			{
				name: 'Toggle Published',
				value: 'toggle',
				action: 'Toggle campaign entry published status',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/counter/campaign/{{$parameter.slug}}/entries/{{$parameter.entryId}}/toggle',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a campaign entry',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/counter/campaign/{{$parameter.slug}}/entries/{{$parameter.entryId}}/update',
						body: dataExpression,
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		...slugProperty,
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
			},
		},
	},
	// Every entry endpoint authenticates with the campaign key as a query parameter
	{
		...keyProperty,
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'key',
			},
		},
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
				operation: ['toggle', 'update'],
			},
		},
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '{}',
		description: 'The entry fields as a JSON object',
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Entry IDs',
		name: 'entryIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of entry IDs',
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
				operation: ['batchPublish'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		description: 'Number of entries to skip',
		typeOptions: {
			minValue: 0,
		},
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'offset',
			},
		},
	},
];
