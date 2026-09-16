import type { INodeProperties } from 'n8n-workflow';
import { idProperty } from '../../shared/descriptions';

const resource = 'transaction';
const show = { resource: [resource] };

/**
 * Transactions — https://developers.payrexx.com/reference/retrieve-a-transaction
 *
 * Note on Get Many: Payrexx documents its filters as a request body on a GET.
 * They are sent as query parameters here, since a GET body is not reliably
 * forwarded and the query string is what their own SDK builds.
 */
export const transactionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a waiting transaction',
				routing: {
					request: { method: 'PATCH', url: '=/Transaction/{{$parameter.transactionId}}/cancel' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a transaction',
				routing: {
					request: { method: 'GET', url: '=/Transaction/{{$parameter.transactionId}}/' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many transactions',
				routing: { request: { method: 'GET', url: '/Transaction/' } },
			},
			{
				name: 'Refund',
				value: 'refund',
				action: 'Refund a transaction',
				routing: {
					request: { method: 'POST', url: '=/Transaction/{{$parameter.transactionId}}/refund' },
				},
			},
			{
				name: 'Send Mail Receipt',
				value: 'sendReceipt',
				action: 'Send a mail receipt for a transaction',
				routing: {
					request: { method: 'POST', url: '=/Transaction/{{$parameter.transactionId}}/receipt' },
				},
			},
		],
		default: 'get',
	},

	idProperty(
		'Transaction ID',
		'transactionId',
		resource,
		['get', 'cancel', 'refund', 'sendReceipt'],
		'The ID of the transaction',
	),

	// ─── Refund ────────────────────────────────────────────────────────────────
	{
		displayName: 'Refund Full Amount',
		name: 'refundFullAmount',
		type: 'boolean',
		default: true,
		description: 'Whether to refund the whole transaction rather than a partial amount',
		displayOptions: { show: { ...show, operation: ['refund'] } },
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		required: true,
		description: 'Amount to refund in cents',
		displayOptions: { show: { ...show, operation: ['refund'], refundFullAmount: [false] } },
		routing: { send: { type: 'body', property: 'amount' } },
	},

	// ─── Send Mail Receipt ─────────────────────────────────────────────────────
	{
		displayName: 'Recipient',
		name: 'receiptRecipient',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		description: 'Email address the receipt is sent to',
		displayOptions: { show: { ...show, operation: ['sendReceipt'] } },
		routing: { send: { type: 'body', property: 'recipient' } },
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Created After',
				name: 'filterDatetimeUtcGreaterThan',
				type: 'string',
				default: '',
				placeholder: '2026-01-01 00:00:00',
				description: 'Lower UTC datetime limit, as YYYY-MM-DD HH:MM:SS',
				routing: { send: { type: 'query', property: 'filterDatetimeUtcGreaterThan' } },
			},
			{
				displayName: 'Created Before',
				name: 'filterDatetimeUtcLessThan',
				type: 'string',
				default: '',
				placeholder: '2026-12-31 23:59:59',
				description: 'Upper UTC datetime limit, as YYYY-MM-DD HH:MM:SS',
				routing: { send: { type: 'query', property: 'filterDatetimeUtcLessThan' } },
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Row count to skip',
				routing: { send: { type: 'query', property: 'offset' } },
			},
			{
				displayName: 'Only My Transactions',
				name: 'filterMyTransactionsOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to return only transactions related to this API key',
				routing: { send: { type: 'query', property: 'filterMyTransactionsOnly' } },
			},
			{
				displayName: 'Order By Time',
				name: 'orderByTime',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'ASC' },
					{ name: 'Descending', value: 'DESC' },
				],
				default: 'DESC',
				routing: { send: { type: 'query', property: 'orderByTime' } },
			},
		],
	},
];
