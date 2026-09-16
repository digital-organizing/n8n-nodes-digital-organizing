import type { INodeProperties } from 'n8n-workflow';

const resource = 'search';
const show = { resource: [resource] };

/**
 * Search — https://docs.raisenow.com/api
 *
 * The public API exposes one search index, payment agreements. The query object
 * is passed through untouched because its DSL (`$match`, `$and`, …) is richer
 * than anything worth modelling as node parameters.
 */
export const searchDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Payment Agreements',
				value: 'paymentAgreements',
				action: 'Search payment agreements',
				routing: { request: { method: 'POST', url: '/search/payment-agreements' } },
			},
		],
		default: 'paymentAgreements',
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'json',
		default: '{\n  "$match": {}\n}',
		required: true,
		description: 'The query object, in the RaiseNow search DSL',
		hint: 'For example {"$match": {"uuid": "d4aabab9-3765-4726-bca3-0da1d88bdeaa"}}',
		displayOptions: { show },
		routing: {
			send: {
				type: 'body',
				property: 'query',
				value: '={{ JSON.parse($value || "{}") }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Aggregations',
				name: 'aggs',
				type: 'json',
				default: '{}',
				description: 'Aggregation definitions, keyed by the name you want in the result',
				routing: {
					send: {
						type: 'body',
						property: 'aggs',
						value: '={{ JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Excludes',
				name: 'excludes',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
				default: [],
				description: 'Fields to leave out of the results',
				routing: { send: { type: 'body', property: 'excludes' } },
			},
			{
				displayName: 'Includes',
				name: 'includes',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
				default: [],
				description: 'Fields to return. All fields are returned when left empty.',
				routing: { send: { type: 'body', property: 'includes' } },
			},
			{
				displayName: 'Limit',
				name: 'size',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1 },
				description: 'Max number of results to return',
				routing: { send: { type: 'body', property: 'size' } },
			},
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				description: 'Offset into the result list',
				routing: { send: { type: 'body', property: 'from' } },
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '[{ "field": "created", "direction": "desc" }]',
				description: 'List of sort definitions, each with field, direction and optional field_type',
				routing: {
					send: {
						type: 'body',
						property: 'sort',
						value: '={{ JSON.parse($value || "[]") }}',
					},
				},
			},
		],
	},
];
