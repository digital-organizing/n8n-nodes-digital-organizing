import type { INodeProperties } from 'n8n-workflow';
import { slugProperty, keyProperty } from '../../shared/descriptions';

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
					},
					send: {
						type: 'query',
						property: 'key',
						value: '={{$parameter.key}}',
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
						url: '=/api/counter/campaigns/{{$parameter.slug}}/entries',
					},
					send: {
						type: 'query',
						property: 'key',
						value: '={{$parameter.key}}',
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
						url: '=/api/counter/campaigns/{{$parameter.slug}}/entries',
					},
					send: {
						type: 'query',
						property: 'key',
						value: '={{$parameter.key}}',
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
						url: '=/api/counter/campaigns/{{$parameter.slug}}/entries/{{$parameter.entryId}}/toggle',
					},
					send: {
						type: 'query',
						property: 'key',
						value: '={{$parameter.key}}',
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
						url: '=/api/counter/campaigns/{{$parameter.slug}}/entries/{{$parameter.entryId}}/update',
					},
					send: {
						type: 'query',
						property: 'key',
						value: '={{$parameter.key}}',
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
	{
		...keyProperty,
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
			},
		},
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'string',
		default: '',
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
		displayOptions: {
			show: {
				resource: ['campaignEntry'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'data',
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
		routing: {
			send: {
				type: 'body',
				value: '={{$value.split(",").map(id => parseInt(id.trim(), 10))}}',
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
