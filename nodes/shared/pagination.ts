import type { INodePropertyRouting, INodeProperties } from 'n8n-workflow';

/**
 * Limit/offset pagination over a list response that wraps its rows in an
 * envelope — `items` for django-ninja, `results` for Django REST Framework.
 *
 * Both halves need the envelope key: the paginator to know how many rows a page
 * returned, and the output extraction to hand the workflow the rows themselves.
 */
export function offsetListProperties(
	resource: string,
	rootProperty: string,
	parameters: { limitParameter?: string; offsetParameter?: string } = {},
): INodeProperties[] {
	const show = { resource: [resource], operation: ['getAll'] };
	// Most of these APIs take plain `limit` and `offset`; Gravity Forms nests them
	// in a `paging` array instead.
	const { limitParameter = 'limit', offsetParameter = 'offset' } = parameters;

	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
			routing: {
				operations: {
					pagination: {
						type: 'offset',
						properties: {
							limitParameter,
							offsetParameter,
							pageSize: 100,
							rootProperty,
							type: 'query',
						},
					},
				},
				send: { paginate: '={{ $value }}' },
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: { send: { type: 'query', property: limitParameter } },
		},
	];
}

/** Spread into an operation's `routing` to unwrap the list envelope. */
export function listOutput(rootProperty: string): Pick<INodePropertyRouting, 'output'> {
	return {
		output: {
			postReceive: [
				{
					type: 'rootProperty',
					properties: { property: rootProperty },
				},
			],
		},
	};
}

/**
 * Return All / Limit for an endpoint that has no paging at all and always answers
 * with the full list. The cap is applied to the response after it arrives, so it
 * saves the workflow from the rows, not the API from the work.
 */
export function clientLimitProperties(
	resource: string,
	operation: string | string[] = 'getAll',
): INodeProperties[] {
	const show = {
		resource: [resource],
		operation: Array.isArray(operation) ? operation : [operation],
	};

	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: true,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: {
				output: {
					postReceive: [{ type: 'limit', properties: { maxResults: '={{ $value }}' } }],
				},
			},
		},
	];
}
