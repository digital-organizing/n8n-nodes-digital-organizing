import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { addressCleanupRequest } from '../shared/request';

/**
 * How old the index is, what the server's limits are and whether the last
 * refresh failed. Worth a scheduled workflow: a register that stopped
 * refreshing keeps matching happily against stale data.
 */
export const statusDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['index'] } },
		options: [
			{
				name: 'Get Status',
				value: 'getStatus',
				action: 'Get the index status',
				description: 'Index statistics, effective limits and the state of the last refresh',
			},
		],
		default: 'getStatus',
	},
];

/** The answer does not depend on the input, so one call covers the whole run. */
export async function runStatus(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	try {
		const response = await addressCleanupRequest(ctx, 'GET', '/v1/status');
		return [{ json: response, pairedItem: { item: 0 } }];
	} catch (error) {
		if (!ctx.continueOnFail()) {
			throw new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex: 0 });
		}
		return [{ json: { error: (error as Error).message }, pairedItem: { item: 0 } }];
	}
}
