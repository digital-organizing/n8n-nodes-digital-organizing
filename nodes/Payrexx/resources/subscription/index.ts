import type { INodeProperties } from 'n8n-workflow';
import { idProperty } from '../../shared/descriptions';

const resource = 'subscription';
const show = { resource: [resource] };

/**
 * Subscriptions — https://developers.payrexx.com/reference/create-a-new-subscription
 *
 * Intervals and periods are PHP `DateInterval` strings, e.g. `P1M` for monthly
 * and `P1Y` for a one-year term.
 */
export const subscriptionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a subscription',
				routing: { request: { method: 'POST', url: '/Subscription/' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a subscription',
				routing: {
					request: { method: 'GET', url: '=/Subscription/{{$parameter.subscriptionId}}/' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many subscriptions',
				routing: { request: { method: 'GET', url: '/Subscription/' } },
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove a subscription',
				routing: {
					request: { method: 'DELETE', url: '=/Subscription/{{$parameter.subscriptionId}}/' },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a subscription',
				routing: {
					request: { method: 'PUT', url: '=/Subscription/{{$parameter.subscriptionId}}/' },
				},
			},
		],
		default: 'create',
	},

	idProperty(
		'Subscription ID',
		'subscriptionId',
		resource,
		['get', 'update', 'remove'],
		'The ID of the subscription',
	),

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		description: 'The contact ID, as delivered by the webhook',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'userId' } },
	},
	{
		displayName: 'PSP',
		name: 'psp',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the payment service provider to charge through',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'psp' } },
	},
	{
		displayName: 'Amount',
		name: 'subscriptionAmount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '1000',
		description: 'Amount to charge in cents',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'amount' } },
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: 'CHF',
		required: true,
		description: 'Currency in ISO-4217 format, three capital letters',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'currency' } },
	},
	{
		displayName: 'Purpose',
		name: 'purpose',
		type: 'string',
		default: '',
		required: true,
		description: 'What the payer is paying for',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'purpose' } },
	},
	{
		displayName: 'Payment Interval',
		name: 'paymentInterval',
		type: 'string',
		default: 'P1M',
		required: true,
		description: 'How often to charge, as a PHP date interval, so P1M is monthly',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'paymentInterval' } },
	},
	{
		displayName: 'Period',
		name: 'period',
		type: 'string',
		default: 'P1Y',
		required: true,
		description: 'How long the subscription runs, as a PHP date interval',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'period' } },
	},
	{
		displayName: 'Cancellation Interval',
		name: 'cancellationInterval',
		type: 'string',
		default: 'P1M',
		required: true,
		description: 'Notice period before the end of a term, as a PHP date interval',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'cancellationInterval' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Reference ID',
				name: 'referenceId',
				type: 'string',
				default: '',
				description: 'Your own reference, sent back with the webhook',
				routing: { send: { type: 'body', property: 'referenceId' } },
			},
			{
				displayName: 'VAT Rate',
				name: 'vatRate',
				type: 'string',
				default: '',
				description: 'VAT rate in percent',
				routing: { send: { type: 'body', property: 'vatRate' } },
			},
		],
	},

	// ─── Update ────────────────────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
				description: 'New amount in cents, charged from the next interval on',
				routing: { send: { type: 'body', property: 'amount' } },
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'CHF',
				description: 'Currency in ISO-4217 format, three capital letters',
				routing: { send: { type: 'body', property: 'currency' } },
			},
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'string',
				default: '',
				description: 'What the payer is paying for',
				routing: { send: { type: 'body', property: 'purpose' } },
			},
			{
				displayName: 'VAT Rate',
				name: 'vatRate',
				type: 'string',
				default: '',
				description: 'VAT rate in percent',
				routing: { send: { type: 'body', property: 'vatRate' } },
			},
		],
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	{
		displayName: 'Limit',
		name: 'subscriptionLimit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Options',
		name: 'listOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Row count to skip',
				routing: { send: { type: 'query', property: 'offset' } },
			},
			{
				displayName: 'Order By Start Date',
				name: 'orderByStartDate',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'ASC' },
					{ name: 'Descending', value: 'DESC' },
				],
				default: 'DESC',
				routing: { send: { type: 'query', property: 'orderByStartDate' } },
			},
		],
	},
];
