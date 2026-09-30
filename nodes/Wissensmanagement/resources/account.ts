import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { forEachItem, wmRequest } from '../shared/request';

export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get Me',
				value: 'getMe',
				action: 'Get the current API key owner',
				description: 'The user behind the key, its scopes, expiry and rate limits',
			},
		],
		default: 'getMe',
	},
];

export async function runAccount(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async () => (await wmRequest(ctx, 'GET', '/me/')) as IDataObject);
}
