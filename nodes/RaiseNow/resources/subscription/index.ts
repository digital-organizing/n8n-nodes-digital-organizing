import type { INodeProperties } from 'n8n-workflow';
import { customParametersProperty, uuidProperty } from '../../shared/descriptions';

const resource = 'subscription';
const show = { resource: [resource] };

/**
 * Subscriptions — https://docs.raisenow.com/api
 *
 * A subscription charges an existing payment source on a recurring interval.
 * Create it from a payment source UUID, then activate, suspend or cancel it.
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
				name: 'Activate',
				value: 'activate',
				action: 'Activate a subscription',
				routing: {
					request: {
						method: 'POST',
						url: '=/subscriptions/{{$parameter.subscriptionUuid}}/activate',
					},
				},
			},
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a subscription',
				routing: {
					request: {
						method: 'POST',
						url: '=/subscriptions/{{$parameter.subscriptionUuid}}/cancel',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a subscription',
				routing: { request: { method: 'POST', url: '/subscriptions' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a subscription',
				routing: {
					request: { method: 'GET', url: '=/subscriptions/{{$parameter.subscriptionUuid}}' },
				},
			},
			{
				name: 'Suspend',
				value: 'suspend',
				action: 'Suspend a subscription',
				routing: {
					request: {
						method: 'POST',
						url: '=/subscriptions/{{$parameter.subscriptionUuid}}/suspend',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a subscription',
				routing: {
					request: { method: 'PATCH', url: '=/subscriptions/{{$parameter.subscriptionUuid}}' },
				},
			},
		],
		default: 'create',
	},

	uuidProperty(
		'Subscription UUID',
		'subscriptionUuid',
		resource,
		['get', 'update', 'activate', 'cancel', 'suspend'],
		'The identifier of the subscription',
	),

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Account UUID',
		name: 'accountUuid',
		type: 'string',
		default: '',
		required: true,
		description: 'UUID of the account the subscription belongs to',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'account_uuid' } },
	},
	{
		displayName: 'Supporter UUID',
		name: 'supporterUuid',
		type: 'string',
		default: '',
		required: true,
		description: 'UUID of the supporter the subscription belongs to',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'supporter_uuid' } },
	},
	{
		displayName: 'Payment Source UUID',
		name: 'paymentSourceUuid',
		type: 'string',
		default: '',
		required: true,
		description:
			'UUID of the payment source to charge. Created by a payment with Create Payment Source enabled.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'payment_source_uuid' } },
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		required: true,
		description: 'Amount to charge, in the minor units of the currency',
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
		displayName: 'Recurring Interval',
		name: 'recurringInterval',
		type: 'string',
		default: '1 * *',
		required: true,
		description:
			'Charge interval in day-of-month, month, weekday form, so "1 * *" charges on the first of every month and "15 3,6,9,12 *" quarterly on the 15th',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'recurring_interval' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			customParametersProperty(),
			{
				displayName: 'Planned Effective From',
				name: 'planned_effective_from',
				type: 'string',
				default: '',
				placeholder: '2026-01-01',
				description: 'Date the subscription becomes active, as YYYY-MM-DD',
				routing: { send: { type: 'body', property: 'planned_effective_from' } },
			},
			{
				displayName: 'Planned End',
				name: 'planned_end',
				type: 'string',
				default: '',
				placeholder: '2027-01-01',
				description: 'Date the subscription ends, as YYYY-MM-DD',
				routing: { send: { type: 'body', property: 'planned_end' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Pending', value: 'pending' },
				],
				default: 'active',
				description: 'Status the subscription starts in',
				routing: { send: { type: 'body', property: 'status' } },
			},
			{
				displayName: 'Subscription Plan UUID',
				name: 'subscription_plan_uuid',
				type: 'string',
				default: '',
				description: 'Plan to use. The account default is used when left empty.',
				routing: { send: { type: 'body', property: 'subscription_plan_uuid' } },
			},
			{
				displayName: 'Test Mode',
				name: 'test_mode',
				type: 'boolean',
				default: false,
				description:
					'Whether this is a test subscription. Must match the test mode of the payment source.',
				routing: { send: { type: 'body', property: 'test_mode' } },
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				placeholder: 'Europe/Zurich',
				description: 'Timezone used to calculate the charge dates',
				routing: { send: { type: 'body', property: 'timezone' } },
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
				type: 'number',
				default: 0,
				description: 'Amount to charge, in the minor units of the currency',
				routing: { send: { type: 'body', property: 'amount' } },
			},
			customParametersProperty(),
			{
				displayName: 'Payment Source UUID',
				name: 'payment_source_uuid',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'payment_source_uuid' } },
			},
			{
				displayName: 'Planned Effective From',
				name: 'planned_effective_from',
				type: 'string',
				default: '',
				placeholder: '2026-01-01',
				description: 'Date the subscription becomes active, as YYYY-MM-DD',
				routing: { send: { type: 'body', property: 'planned_effective_from' } },
			},
			{
				displayName: 'Planned End',
				name: 'planned_end',
				type: 'string',
				default: '',
				placeholder: '2027-01-01',
				description: 'Date the subscription ends, as YYYY-MM-DD',
				routing: { send: { type: 'body', property: 'planned_end' } },
			},
			{
				displayName: 'Recurring Interval',
				name: 'recurring_interval',
				type: 'string',
				default: '',
				placeholder: '1 * *',
				description: 'Charge interval in day-of-month, month, weekday form',
				routing: { send: { type: 'body', property: 'recurring_interval' } },
			},
			{
				displayName: 'Subscription Plan UUID',
				name: 'subscription_plan_uuid',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'subscription_plan_uuid' } },
			},
			{
				displayName: 'Supporter UUID',
				name: 'supporter_uuid',
				type: 'string',
				default: '',
				description: 'Can only be set if the subscription has no supporter yet',
				routing: { send: { type: 'body', property: 'supporter_uuid' } },
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				placeholder: 'Europe/Zurich',
				routing: { send: { type: 'body', property: 'timezone' } },
			},
		],
	},

	// ─── Suspend ───────────────────────────────────────────────────────────────
	{
		displayName: 'Suspension',
		name: 'suspension',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Leave empty to suspend indefinitely, starting now',
		displayOptions: { show: { ...show, operation: ['suspend'] } },
		options: [
			{
				displayName: 'Suspension End',
				name: 'suspension_end',
				type: 'string',
				default: '',
				placeholder: '2027-01-01',
				description:
					'End date as YYYY-MM-DD. Without it the subscription stays suspended indefinitely.',
				routing: { send: { type: 'body', property: 'suspension_end' } },
			},
			{
				displayName: 'Suspension Start',
				name: 'suspension_start',
				type: 'string',
				default: '',
				placeholder: '2026-10-01',
				description:
					'Start date as YYYY-MM-DD, today or later. Cannot be set when modifying an existing suspension.',
				routing: { send: { type: 'body', property: 'suspension_start' } },
			},
		],
	},
];
