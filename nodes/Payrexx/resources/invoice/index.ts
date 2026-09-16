import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { idProperty } from '../../shared/descriptions';

const resource = 'invoice';
const show = { resource: [resource] };

/**
 * Invoices — https://developers.payrexx.com/reference/create-an-invoice
 *
 * These live under `/Bill/`; `/Invoice/` is the paylink resource. Amounts are in
 * the smallest unit of the currency.
 *
 * The create payload is large and deeply nested. The fields a workflow reaches
 * for are modelled here; the rest — discounts, cash discounts, reminders, bank
 * information, attachments — go through Additional Fields as raw JSON rather
 * than turning the node into a form with fifty inputs.
 */

const recipientOptions: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'recipient.address' } },
	},
	{
		displayName: 'City',
		name: 'city',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'recipient.city' } },
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description: 'At least one of company, first name or last name is required',
		routing: { send: { type: 'body', property: 'recipient.company' } },
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		placeholder: 'CH',
		description: 'Country in ISO-3166 alpha-2, two uppercase letters',
		routing: { send: { type: 'body', property: 'recipient.country' } },
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		description: 'At least one of company, first name or last name is required',
		routing: { send: { type: 'body', property: 'recipient.firstName' } },
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		description: 'At least one of company, first name or last name is required',
		routing: { send: { type: 'body', property: 'recipient.lastName' } },
	},
	{
		displayName: 'ZIP',
		name: 'zip',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'recipient.zip' } },
	},
];

const invoiceOptions: INodeProperties[] = [
	{
		displayName: 'Additional Recipients',
		name: 'additionalRecipients',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Email' },
		default: [],
		description: 'Further email addresses the invoice is sent to',
		routing: { send: { type: 'body', property: 'additionalRecipients' } },
	},
	{
		displayName: 'Application Fee',
		name: 'applicationFee',
		type: 'number',
		default: 0,
		description: 'Amount in the smallest unit of the currency',
		routing: { send: { type: 'body', property: 'applicationFee' } },
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'string',
		default: '',
		placeholder: '2026-09-16',
		description: 'Invoice date',
		routing: { send: { type: 'body', property: 'date' } },
	},
	{
		displayName: 'Design',
		name: 'design',
		type: 'string',
		default: '',
		description: 'ID of the invoice design to use',
		routing: { send: { type: 'body', property: 'design' } },
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'note' } },
	},
	{
		displayName: 'Payment Means',
		name: 'pm',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Payment Mean' },
		default: [],
		description: 'Payment mean names to offer',
		routing: { send: { type: 'body', property: 'pm' } },
	},
	{
		displayName: 'Payout Descriptor',
		name: 'payoutDescriptor',
		type: 'string',
		default: '',
		description: 'Added to the payout statement, for Payrexx Swiss Collecting payments',
		routing: { send: { type: 'body', property: 'payoutDescriptor' } },
	},
	{
		displayName: 'PSP',
		name: 'psp',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add PSP' },
		default: [],
		description: 'IDs of the payment service providers to offer',
		routing: { send: { type: 'body', property: 'psp' } },
	},
	{
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		default: '',
		description: 'Your own reference for this invoice',
		routing: { send: { type: 'body', property: 'reference' } },
	},
	{
		displayName: 'Send',
		name: 'send',
		type: 'boolean',
		default: false,
		description: 'Whether to send the invoice to the recipient',
		routing: { send: { type: 'body', property: 'send' } },
	},
	{
		displayName: 'Service Period From',
		name: 'servicePeriodFrom',
		type: 'string',
		default: '',
		placeholder: '2026-01-01',
		routing: { send: { type: 'body', property: 'servicePeriod.from' } },
	},
	{
		displayName: 'Service Period To',
		name: 'servicePeriodTo',
		type: 'string',
		default: '',
		placeholder: '2026-12-31',
		routing: { send: { type: 'body', property: 'servicePeriod.to' } },
	},
	{
		displayName: 'Shipping Cost',
		name: 'shippingCost',
		type: 'number',
		default: 0,
		description: 'Amount in the smallest unit of the currency',
		routing: { send: { type: 'body', property: 'shippingCost' } },
	},
	{
		displayName: 'Terms',
		name: 'terms',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'terms' } },
	},
];

function positionsProperty(operations: string[]): INodeProperties {
	return {
		displayName: 'Positions',
		name: 'positions',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Position',
		default: {},
		description: 'The invoice line items. Leaving this empty omits it from the request.',
		displayOptions: { show: { ...show, operation: operations } },
		options: [
			{
				displayName: 'Position',
				name: 'position',
				values: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Number',
						name: 'number',
						type: 'number',
						default: 1,
						description: 'Quantity',
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'number',
						default: 0,
						required: true,
						description: 'Amount in the smallest unit of the currency',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						required: true,
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Day', value: 'day' },
							{ name: 'Flat', value: 'flat' },
							{ name: 'Hour', value: 'hour' },
							{ name: 'Piece', value: 'piece' },
						],
						default: 'piece',
						required: true,
					},
					{
						displayName: 'VAT',
						name: 'vat',
						type: 'number',
						default: 0,
						description: 'VAT in percent',
					},
				],
			},
		],
		routing: {
			send: { type: 'body', property: 'positions', value: '={{ $value.position }}' },
		},
	};
}

export const invoiceDescription: INodeProperties[] = [
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
				action: 'Create an invoice',
				routing: {
					request: { method: 'POST', url: '/Bill/' },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an invoice',
				routing: { request: { method: 'DELETE', url: '=/Bill/{{$parameter.invoiceId}}/' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an invoice',
				routing: { request: { method: 'GET', url: '=/Bill/{{$parameter.invoiceId}}/' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many invoices',
				routing: { request: { method: 'GET', url: '/Bill/' } },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an invoice',
				routing: {
					request: { method: 'PATCH', url: '=/Bill/{{$parameter.invoiceId}}/' },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'create',
	},

	idProperty(
		'Invoice ID',
		'invoiceId',
		resource,
		['get', 'update', 'delete'],
		'The ID of the invoice',
		'string',
	),

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Recipient Email',
		name: 'recipientEmail',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'recipient.email' } },
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		default: 'de',
		required: true,
		description: 'Language ISO code by ISO 639-1',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'language' } },
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
		displayName: 'Due After Days',
		name: 'dueAfterDays',
		type: 'number',
		default: 30,
		required: true,
		description: 'Days until the invoice is due',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'dueAfterDays' } },
	},
	{
		displayName: 'Recipient',
		name: 'recipient',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'At least one of company, first name or last name is required by Payrexx',
		displayOptions: { show: { ...show, operation: ['create', 'update'] } },
		options: recipientOptions,
	},
	positionsProperty(['create', 'update']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: invoiceOptions,
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
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				placeholder: 'CHF',
				description: 'Currency in ISO-4217 format, three capital letters',
				routing: { send: { type: 'body', property: 'currency' } },
			},
			{
				displayName: 'Due After Days',
				name: 'dueAfterDays',
				type: 'number',
				default: 30,
				description: 'Days until the invoice is due',
				routing: { send: { type: 'body', property: 'dueAfterDays' } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'de',
				description: 'Language ISO code by ISO 639-1',
				routing: { send: { type: 'body', property: 'language' } },
			},
			{
				displayName: 'Recipient Email',
				name: 'recipientEmail',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				routing: { send: { type: 'body', property: 'recipient.email' } },
			},
			...invoiceOptions,
		],
	},
	// ─── Create and Update ─────────────────────────────────────────────────────
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'json',
		default: '{}',
		description:
			'Extra keys merged into the request body, for the parts of the invoice payload this node does not model — discount, cashDiscounts, reminders, bankInformation, attachments',
		displayOptions: { show: { ...show, operation: ['create', 'update'] } },
	},
];
