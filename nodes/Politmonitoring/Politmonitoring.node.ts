import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { affairDescription, runAffair } from './resources/affair';
import { topicDescription, runTopic } from './resources/topic';
import { documentDescription, runDocument } from './resources/document';
import { searchDescription, runSearch } from './resources/search';
import { reviewDescription, runReview } from './resources/review';
import { trackingDescription, runTracking } from './resources/tracking';
import { webhookDescription, runWebhook } from './resources/webhook';
import { operation, textField } from './shared/descriptions';
import { forEachItem, pmRequest } from './shared/request';
const runners: Record<string, (ctx: IExecuteFunctions) => Promise<INodeExecutionData[]>> = {
	affair: runAffair,
	topic: runTopic,
	document: runDocument,
	search: runSearch,
	review: runReview,
	tracking: runTracking,
	webhook: runWebhook,
};
export class Politmonitoring implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Politmonitoring',
		name: 'politmonitoring',
		icon: {
			light: 'file:../../icons/politmonitoring.svg',
			dark: 'file:../../icons/politmonitoring.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Retrieve Geschäfte, manage Themen and documents, and search organisational knowledge',
		defaults: { name: 'Politmonitoring' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'politmonitoringApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Document', value: 'document' },
					{ name: 'Geschäft', value: 'affair' },
					{ name: 'Job', value: 'job' },
					{ name: 'Review', value: 'review' },
					{ name: 'Search', value: 'search' },
					{ name: 'Thema', value: 'topic' },
					{ name: 'Tracking', value: 'tracking' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'affair',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{ name: 'English', value: 'en' },
					{ name: 'French', value: 'fr' },
					{ name: 'German', value: 'de' },
				],
				default: 'de',
				displayOptions: {
					show: { resource: ['affair', 'topic', 'document', 'review', 'tracking'] },
				},
			},
			...affairDescription,
			...topicDescription,
			...documentDescription,
			...searchDescription,
			...reviewDescription,
			...trackingDescription,
			...webhookDescription,
			operation('account', [['Get', 'get', 'Get the authenticated account']]),
			operation('job', [['Get', 'get', 'Get a job status and result']]),
			textField('Job ID', 'jobId', { resource: ['job'], operation: ['get'] }),
		],
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		if (resource === 'account' || resource === 'job')
			return [
				await forEachItem(
					this,
					async (i) =>
						(await pmRequest(
							this,
							'GET',
							resource === 'account'
								? '/me/'
								: `/jobs/${encodeURIComponent(this.getNodeParameter('jobId', i) as string)}/`,
						)) as IDataObject,
				),
			];
		return [await runners[resource](this)];
	}
}
