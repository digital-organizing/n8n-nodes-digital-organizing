import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { listProperties, readLimit } from '../shared/descriptions';
import { forEachItem, wmPaginate, wmRequest } from '../shared/request';

const resource = ['prompt'];

/**
 * Read-only: prompt versions are edited in the app. Their IDs are what the
 * System and Reranker Prompt Version ID options of Search, Answer and Send
 * Message take.
 */
export const promptDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get a prompt version' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many prompt versions' },
		],
		default: 'getAll',
	},
	{
		displayName: 'Prompt Version ID',
		name: 'promptId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource, operation: ['get'] } },
	},
	...listProperties({ resource, operation: ['getAll'] }),
];

export async function runPrompt(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		if (ctx.getNodeParameter('operation', i) === 'getAll') {
			return await wmPaginate(ctx, '/prompts/', {}, readLimit(ctx, i));
		}
		const id = ctx.getNodeParameter('promptId', i) as number;
		return (await wmRequest(ctx, 'GET', `/prompts/${id}/`)) as IDataObject;
	});
}
