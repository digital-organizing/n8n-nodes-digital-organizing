import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

import { templateStudioRequest, toNodeApiError } from '../shared/request';

const show = { resource: ['custom'] };

/**
 * The package-wide "Custom API Call" resource. The other nodes get it from
 * nodes/shared/customApiCall, which builds declarative routing — this node runs
 * programmatically (Render turns binary data into the request and back), so the
 * request is sent by hand instead.
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
		placeholder: '/api/templates/',
		displayOptions: { show },
		description: 'Path appended to the base URL of the credential',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'json',
		default: '{}',
		displayOptions: { show },
		description: 'Query string parameters as a JSON object',
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

/** A JSON parameter arrives as text, or as an object when an expression built it. */
function jsonParameter(ctx: IExecuteFunctions, name: string, itemIndex: number): IDataObject {
	const value = ctx.getNodeParameter(name, itemIndex, '{}') as string | IDataObject;
	if (typeof value !== 'string') return value;
	if (value.trim() === '') return {};
	try {
		return JSON.parse(value) as IDataObject;
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			`${name === 'body' ? 'Body' : 'Query Parameters'} is not valid JSON`,
			{ itemIndex, description: (error as Error).message },
		);
	}
}

export async function runCustom(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = ctx.getInputData();
	const out: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const operation = ctx.getNodeParameter('operation', i) as string;
			const path = ctx.getNodeParameter('path', i) as string;
			const qs = jsonParameter(ctx, 'queryParameters', i);
			const body = operation === 'get' ? undefined : jsonParameter(ctx, 'body', i);

			const response = await templateStudioRequest(
				ctx,
				operation.toUpperCase() as IHttpRequestMethods,
				path,
				body,
				qs,
			);
			out.push({ json: response, pairedItem: { item: i } });
		} catch (error) {
			const wrapped = error instanceof NodeOperationError ? error : toNodeApiError(ctx, error, i);
			if (!ctx.continueOnFail()) throw wrapped;
			out.push({ json: { error: wrapped.message }, pairedItem: { item: i } });
		}
	}

	return out;
}
