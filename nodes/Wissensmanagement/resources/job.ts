import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { listProperties, readLimit } from '../shared/descriptions';
import type { Job } from '../shared/request';
import { forEachItem, waitForJob, wmPaginate, wmRequest } from '../shared/request';

const resource = ['job'];
const show = (...operation: string[]) => ({ resource, operation });

export const jobDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a job',
				description: 'Status and, once it succeeded, the result of a job',
			},
			{ name: 'Get Many', value: 'getAll', action: 'Get many jobs' },
		],
		default: 'get',
	},
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '3f2a…',
		displayOptions: { show: show('get') },
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: false,
		description: 'Whether to wait until the job has finished before outputting it',
		displayOptions: { show: show('get') },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show('get'), waitForCompletion: [true] } },
		options: [
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
	...listProperties(show('getAll')),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: show('getAll') },
		options: [
			{
				displayName: 'Kind',
				name: 'kind',
				type: 'options',
				options: [
					{ name: 'Answer', value: 'answer' },
					{ name: 'Chat', value: 'chat' },
					{ name: 'Document', value: 'document' },
					{ name: 'Search', value: 'search' },
				],
				default: 'document',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Queued', value: 'queued' },
					{ name: 'Running', value: 'running' },
					{ name: 'Succeeded', value: 'succeeded' },
				],
				default: 'succeeded',
			},
		],
	},
];

export async function runJob(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		if (ctx.getNodeParameter('operation', i) === 'getAll') {
			const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;
			return await wmPaginate(ctx, '/jobs/', filters, readLimit(ctx, i));
		}

		const id = (ctx.getNodeParameter('jobId', i) as string).trim();
		const job = (await wmRequest(ctx, 'GET', `/jobs/${id}/`)) as Job;
		if (!(ctx.getNodeParameter('waitForCompletion', i) as boolean)) return job;

		const timeout = ctx.getNodeParameter('options.timeout', i, 300) as number;
		return await waitForJob(ctx, job, timeout, i);
	});
}
