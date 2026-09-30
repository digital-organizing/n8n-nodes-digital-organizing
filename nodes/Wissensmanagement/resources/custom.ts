import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { forEachItem, idempotencyKey, wmRequest } from '../shared/request';

const show = { resource: ['custom'] };

/**
 * The package-wide "Custom API Call" resource. Like Address Cleanup's, the
 * request is sent by hand because this node runs programmatically. POST and PUT
 * get an Idempotency-Key, since every job-starting route requires one and the
 * others ignore it.
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
		placeholder: '/documents/',
		displayOptions: { show },
		description: 'Path after /api/v1 of the credential base URL',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'json',
		default: '{}',
		displayOptions: { show },
		description: 'Query string parameters as a JSON object. An array value repeats the key.',
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'json',
		default: '{}',
		displayOptions: { show: { ...show, operation: ['post', 'put', 'patch', 'delete'] } },
		description: 'Request body as a JSON object',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['post', 'put'] } },
		options: [
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description: 'Leave empty to generate one per execution and item',
			},
		],
	},
];

function parseJson(value: unknown): IDataObject {
	if (typeof value === 'object' && value !== null) return value as IDataObject;
	return JSON.parse((value as string) || '{}') as IDataObject;
}

export async function runCustom(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		const operation = ctx.getNodeParameter('operation', i) as string;
		const method = operation.toUpperCase() as IHttpRequestMethods;
		const path = ctx.getNodeParameter('path', i) as string;
		const qs = parseJson(ctx.getNodeParameter('queryParameters', i, '{}'));
		const body = operation === 'get' ? undefined : parseJson(ctx.getNodeParameter('body', i, '{}'));

		const headers: IDataObject = {};
		if (method === 'POST' || method === 'PUT') {
			headers['Idempotency-Key'] = idempotencyKey(ctx, i, `${method} ${path}`, { qs, body });
		}

		const response = await wmRequest(ctx, method, path, { qs, body, headers });
		// DELETE answers 204 with an empty body.
		return (response || { success: true }) as IDataObject;
	});
}
