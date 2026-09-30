import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { eventOptions, listProperties, readLimit } from '../shared/descriptions';
import { forEachItem, wmPaginate, wmRequest } from '../shared/request';

const resource = ['webhook'];
const show = (...operation: string[]) => ({ resource, operation });

/**
 * Subscriptions for systems other than n8n — the Wissensmanagement Trigger
 * manages its own. A new subscription starts disabled: Send Test delivers a
 * signed test event, and a 2xx answer verifies and enables it.
 */
export const webhookDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a webhook subscription',
				description: 'The response holds the signing secret, which is never shown again',
			},
			{ name: 'Delete', value: 'delete', action: 'Delete a webhook subscription' },
			{ name: 'Get', value: 'get', action: 'Get a webhook subscription' },
			{
				name: 'Get Deliveries',
				value: 'getDeliveries',
				action: 'Get the deliveries of a webhook subscription',
			},
			{ name: 'Get Many', value: 'getAll', action: 'Get many webhook subscriptions' },
			{
				name: 'Retry Delivery',
				value: 'retryDelivery',
				action: 'Retry a webhook delivery',
				description: 'Send a delivery again after its attempts ran out',
			},
			{
				name: 'Rotate Secret',
				value: 'rotateSecret',
				action: 'Rotate the secret of a webhook subscription',
				description: 'The old secret keeps signing alongside the new one for 24 hours',
			},
			{
				name: 'Send Test',
				value: 'sendTest',
				action: 'Send a test event to a webhook subscription',
				description: 'A 2xx answer verifies and enables the subscription',
			},
			{ name: 'Update', value: 'update', action: 'Update a webhook subscription' },
		],
		default: 'getAll',
	},
	{
		displayName: 'Webhook ID',
		name: 'webhookId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: show(
				'delete',
				'get',
				'getDeliveries',
				'retryDelivery',
				'rotateSecret',
				'sendTest',
				'update',
			),
		},
	},
	{
		displayName: 'Delivery ID',
		name: 'deliveryId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: show('retryDelivery') },
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.ch/hooks/wissen',
		description: 'Public HTTPS URL on port 443',
		displayOptions: { show: show('create') },
	},
	{
		displayName: 'Events',
		name: 'events',
		type: 'multiOptions',
		options: eventOptions,
		default: [],
		required: true,
		displayOptions: { show: show('create') },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show('update') },
		options: [
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
				description: 'Whether to deliver events. Enabling needs a verified subscription.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: eventOptions,
				default: [],
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'Changing it disables the subscription until it is verified again',
			},
		],
	},
	...listProperties(show('getAll', 'getDeliveries')),
];

export async function runWebhook(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		const operation = ctx.getNodeParameter('operation', i) as string;

		if (operation === 'create') {
			const body = {
				url: ctx.getNodeParameter('url', i) as string,
				events: ctx.getNodeParameter('events', i) as string[],
			};
			return (await wmRequest(ctx, 'POST', '/webhooks/', { body })) as IDataObject;
		}
		if (operation === 'getAll') {
			return await wmPaginate(ctx, '/webhooks/', {}, readLimit(ctx, i));
		}

		const id = (ctx.getNodeParameter('webhookId', i) as string).trim();
		const path = `/webhooks/${id}/`;

		switch (operation) {
			case 'get':
				return (await wmRequest(ctx, 'GET', path)) as IDataObject;
			case 'update': {
				const body = ctx.getNodeParameter('updateFields', i, {}) as IDataObject;
				return (await wmRequest(ctx, 'PATCH', path, { body })) as IDataObject;
			}
			case 'delete':
				await wmRequest(ctx, 'DELETE', path);
				return { deleted: true, id };
			case 'getDeliveries':
				return await wmPaginate(ctx, `${path}deliveries/`, {}, readLimit(ctx, i));
			case 'retryDelivery': {
				const deliveryId = (ctx.getNodeParameter('deliveryId', i) as string).trim();
				return (await wmRequest(
					ctx,
					'POST',
					`${path}deliveries/${deliveryId}/retry/`,
				)) as IDataObject;
			}
			case 'rotateSecret':
				return (await wmRequest(ctx, 'POST', `${path}rotate-secret/`)) as IDataObject;
			default:
				// sendTest
				return (await wmRequest(ctx, 'POST', `${path}test/`)) as IDataObject;
		}
	});
}
