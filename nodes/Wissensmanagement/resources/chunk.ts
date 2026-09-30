import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { forEachItem, wmRequest } from '../shared/request';

const resource = ['chunk'];

/** A chunk is one indexed passage; search sources and citations point at them. */
export const chunkDescription: INodeProperties[] = [
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
				action: 'Get a chunk',
				description: 'One indexed passage, e.g. the chunk_id of a search source',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Chunk ID',
		name: 'chunkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource, operation: ['get'] } },
	},
];

export async function runChunk(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		const id = ctx.getNodeParameter('chunkId', i) as number;
		return (await wmRequest(ctx, 'GET', `/chunks/${id}/`)) as IDataObject;
	});
}
