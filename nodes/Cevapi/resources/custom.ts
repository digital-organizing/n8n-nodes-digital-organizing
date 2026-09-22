import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';

import { NodeApiError } from 'n8n-workflow';

import { cevapiRequest } from '../shared/request';

const show = { resource: ['custom'] };

/**
 * The package-wide "Custom API Call" resource. The other nodes get it from
 * nodes/shared/customApiCall, which builds declarative routing — this node runs
 * programmatically (the Route operation needs its own outputs), so the request
 * is sent by hand instead.
 */
export const customDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{ name: 'DELETE', value: 'delete', action: 'Send a DELETE request' },
			{ name: 'GET', value: 'get', action: 'Send a GET request' },
			{ name: 'PATCH', value: 'patch', action: 'Send a PATCH request' },
			{ name: 'POST', value: 'post', action: 'Send a POST request' },
			{ name: 'PUT', value: 'put', action: 'Send a PUT request' },
		],
		default: 'get',
	},
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		default: '/',
		required: true,
		placeholder: '/v1/profiles',
		displayOptions: { show },
		description: 'Path appended to the base URL of the credential',
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'json',
		default: '{}',
		displayOptions: { show: { ...show, operation: ['post', 'put', 'patch', 'delete'] } },
		description: 'Request body as a JSON object',
	},
];

export async function runCustom(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = ctx.getInputData();
	const out: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = ctx.getNodeParameter('operation', i) as string;
			const path = ctx.getNodeParameter('path', i) as string;
			const body =
				operation === 'get'
					? undefined
					: (JSON.parse((ctx.getNodeParameter('body', i, '{}') as string) || '{}') as IDataObject);

			const response = await cevapiRequest(
				ctx,
				operation.toUpperCase() as IHttpRequestMethods,
				path,
				body,
			);
			out.push({ json: response, pairedItem: { item: i } });
		} catch (error) {
			if (!ctx.continueOnFail()) {
				throw new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex: i });
			}
			out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
		}
	}

	return out;
}
