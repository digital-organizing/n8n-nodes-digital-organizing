import type {
	IDataObject,
	IDisplayOptions,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import type { Job } from './request';
import { idempotencyKey, wmRequest, waitForJob } from './request';

type Show = NonNullable<IDisplayOptions['show']>;

export const stanceOptions: INodePropertyOptions[] = [
	{ name: 'Ally', value: 'ally' },
	{ name: 'Neutral', value: 'neutral' },
	{ name: 'Opposition', value: 'opposition' },
];

/** Return All / Limit for a cursor-paginated list; read back with {@link readLimit}. */
export function listProperties(show: Show): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
		},
	];
}

/** The row cap for wmPaginate: undefined when Return All is on. */
export function readLimit(ctx: IExecuteFunctions, itemIndex: number): number | undefined {
	if (ctx.getNodeParameter('returnAll', itemIndex) as boolean) return undefined;
	return ctx.getNodeParameter('limit', itemIndex) as number;
}

/**
 * Wait for Completion plus the job options, for every operation that answers
 * 202 with a job. Read back with {@link submitJob}.
 */
export function jobProperties(show: Show): INodeProperties[] {
	return [
		{
			displayName: 'Wait for Completion',
			name: 'waitForCompletion',
			type: 'boolean',
			default: true,
			description:
				'Whether to wait until the job has finished and output its result. Off, the node outputs the queued job right away.',
			displayOptions: { show },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: { show },
			options: [
				{
					displayName: 'Idempotency Key',
					name: 'idempotencyKey',
					type: 'string',
					default: '',
					description:
						'Sending the same key with the same input again returns the original job instead of starting a new one. Kept for seven days. Leave empty to generate one per execution and item.',
				},
				{
					displayName: 'Timeout (Seconds)',
					name: 'timeout',
					type: 'number',
					default: 300,
					typeOptions: { minValue: 1 },
					description: 'How long to wait for the job before failing with its ID',
				},
			],
		},
	];
}

/**
 * Starts a job with an Idempotency-Key and, when Wait for Completion is on,
 * polls it to the end. Returns the job either way; its `result` is only set
 * once it succeeded.
 */
export async function submitJob(
	ctx: IExecuteFunctions,
	itemIndex: number,
	method: 'POST' | 'PUT',
	path: string,
	body: IDataObject | FormData | undefined,
	fingerprint: unknown,
): Promise<{ job: Job; waited: boolean }> {
	const key = idempotencyKey(ctx, itemIndex, `${method} ${path}`, fingerprint);
	let job = (await wmRequest(ctx, method, path, {
		body,
		headers: { 'Idempotency-Key': key },
	})) as Job;

	const waited = ctx.getNodeParameter('waitForCompletion', itemIndex) as boolean;
	if (waited) {
		const timeout = ctx.getNodeParameter('options.timeout', itemIndex, 300) as number;
		job = await waitForJob(ctx, job, timeout, itemIndex);
	}

	return { job, waited };
}

/**
 * The retrieval query behind Search, Answer and Send Message. Answer and Send
 * Message also take a system prompt; Search has no generation step.
 */
export function queryProperties(show: Show, withSystemPrompt: boolean): INodeProperties[] {
	const fields: INodeProperties[] = [
		{
			displayName: 'Document IDs',
			name: 'documentIds',
			type: 'string',
			default: '',
			placeholder: '12, 15, 42',
			description: 'Only search these documents. Comma-separated, up to 200.',
		},
		{
			displayName: 'Number of Sources',
			name: 'k',
			type: 'number',
			default: 8,
			typeOptions: { minValue: 1, maxValue: 12 },
			description: 'How many passages to retrieve',
		},
		{
			displayName: 'Reranker Prompt Version ID',
			name: 'rerankerPromptVersionId',
			type: 'number',
			default: 0,
			description: 'Prompt version used to rerank the passages. Leave at 0 for the active one.',
		},
		{
			displayName: 'Stances',
			name: 'stanceFilters',
			type: 'multiOptions',
			options: stanceOptions,
			default: ['ally', 'neutral', 'opposition'],
			description: 'Only use documents with these stances',
		},
	];

	if (withSystemPrompt) {
		fields.push({
			displayName: 'System Prompt Version ID',
			name: 'systemPromptVersionId',
			type: 'number',
			default: 0,
			description: 'Prompt version used to write the answer. Leave at 0 for the active one.',
		});
	}

	return [
		{
			displayName: 'Message',
			name: 'message',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			required: true,
			description: 'The question or search text, up to 16,000 characters',
			displayOptions: { show },
		},
		{
			displayName: 'Query Options',
			name: 'queryOptions',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: { show },
			options: fields,
		},
	];
}

/** Parses "1, 2,3" into [1, 2, 3], ignoring blanks. */
export function parseIds(value: string): number[] {
	return value
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part !== '')
		.map(Number);
}

/** The QueryRequest body built from {@link queryProperties}. */
export function readQuery(ctx: IExecuteFunctions, itemIndex: number): IDataObject {
	const options = ctx.getNodeParameter('queryOptions', itemIndex, {}) as IDataObject;
	const body: IDataObject = { message: ctx.getNodeParameter('message', itemIndex) as string };

	if (options.stanceFilters !== undefined) body.stance_filters = options.stanceFilters;
	if (options.k !== undefined) body.k = options.k;
	if (typeof options.documentIds === 'string' && options.documentIds.trim() !== '') {
		body.document_ids = parseIds(options.documentIds);
	}
	if (typeof options.rerankerPromptVersionId === 'number' && options.rerankerPromptVersionId > 0) {
		body.reranker_prompt_version_id = options.rerankerPromptVersionId;
	}
	if (typeof options.systemPromptVersionId === 'number' && options.systemPromptVersionId > 0) {
		body.system_prompt_version_id = options.systemPromptVersionId;
	}

	return body;
}

/** The events a webhook subscription can listen to. */
export const eventOptions: INodePropertyOptions[] = [
	{ name: 'Document Created', value: 'document.created' },
	{ name: 'Document Deleted', value: 'document.deleted' },
	{ name: 'Document Failed', value: 'document.failed', description: 'Processing failed' },
	{
		name: 'Document Ready',
		value: 'document.ready',
		description: 'Processing finished and the document is searchable',
	},
	{ name: 'Document Updated', value: 'document.updated' },
	{ name: 'Job Cancelled', value: 'job.cancelled' },
	{ name: 'Job Failed', value: 'job.failed' },
	{ name: 'Job Succeeded', value: 'job.succeeded' },
];
