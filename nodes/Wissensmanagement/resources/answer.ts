import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { jobProperties, queryProperties, readQuery, submitJob } from '../shared/descriptions';
import { forEachItem } from '../shared/request';

const show = { resource: ['answer'], operation: ['ask'] };

export const answerDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['answer'] } },
		options: [
			{
				name: 'Ask',
				value: 'ask',
				action: 'Ask a question',
				description: 'Get an AI answer with citations from the knowledge base',
			},
		],
		default: 'ask',
	},
	...queryProperties(show, true),
	...jobProperties(show),
];

export async function runAnswer(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		const body = readQuery(ctx, i);
		const { job, waited } = await submitJob(ctx, i, 'POST', '/answers/', body, body);
		return waited ? (job.result as IDataObject) : job;
	});
}
