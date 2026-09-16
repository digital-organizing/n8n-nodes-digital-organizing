import type { INodeProperties } from 'n8n-workflow';

/**
 * Flyertool lists are django-ninja paginated: `limit` and `offset` query
 * parameters in, `{"items": [...], "count": n}` back. Both the paginator and the
 * output extraction therefore have to know about `items`.
 */
export function listProperties(resource: string): INodeProperties[] {
	const show = { resource: [resource], operation: ['getAll'] };

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
							limitParameter: 'limit',
							offsetParameter: 'offset',
							pageSize: 100,
							rootProperty: 'items',
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
			routing: { send: { type: 'query', property: 'limit' } },
		},
	];
}

/** Unwraps the `items` array of a paginated list response. */
export const listOutput = {
	output: {
		postReceive: [
			{
				type: 'rootProperty' as const,
				properties: { property: 'items' },
			},
		],
	},
};
