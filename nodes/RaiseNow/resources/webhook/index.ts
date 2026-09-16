import type { INodeProperties } from 'n8n-workflow';
import { uuidProperty } from '../../shared/descriptions';

const resource = 'webhook';
const show = { resource: [resource] };

/**
 * Webhook endpoints — https://docs.raisenow.com/api
 *
 * A webhook endpoint is only the URL registration. Events reach it once an event
 * subscription points at it, which is what the RaiseNow Trigger node sets up. Use
 * this resource to inspect or manage registrations by hand.
 */
export const webhookDescription: INodeProperties[] = [
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
				action: 'Create a webhook endpoint',
				routing: { request: { method: 'POST', url: '/webhooks' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a webhook endpoint',
				routing: {
					request: { method: 'DELETE', url: '=/webhooks/{{$parameter.webhookUuid}}' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a webhook endpoint',
				routing: {
					request: { method: 'GET', url: '=/webhooks/{{$parameter.webhookUuid}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many webhook endpoints',
				routing: { request: { method: 'GET', url: '/webhooks' } },
			},
		],
		default: 'getAll',
	},

	uuidProperty(
		'Webhook UUID',
		'webhookUuid',
		resource,
		['get', 'delete'],
		'The identifier of the webhook endpoint',
	),

	// ─── Get Many ──────────────────────────────────────────────────────────────
	{
		displayName: 'Organisation UUID',
		name: 'organisationUuid',
		type: 'string',
		default: '',
		required: true,
		description: 'UUID of the organisation whose endpoints to list',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'organisation_uuid' } },
	},
	{
		displayName: 'Account UUID',
		name: 'accountUuidFilter',
		type: 'string',
		default: '',
		description: 'Return only endpoints of this account',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'account_uuid' } },
	},

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Endpoint URL',
		name: 'endpoint',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/raisenow',
		description: 'URL that receives the events. Must start with https://.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'endpoint' } },
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
				displayName: 'Account UUID',
				name: 'account_uuid',
				type: 'string',
				default: '',
				description: 'Account the endpoint belongs to',
				routing: { send: { type: 'body', property: 'account_uuid' } },
			},
			{
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				default: '',
				description: 'Name for the endpoint',
				routing: { send: { type: 'body', property: 'alias' } },
			},
			{
				displayName: 'HMAC Key',
				name: 'hmac_key',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Key RaiseNow uses to sign the delivered events',
				routing: { send: { type: 'body', property: 'hmac_key' } },
			},
			{
				displayName: 'Organisation UUID',
				name: 'organisation_uuid',
				type: 'string',
				default: '',
				description: 'Organisation the endpoint belongs to',
				routing: { send: { type: 'body', property: 'organisation_uuid' } },
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Basic auth password sent to the endpoint',
				routing: { send: { type: 'body', property: 'password' } },
			},
			{
				displayName: 'Prevent Duplicates',
				name: 'prevent_duplicates',
				type: 'boolean',
				default: true,
				description: 'Whether to reject the call if an endpoint with the same URL already exists',
				routing: { send: { type: 'query', property: 'prevent_duplicates' } },
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Basic auth username sent to the endpoint',
				routing: { send: { type: 'body', property: 'username' } },
			},
		],
	},
];
