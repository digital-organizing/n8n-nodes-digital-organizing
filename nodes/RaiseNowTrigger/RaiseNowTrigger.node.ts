import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestMethods,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

/**
 * RaiseNow delivers events in two steps, which is why this node manages two
 * resources rather than one:
 *
 *   1. a *webhook endpoint* (`/webhooks`) — the URL registration, and
 *   2. one *event subscription* per event (`/event-subscriptions`), pointing at
 *      that endpoint via `action_configuration_uuid`.
 *
 * An endpoint on its own receives nothing. Activating this node creates both and
 * deactivating it removes what it created — an endpoint that already pointed at
 * this workflow's URL is reused and left in place.
 *
 * https://docs.raisenow.com/api
 */

type WebhookEndpoint = {
	uuid: string;
	endpoint: string;
	alias?: string;
};

type EventSubscription = {
	uuid: string;
	event_name: string;
	action_configuration_uuid: string;
};

async function raiseNowApiRequest(
	this: IHookFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<unknown> {
	const credentials = await this.getCredentials('raiseNowApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

	return await this.helpers.httpRequestWithAuthentication.call(this, 'raiseNowApi', {
		method,
		url: `${baseUrl}${path}`,
		body,
		qs,
		json: true,
	});
}

export class RaiseNowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RaiseNow Trigger',
		name: 'raiseNowTrigger',
		icon: { light: 'file:../../icons/raisenow.svg', dark: 'file:../../icons/raisenow.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when RaiseNow sends an event',
		defaults: {
			name: 'RaiseNow Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'raiseNowApi',
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
				displayName: 'Organisation UUID',
				name: 'organisationUuid',
				type: 'string',
				default: '',
				required: true,
				description: 'UUID of the organisation the webhook endpoint belongs to',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Event' },
				default: [],
				required: true,
				placeholder: 'rnw.event.payment_gateway.payment.succeeded',
				description:
					'Names of the events to subscribe to. See the event reference at https://docs.raisenow.com/events.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Account UUID',
						name: 'accountUuid',
						type: 'string',
						default: '',
						description: 'Restrict the endpoint and its subscriptions to one account',
					},
					{
						displayName: 'Alias',
						name: 'alias',
						type: 'string',
						default: '',
						description:
							'Name for the webhook endpoint in RaiseNow. Defaults to the workflow name.',
					},
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						default: '',
						placeholder: 'event.data["payment_method"] === "card"',
						description:
							'Expression evaluated by RaiseNow to decide whether an event is delivered. Applied to every subscribed event.',
					},
					{
						displayName: 'HMAC Key',
						name: 'hmacKey',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description:
							'Key RaiseNow signs the delivered events with. Stored on the endpoint; this node does not verify the signature.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			/**
			 * True only when the endpoint exists *and* every selected event is
			 * subscribed to it — otherwise create() runs and reconciles the difference.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const organisationUuid = this.getNodeParameter('organisationUuid') as string;
				const events = this.getNodeParameter('events') as string[];
				const webhookData = this.getWorkflowStaticData('node');

				const endpoints = (await raiseNowApiRequest.call(this, 'GET', '/webhooks', undefined, {
					organisation_uuid: organisationUuid,
				})) as WebhookEndpoint[];

				const existing = endpoints.find((endpoint) => endpoint.endpoint === webhookUrl);
				if (existing === undefined) return false;

				const subscriptions = (await raiseNowApiRequest.call(
					this,
					'GET',
					'/event-subscriptions',
					undefined,
					{ organisation_uuid: organisationUuid, webhook_configuration_uuid: existing.uuid },
				)) as EventSubscription[];

				const subscribed = subscriptions.filter((subscription) =>
					events.includes(subscription.event_name),
				);
				if (subscribed.length !== events.length) return false;

				webhookData.webhookUuid = existing.uuid;
				webhookData.eventSubscriptionUuids = subscribed.map((subscription) => subscription.uuid);
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const organisationUuid = this.getNodeParameter('organisationUuid') as string;
				const events = this.getNodeParameter('events') as string[];
				const options = this.getNodeParameter('options') as IDataObject;
				const webhookData = this.getWorkflowStaticData('node');

				if (events.length === 0) {
					throw new NodeOperationError(this.getNode(), 'Select at least one event to subscribe to');
				}

				const accountUuid = (options.accountUuid as string) || undefined;

				// Reuse an endpoint already pointing at this workflow, so reactivating
				// does not pile up registrations.
				const endpoints = (await raiseNowApiRequest.call(this, 'GET', '/webhooks', undefined, {
					organisation_uuid: organisationUuid,
				})) as WebhookEndpoint[];

				let endpoint = endpoints.find((candidate) => candidate.endpoint === webhookUrl);
				const reusedEndpoint = endpoint !== undefined;

				if (endpoint === undefined) {
					endpoint = (await raiseNowApiRequest.call(this, 'POST', '/webhooks', {
						organisation_uuid: organisationUuid,
						account_uuid: accountUuid,
						alias: (options.alias as string) || this.getWorkflow().name,
						endpoint: webhookUrl,
						hmac_key: (options.hmacKey as string) || undefined,
					})) as WebhookEndpoint;
				}

				const existingSubscriptions = (await raiseNowApiRequest.call(
					this,
					'GET',
					'/event-subscriptions',
					undefined,
					{ organisation_uuid: organisationUuid, webhook_configuration_uuid: endpoint.uuid },
				)) as EventSubscription[];

				const created: string[] = [];
				for (const eventName of events) {
					const already = existingSubscriptions.find(
						(subscription) => subscription.event_name === eventName,
					);
					if (already !== undefined) {
						created.push(already.uuid);
						continue;
					}

					const subscription = (await raiseNowApiRequest.call(
						this,
						'POST',
						'/event-subscriptions',
						{
							organisation_uuid: organisationUuid,
							account_uuid: accountUuid,
							action_configuration_uuid: endpoint.uuid,
							action_type: 'webhook',
							event_name: eventName,
							enabled: true,
							filter: (options.filter as string) || undefined,
						},
					)) as EventSubscription;

					created.push(subscription.uuid);
				}

				webhookData.webhookUuid = endpoint.uuid;
				webhookData.eventSubscriptionUuids = created;
				webhookData.endpointWasReused = reusedEndpoint;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriptionUuids = (webhookData.eventSubscriptionUuids as string[]) ?? [];

				for (const uuid of subscriptionUuids) {
					try {
						await raiseNowApiRequest.call(this, 'DELETE', `/event-subscriptions/${uuid}`);
					} catch (error) {
						// Most likely already gone on RaiseNow's side. Deactivation should not
						// fail over it, but a real error still needs to be visible.
						this.logger.warn(
							`RaiseNow Trigger: could not delete event subscription ${uuid}: ${(error as Error).message}`,
						);
					}
				}

				// An endpoint that existed before this node was activated stays put:
				// something else may be delivering through it.
				if (webhookData.webhookUuid !== undefined && webhookData.endpointWasReused !== true) {
					try {
						await raiseNowApiRequest.call(
							this,
							'DELETE',
							`/webhooks/${webhookData.webhookUuid as string}`,
						);
					} catch (error) {
						this.logger.warn(
							`RaiseNow Trigger: could not delete webhook endpoint ${webhookData.webhookUuid as string}: ${(error as Error).message}`,
						);
					}
				}

				delete webhookData.webhookUuid;
				delete webhookData.eventSubscriptionUuids;
				delete webhookData.endpointWasReused;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
