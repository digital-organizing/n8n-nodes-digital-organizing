import type { INodeProperties } from 'n8n-workflow';
import { slugProperty, keyProperty } from '../../shared/descriptions';
import { listOutput, offsetListProperties } from '../../../shared/pagination';

const resource = 'campaignEntry';
const show = { resource: [resource] };

// Create and update both take the entry under a `data` key — the update handler
// reads `payload["data"]` and ignores anything else. Batch publish is the one
// endpoint that wants a bare JSON array, which only `request.body` can build.
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
		displayOptions: { show },
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
					...listOutput('items'),
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
					},
					send: {
						type: 'body',
						property: 'data',
						value: dataExpression,
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		...slugProperty,
		displayOptions: { show },
	},
	// Every entry endpoint authenticates with the campaign key as a query parameter
	{
		...keyProperty,
		displayOptions: { show },
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
			show: { ...show, operation: ['toggle', 'update'] },
		},
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '{}',
		description:
			'The entry fields as a JSON object. On update, only keys listed in the campaign field names are applied.',
		displayOptions: {
			show: { ...show, operation: ['create', 'update'] },
		},
	},
	{
		displayName: 'Entry IDs',
		name: 'entryIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of entry IDs',
		displayOptions: {
			show: { ...show, operation: ['batchPublish'] },
		},
	},
	// ─── Get Many ──────────────────────────────────────────────────────────────
	...offsetListProperties(resource, 'items'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: { ...show, operation: ['getAll'] },
		},
		options: [
			{
				displayName: 'Ordering',
				name: 'ordering',
				type: 'options',
				options: [
					{ name: 'Newest First', value: '-created_at' },
					{ name: 'Oldest First', value: 'created_at' },
					{ name: 'Published First', value: '-published' },
					{ name: 'Unpublished First', value: 'published' },
				],
				default: '-created_at',
				routing: { send: { type: 'query', property: 'ordering' } },
			},
			{
				displayName: 'Published',
				name: 'published',
				type: 'boolean',
				default: true,
				description: 'Whether to return only published or only unpublished entries',
				routing: { send: { type: 'query', property: 'published' } },
			},
		],
	},
];
