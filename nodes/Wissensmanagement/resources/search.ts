import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { jobProperties, queryProperties, readQuery, submitJob } from '../shared/descriptions';
import { forEachItem } from '../shared/request';

const show = { resource: ['search'], operation: ['run'] };

export const searchDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['search'] } },
		options: [
			{
				name: 'Run',
				value: 'run',
				action: 'Search the knowledge base',
				description: 'Find the passages that best match a question, without writing an answer',
			},
		],
		default: 'run',
	},
	...queryProperties(show, false),
	{
		displayName: 'Split Sources',
		name: 'splitSources',
		type: 'boolean',
		default: true,
		description:
			'Whether to output one item per passage found. Off, the node outputs one item holding all of them.',
		displayOptions: { show: { ...show, waitForCompletion: [true] } },
	},
	...jobProperties(show),
];

export async function runSearch(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		const body = readQuery(ctx, i);
		const { job, waited } = await submitJob(ctx, i, 'POST', '/search/', body, body);
		if (!waited) return job;

		const result = job.result as IDataObject;
		if (!(ctx.getNodeParameter('splitSources', i) as boolean)) return result;
		return result.sources as IDataObject[];
	});
}
