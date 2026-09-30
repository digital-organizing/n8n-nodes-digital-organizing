import { createHmac, timingSafeEqual } from 'node:crypto';

import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { eventOptions } from '../Wissensmanagement/shared/descriptions';
import { toNodeApiError, wmPaginate, wmRequest } from '../Wissensmanagement/shared/request';

/**
 * Wissensmanagement signs every delivery and only delivers to subscriptions it
 * has verified, so activating this node takes three steps:
 *
 *   1. `POST /webhooks/` creates a disabled subscription and returns its secret —
 *      the only time the API ever shows it, so it lives in the node's static data;
 *   2. `POST /webhooks/{id}/test/` queues a signed `webhook.test` event;
 *   3. within ~15 s the dispatcher delivers it, webhook() answers 200, and the
 *      API marks the subscription verified and enabled.
 *
 * A subscription whose secret we do not hold can't be verified by us, so one
 * already pointing at this URL is replaced rather than reused.
 */

/** Deliveries more than five minutes off are rejected, as the API docs advise. */
const TOLERANCE_SECONDS = 300;

interface Subscription extends IDataObject {
	id: string;
	url: string;
	events: string[];
	enabled: boolean;
	verified_at: string | null;
}

/** Checks `Webhook-Signature: v1=<hex> [v1=<hex>]` against `<timestamp>.<raw body>`. */
function signatureValid(secret: string, timestamp: string, body: Buffer, header: string): boolean {
	const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest();

	// During a secret rotation the header carries one signature per secret.
	return header.split(' ').some((part) => {
		if (!part.startsWith('v1=')) return false;
		const given = Buffer.from(part.slice(3), 'hex');
		return given.length === expected.length && timingSafeEqual(given, expected);
	});
}

function header(headers: IDataObject, name: string): string {
	const value = headers[name];
	return typeof value === 'string' ? value : '';
}

export class WissensmanagementTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wissensmanagement Trigger',
		name: 'wissensmanagementTrigger',
		icon: {
			light: 'file:../../icons/wissensmanagement.svg',
			dark: 'file:../../icons/wissensmanagement.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when documents or jobs change in Wissensmanagement',
		defaults: {
			name: 'Wissensmanagement Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'wissensmanagementApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Wissensmanagement only delivers to public HTTPS URLs on port 443, and verifies the subscription about 15 seconds after activation',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: eventOptions,
				default: [],
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Fetch Resource',
						name: 'fetchResource',
						type: 'boolean',
						default: false,
						description:
							'Whether to fetch the job or document the event is about and add it as `resource`. Events carry only IDs — a succeeded job fetched this way includes its answer or sources.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			/** Reuse only a verified, enabled subscription whose secret and events match. */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined || webhookData.secret === undefined) return false;

				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = [...(this.getNodeParameter('events') as string[])].sort();
				const subscriptions = (await wmPaginate(this, '/webhooks/')) as Subscription[];

				const existing = subscriptions.find(
					(subscription) =>
						subscription.id === webhookData.webhookId && subscription.url === webhookUrl,
				);
				return (
					existing !== undefined &&
					existing.enabled === true &&
					typeof existing.verified_at === 'string' &&
					existing.verified_at !== '' &&
					JSON.stringify([...existing.events].sort()) === JSON.stringify(events)
				);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const webhookData = this.getWorkflowStaticData('node');

				if (events.length === 0) {
					throw new NodeOperationError(this.getNode(), 'Select at least one event to subscribe to');
				}

				// A leftover subscription on this URL would deliver events signed with a
				// secret we no longer have. The API caps subscriptions at 20 per owner.
				const subscriptions = (await wmPaginate(this, '/webhooks/')) as Subscription[];
				for (const stale of subscriptions.filter(
					(subscription) => subscription.url === webhookUrl,
				)) {
					await wmRequest(this, 'DELETE', `/webhooks/${stale.id}/`);
				}

				try {
					const created = (await wmRequest(this, 'POST', '/webhooks/', {
						body: { url: webhookUrl, events },
					})) as Subscription & { secret: string };

					webhookData.webhookId = created.id;
					webhookData.secret = created.secret;

					await wmRequest(this, 'POST', `/webhooks/${created.id}/test/`);
				} catch (error) {
					throw toNodeApiError(this, error, 0);
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await wmRequest(this, 'DELETE', `/webhooks/${webhookData.webhookId as string}/`);
					} catch (error) {
						// Most likely deleted in the app already. Deactivation should not fail
						// over it, but a real error still needs to be visible.
						this.logger.warn(
							`Wissensmanagement Trigger: could not delete webhook ${webhookData.webhookId as string}: ${(error as Error).message}`,
						);
					}
				}

				delete webhookData.webhookId;
				delete webhookData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const headers = this.getHeaderData() as IDataObject;
		const secret = this.getWorkflowStaticData('node').secret as string | undefined;

		const reject = (reason: string): IWebhookResponseData => {
			res.status(401).send(reason).end();
			return { noWebhookResponse: true };
		};

		const timestamp = header(headers, 'webhook-timestamp');
		const signature = header(headers, 'webhook-signature');
		const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

		if (secret === undefined) return reject('No signing secret; reactivate the workflow');
		if (rawBody === undefined || timestamp === '' || signature === '') {
			return reject('Missing signature');
		}
		if (
			!/^\d+$/.test(timestamp) ||
			Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS
		) {
			return reject('Timestamp outside tolerance');
		}
		if (!signatureValid(secret, timestamp, rawBody, signature)) {
			return reject('Invalid signature');
		}

		const event = this.getBodyData();
		if (event.id !== header(headers, 'webhook-id')) return reject('Event ID mismatch');

		// The verification handshake: answering 2xx is all it takes.
		if (event.type === 'webhook.test') {
			res.status(200).send('ok').end();
			return { noWebhookResponse: true };
		}

		const fetchResource = this.getNodeParameter('options.fetchResource', false) as boolean;
		const data = event.data as IDataObject | undefined;
		if (fetchResource && typeof data?.url === 'string') {
			event.resource = (await wmRequest(this, 'GET', data.url)) as IDataObject;
		}

		return {
			workflowData: [this.helpers.returnJsonArray(event)],
		};
	}
}
