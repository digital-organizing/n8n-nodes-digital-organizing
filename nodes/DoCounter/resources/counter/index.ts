import type { INodeProperties } from 'n8n-workflow';
import { slugProperty, keyProperty } from '../../shared/descriptions';

export const counterDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['counter'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a counter',
				routing: {
					request: {
						method: 'POST',
						url: '/api/counter/counters',
					},
					send: {
						type: 'body',
						property: 'slug',
						value: '={{$parameter.slug}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a counter',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/counter/counter/{{$parameter.slug}}/',
					},
				},
			},
			{
				name: 'Increment',
				value: 'increment',
				action: 'Increment a counter',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/counter/counter/{{$parameter.slug}}/increment',
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
				action: 'Update a counter',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/counter/counters/{{$parameter.slug}}',
					},
				},
			},
		],
		default: 'increment',
	},
	{
		...slugProperty,
		displayOptions: {
			show: {
				resource: ['counter'],
			},
		},
	},
	// Parameters for Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'name',
			},
		},
	},
	{
		displayName: 'Initial Count',
		name: 'count',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'count',
			},
		},
	},
	{
		displayName: 'Base',
		name: 'base',
		type: 'number',
		default: 0,
		description: 'Offset that is added to the raw count when the counter is read',
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'base',
			},
		},
	},
	// Key: part of the body on create, part of the query string on increment
	{
		...keyProperty,
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['create', 'increment'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'key',
			},
		},
	},
	// Parameters for Increment
	{
		displayName: 'Increment By',
		name: 'increment',
		type: 'number',
		default: 1,
		description: 'How much to add to the counter',
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['increment'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'increment',
			},
		},
	},
	// Parameters for Update: only the fields that are set are sent, so an update
	// never resets values the user did not touch
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Base',
				name: 'base',
				type: 'number',
				default: 0,
				description: 'Offset that is added to the raw count when the counter is read',
				routing: {
					send: {
						type: 'body',
						property: 'base',
					},
				},
			},
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				default: 0,
				description: 'Set the raw count to this value',
				routing: {
					send: {
						type: 'body',
						property: 'count',
					},
				},
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				description: 'Replace the secret key of the counter',
				routing: {
					send: {
						type: 'body',
						property: 'key',
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
			},
			{
				displayName: 'New Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Rename the slug of the counter',
				routing: {
					send: {
						type: 'body',
						property: 'slug',
					},
				},
			},
		],
	},
];
