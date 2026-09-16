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
	// Parameters for Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
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
		...slugProperty,
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['create', 'get', 'increment', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'slug',
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
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'base',
			},
		},
	},
	{
		...keyProperty,
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['create', 'increment', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'key',
			},
		},
	},
	// Parameters for Update
	{
		displayName: 'New Name',
		name: 'newName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['update'],
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
		displayName: 'New Count',
		name: 'newCount',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: ['counter'],
				operation: ['update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'count',
			},
		},
	},
];
