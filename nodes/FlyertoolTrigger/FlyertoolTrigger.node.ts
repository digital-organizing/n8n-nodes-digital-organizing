import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

/**
 * Flyertool notifies a single URL per campaign when someone signs up: the
 * campaign's "Webhook URL" field in the Django admin. There is no API for
 * managing it, so this trigger registers nothing — it exposes a URL you paste
 * into that field.
 *
 * One event only, a completed signup, fired from both the standalone and the
 * embedded form. The payload is flat:
 *
 *   uuid, first_name, last_name, email, order, campaign (the name, not the
 *   slug), address_id (EGID), strasse, nr, plz, ortschaft, gemeinde, kanton,
 *   bfs_nr, fields, utm
 *
 * It carries no delivery address and no assignments. Follow this node with
 * Flyertool → Contact → Get on the uuid when you need the full record.
 */
// Flyertool exposes no endpoint for managing campaign webhooks — the URL is set
// by hand in the admin — so the lifecycle this rule asks for cannot exist.
// eslint-disable-next-line @n8n/community-nodes/webhook-lifecycle-complete
export class FlyertoolTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Flyertool Trigger',
		name: 'flyertoolTrigger',
		icon: { light: 'file:../../icons/flyertool.svg', dark: 'file:../../icons/flyertool.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{ $parameter["campaigns"].length ? $parameter["campaigns"].join(", ") : "all campaigns" }}',
		description: 'Starts the workflow when someone signs up through a Flyertool campaign',
		defaults: {
			name: 'Flyertool Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
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
					'Flyertool has no webhook API, so copy the Production URL above into the campaign\'s "Webhook URL" field in the Flyertool admin. The URL is the only thing protecting this endpoint — Flyertool sends no secret or signature.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Campaigns',
				name: 'campaigns',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Campaign' },
				default: [],
				placeholder: 'Flyeraktion Frühling',
				description:
					'Only continue for these campaign names, matched against the campaign field of the payload. Leave empty to accept every signup — which is usually right, since each campaign has its own webhook URL.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const campaigns = this.getNodeParameter('campaigns', []) as string[];

		if (campaigns.length > 0) {
			const campaign = (body as IDataObject).campaign as string | undefined;
			if (campaign === undefined || !campaigns.includes(campaign)) {
				// Acknowledge the signup but do not start the workflow. Flyertool
				// ignores delivery failures and never retries, so answering with an
				// error here would only lose the notification.
				return { noWebhookResponse: false, workflowData: undefined };
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
