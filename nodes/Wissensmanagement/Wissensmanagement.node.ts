import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { accountDescription, runAccount } from './resources/account';
import { answerDescription, runAnswer } from './resources/answer';
import { chatSessionDescription, runChatSession } from './resources/chatSession';
import { chunkDescription, runChunk } from './resources/chunk';
import { customDescription, runCustom } from './resources/custom';
import { documentDescription, runDocument } from './resources/document';
import { jobDescription, runJob } from './resources/job';
import { promptDescription, runPrompt } from './resources/prompt';
import { runSearch, searchDescription } from './resources/search';
import { runWebhook, webhookDescription } from './resources/webhook';

const runners: Record<string, (ctx: IExecuteFunctions) => Promise<INodeExecutionData[]>> = {
	account: runAccount,
	answer: runAnswer,
	chatSession: runChatSession,
	chunk: runChunk,
	custom: runCustom,
	document: runDocument,
	job: runJob,
	prompt: runPrompt,
	search: runSearch,
	webhook: runWebhook,
};

/**
 * Wissensmanagement is our RAG knowledge base, deployed once per customer:
 * documents are uploaded, split into chunks and indexed, then searched or
 * turned into cited AI answers.
 *
 * Programmatic rather than declarative: uploads, searches and answers run as
 * background jobs that the node polls to the end, each start needs its own
 * Idempotency-Key, and files go up as multipart — none of which routing can
 * express.
 */
export class Wissensmanagement implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wissensmanagement',
		name: 'wissensmanagement',
		icon: {
			light: 'file:../../icons/wissensmanagement.svg',
			dark: 'file:../../icons/wissensmanagement.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Add documents to a Wissensmanagement knowledge base, search it and ask it questions',
		defaults: {
			name: 'Wissensmanagement',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'wissensmanagementApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Answer', value: 'answer' },
					{ name: 'Chat Session', value: 'chatSession' },
					{ name: 'Chunk', value: 'chunk' },
					{ name: 'Custom API Call', value: 'custom' },
					{ name: 'Document', value: 'document' },
					{ name: 'Job', value: 'job' },
					{ name: 'Prompt', value: 'prompt' },
					{ name: 'Search', value: 'search' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'document',
			},
			...accountDescription,
			...answerDescription,
			...chatSessionDescription,
			...chunkDescription,
			...customDescription,
			...documentDescription,
			...jobDescription,
			...promptDescription,
			...searchDescription,
			...webhookDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		return [await runners[resource](this)];
	}
}
