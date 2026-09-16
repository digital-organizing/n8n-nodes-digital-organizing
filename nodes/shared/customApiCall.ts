import type { IDataObject, INodeProperties } from 'n8n-workflow';

/**
 * Builds a generic "Custom API Call" resource.
 *
 * Every node in this package ships with one. It lets a workflow hit any endpoint
 * of the service with the credentials already configured, so the node is useful
 * before every resource has a typed implementation — and stays useful for the
 * long tail of endpoints we will never model explicitly.
 *
 * Add typed resources next to it (see nodes/DoCounter/resources for the pattern)
 * and they take over the common operations.
 */
export function customApiCallDescription(resource = 'custom'): INodeProperties[] {
	const show = { resource: [resource] };

	return [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show },
			options: [
				{
					name: 'DELETE',
					value: 'delete',
					action: 'Send a DELETE request',
					routing: { request: { method: 'DELETE', url: '={{$parameter.path}}' } },
				},
				{
					name: 'GET',
					value: 'get',
					action: 'Send a GET request',
					routing: { request: { method: 'GET', url: '={{$parameter.path}}' } },
				},
				{
					name: 'PATCH',
					value: 'patch',
					action: 'Send a PATCH request',
					routing: { request: { method: 'PATCH', url: '={{$parameter.path}}' } },
				},
				{
					name: 'POST',
					value: 'post',
					action: 'Send a POST request',
					routing: { request: { method: 'POST', url: '={{$parameter.path}}' } },
				},
				{
					name: 'PUT',
					value: 'put',
					action: 'Send a PUT request',
					routing: { request: { method: 'PUT', url: '={{$parameter.path}}' } },
				},
			],
			default: 'get',
		},
		{
			displayName: 'Path',
			name: 'path',
			type: 'string',
			default: '/',
			required: true,
			placeholder: '/v1/transactions',
			description: 'Path appended to the base URL of the credential',
			displayOptions: { show },
		},
		{
			displayName: 'Query Parameters',
			name: 'queryParameters',
			type: 'json',
			default: '{}',
			description: 'Query string parameters as a JSON object',
			displayOptions: { show },
			routing: {
				request: {
					// The expression resolves to an object at runtime, but `qs` is typed
					// as IDataObject, so the expression string needs the cast.
					qs: '={{ JSON.parse($parameter.queryParameters || "{}") }}' as unknown as IDataObject,
				},
			},
		},
		{
			displayName: 'Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'Request body as a JSON object',
			displayOptions: {
				show: { ...show, operation: ['post', 'put', 'patch', 'delete'] },
			},
			routing: {
				request: {
					body: '={{ JSON.parse($parameter.body || "{}") }}',
				},
			},
		},
	];
}
