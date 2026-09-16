import type { INodeProperties } from 'n8n-workflow';
import { slugProperty, keyProperty } from '../../shared/descriptions';

export const campaignDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a campaign',
				routing: {
					request: {
						method: 'POST',
						url: '/api/counter/campaigns',
					},
				},
			},
			{
				name: 'Get Count',
				value: 'getCount',
				action: 'Get campaign count',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/counter/campaigns/{{$parameter.slug}}/count',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a campaign',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/counter/campaigns/{{$parameter.slug}}',
					},
				},
			},
		],
		default: 'getCount',
	},
	{
		...slugProperty,
		displayOptions: {
			show: {
				resource: ['campaign'],
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
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
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
		...keyProperty,
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'key',
			},
		},
	},
	{
		displayName: 'Field Names',
		name: 'field_names',
		type: 'string',
		default: '',
		description: 'Comma-separated list of field names',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'field_names',
			},
		},
	},
	{
		displayName: 'Unique Field',
		name: 'unique_field',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'unique_field',
			},
		},
	},
	{
		displayName: 'Order Field',
		name: 'order_field',
		type: 'string',
		default: 'created_at',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'order_field',
			},
		},
	},
	{
		displayName: 'Template',
		name: 'template',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'template',
			},
		},
	},
	{
		displayName: 'Separator',
		name: 'separator',
		type: 'string',
		default: ',',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'separator',
			},
		},
	},
];
