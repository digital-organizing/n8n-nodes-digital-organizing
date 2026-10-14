import type {
	IDataObject,
	IDisplayOptions,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import type { Job } from './request';
import { idempotencyKey, pmRequest, waitForJob } from './request';

type Show = NonNullable<IDisplayOptions['show']>;

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

/** The row cap for pmPaginate: undefined when Return All is on. */
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
					description: 'How long to wait for the job before returning the resumable job',
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
	method: 'POST' | 'PUT' | 'PATCH',
	path: string,
	body: IDataObject | FormData | undefined,
	fingerprint: unknown,
): Promise<{ job: Job; waited: boolean }> {
	const key = idempotencyKey(ctx, itemIndex, `${method} ${path}`, fingerprint);
	let job = (await pmRequest(ctx, method, path, {
		body,
		headers: { 'Idempotency-Key': key },
	})) as Job;

	const waited = ctx.getNodeParameter('waitForCompletion', itemIndex) as boolean;
	if (waited) {
		const timeout = ctx.getNodeParameter('options.timeout', itemIndex, 300) as number;
		job = await waitForJob(ctx, job, timeout, itemIndex);
	}

	return { job, waited: waited && job.status === 'succeeded' };
}

export const eventOptions: INodePropertyOptions[] = [
	{ name: 'Document Failed', value: 'document.failed' },
	{ name: 'Document Ready', value: 'document.ready' },
	{ name: 'Job Failed', value: 'job.failed' },
	{ name: 'Job Succeeded', value: 'job.succeeded' },
	{ name: 'Review Created', value: 'review.created' },
	{ name: 'Review Decided', value: 'review.decided' },
	{ name: 'Tracked Geschäft Updated', value: 'tracked_affair.updated' },
];

export function operation(
	resource: string,
	options: Array<[string, string, string]>,
): INodeProperties {
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing -- default is derived from the first option
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: options.map(([name, value, action]) => ({ name, value, action })),
		// The first operation is the default for this resource.
		default: options.at(0)![1],
	};
}
export function textField(
	displayName: string,
	name: string,
	show: Show,
	defaultValue = '',
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: defaultValue,
		required: true,
		displayOptions: { show },
	};
}
export function filters(show: Show, names: string[]): INodeProperties {
	return {
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: names.map((name) => ({
			displayName: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			name,
			type: 'string' as const,
			default: '',
		})),
	};
}
export function parseIds(value: string): number[] {
	const ids = value
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean)
		.map(Number);
	if (ids.some((id) => !Number.isSafeInteger(id) || id < 1))
		throw new Error('IDs must be positive integers');
	return ids;
}
