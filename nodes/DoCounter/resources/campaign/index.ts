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
					send: {
						type: 'body',
						property: 'slug',
						value: '={{$parameter.slug}}',
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
				name: 'Increment',
				value: 'increment',
				action: 'Increment a campaign count',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/counter/campaigns/{{$parameter.slug}}/increment',
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
	// Key: part of the body on create, part of the query string on increment
	{
		...keyProperty,
		displayOptions: {
			show: {
				resource: ['campaign'],
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
	{
		displayName: 'Initial Count',
		name: 'count',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: ['campaign'],
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
		description: 'Offset that is added to the raw count when the campaign is read',
		displayOptions: {
			show: {
				resource: ['campaign'],
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
	{
		displayName: 'Field Names',
		name: 'field_names',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of field names to be used in the template (e.g. name, email)',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
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
		description: 'Field name to be used for uniqueness (e.g. email)',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
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
		description: 'Field name to be used for ordering (e.g. created_at)',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
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
		description: 'Template for rendering entries. Use {{field_name}} to include field values.',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
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
		description: 'Separator used between rendered entries',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'separator',
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
				resource: ['campaign'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Base',
				name: 'base',
				type: 'number',
				default: 0,
				description: 'Offset that is added to the raw count when the campaign is read',
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
				displayName: 'Field Names',
				name: 'field_names',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of field names to be used in the template (e.g. name, email)',
				routing: {
					send: {
						type: 'body',
						property: 'field_names',
					},
				},
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				description: 'Replace the secret key of the campaign',
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
				description: 'Rename the slug of the campaign',
				routing: {
					send: {
						type: 'body',
						property: 'slug',
					},
				},
			},
			{
				displayName: 'Order Field',
				name: 'order_field',
				type: 'string',
				default: 'created_at',
				description: 'Field name to be used for ordering (e.g. created_at)',
				routing: {
					send: {
						type: 'body',
						property: 'order_field',
					},
				},
			},
			{
				displayName: 'Separator',
				name: 'separator',
				type: 'string',
				default: ',',
				description: 'Separator used between rendered entries',
				routing: {
					send: {
						type: 'body',
						property: 'separator',
					},
				},
			},
			{
				displayName: 'Template',
				name: 'template',
				type: 'string',
				default: '',
				description: 'Template for rendering entries. Use {{field_name}} to include field values.',
				typeOptions: {
					rows: 4,
				},
				routing: {
					send: {
						type: 'body',
						property: 'template',
					},
				},
			},
			{
				displayName: 'Unique Field',
				name: 'unique_field',
				type: 'string',
				default: '',
				description: 'Field name to be used for uniqueness (e.g. email)',
				routing: {
					send: {
						type: 'body',
						property: 'unique_field',
					},
				},
			},
		],
	},
];
