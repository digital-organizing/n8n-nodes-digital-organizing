import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { listOutput, offsetListProperties } from '../../../shared/pagination';

const resource = 'contact';
const show = { resource: [resource] };

/**
 * Contacts — GET/PATCH/DELETE under /api/flyertool/contacts.
 *
 * There is no create operation: contacts come from the public signup form. They
 * are addressed by UUID, the same identifier the webhook, the export and the
 * success redirect use.
 *
 * Updates are partial — only the fields you add are sent, and only those change.
 */
export const contactDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a contact',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/flyertool/contacts/{{$parameter.contactUuid}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a contact',
				routing: {
					request: { method: 'GET', url: '=/api/flyertool/contacts/{{$parameter.contactUuid}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				routing: {
					request: { method: 'GET', url: '/api/flyertool/contacts' },
					...listOutput('items'),
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a contact',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/flyertool/contacts/{{$parameter.contactUuid}}',
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'getAll',
	},

	{
		displayName: 'Contact UUID',
		name: 'contactUuid',
		type: 'string',
		default: '',
		required: true,
		description: 'The UUID of the contact',
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
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
				displayName: 'Address ID',
				name: 'address_id',
				type: 'number',
				default: 0,
				description: 'EGID of the building. An unknown EGID answers 422.',
				routing: { send: { type: 'body', property: 'address_id' } },
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'comment' } },
			},
			{
				displayName: 'Delivery Address ID',
				name: 'delivery_address_id',
				type: 'number',
				default: 0,
				description:
					'EGID of the building the flyers go to. Send null through Additional Fields to reset it to the contact address.',
				routing: { send: { type: 'body', property: 'delivery_address_id' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'first_name' } },
			},
			{
				displayName: 'Form Fields',
				name: 'fields',
				type: 'json',
				default: '{}',
				description: 'The form field values stored on the contact. Replaces the whole object.',
				routing: {
					send: {
						type: 'body',
						property: 'fields',
						value: '={{ JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'de',
				routing: { send: { type: 'body', property: 'language' } },
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'last_name' } },
			},
			{
				displayName: 'Order Size',
				name: 'order',
				type: 'number',
				default: 250,
				description: 'Number of flyers ordered',
				routing: { send: { type: 'body', property: 'order' } },
			},
			{
				displayName: 'UTM Parameters',
				name: 'utm',
				type: 'json',
				default: '{}',
				description: 'UTM parameters of the signup. Replaces the whole object.',
				routing: {
					send: {
						type: 'body',
						property: 'utm',
						value: '={{ JSON.parse($value || "{}") }}',
					},
				},
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'json',
		default: '{}',
		description:
			'Extra keys merged into the request body. The way to send an explicit null, e.g. {"delivery_address_id": null} to reset the delivery address to the contact address.',
		displayOptions: { show: { ...show, operation: ['update'] } },
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	...offsetListProperties(resource, 'items'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Assigned',
				name: 'assigned',
				type: 'boolean',
				default: true,
				description: 'Whether to return only contacts that have assignments, or only those without',
				routing: { send: { type: 'query', property: 'assigned' } },
			},
			{
				displayName: 'Campaign ID',
				name: 'campaign_id',
				type: 'number',
				default: 0,
				routing: { send: { type: 'query', property: 'campaign_id' } },
			},
			{
				displayName: 'Campaign Slug',
				name: 'campaign_slug',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'campaign_slug' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Exact match, case insensitive',
				routing: { send: { type: 'query', property: 'email' } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'de',
				routing: { send: { type: 'query', property: 'language' } },
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Substring match on first name, last name and email',
				routing: { send: { type: 'query', property: 'search' } },
			},
			{
				displayName: 'UTM Source',
				name: 'utm_source',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'utm_source' } },
			},
		],
	},
];
