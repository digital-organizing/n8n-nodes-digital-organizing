import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

/**
 * Payrexx has no API for managing webhooks — they are configured by hand in the
 * Payrexx admin under Settings → Integrations → Webhooks. So unlike the RaiseNow
 * trigger this node registers nothing: it exposes a URL and you paste it there.
 *
 * Because of that, n8n cannot tell Payrexx which events to send. The filters
 * below run on this side, after delivery.
 */
// Payrexx exposes no endpoint for creating, listing or deleting webhooks, so the
// lifecycle this rule asks for cannot be implemented — the URL is registered by
// hand in the Payrexx admin.
// eslint-disable-next-line @n8n/community-nodes/webhook-lifecycle-complete
export class PayrexxTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Payrexx Trigger',
		name: 'payrexxTrigger',
		icon: { light: 'file:../../icons/payrexx.svg', dark: 'file:../../icons/payrexx.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{ $parameter["statuses"].length ? $parameter["statuses"].join(", ") : "all deliveries" }}',
		description: 'Starts the workflow when Payrexx posts a webhook',
		defaults: {
			name: 'Payrexx Trigger',
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
					'Payrexx has no webhook API, so copy the Production URL above into your Payrexx admin under Settings → Integrations → Webhooks.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Transaction Statuses',
				name: 'statuses',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Status' },
				default: [],
				placeholder: 'confirmed',
				description:
					'Only continue for these transaction statuses. Leave empty to accept every delivery. Matched against transaction.status in the payload.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Output Transaction Only',
						name: 'transactionOnly',
						type: 'boolean',
						default: false,
						description:
							'Whether to output the transaction object instead of the full webhook envelope',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const statuses = this.getNodeParameter('statuses', []) as string[];
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const transaction = (body.transaction ?? {}) as IDataObject;

		if (statuses.length > 0) {
			const status = transaction.status as string | undefined;
			if (status === undefined || !statuses.includes(status)) {
				// Acknowledge the delivery but do not start the workflow.
				return { noWebhookResponse: false, workflowData: undefined };
			}
		}

		const output = options.transactionOnly === true ? transaction : body;

		return {
			workflowData: [this.helpers.returnJsonArray(output)],
		};
	}
}
