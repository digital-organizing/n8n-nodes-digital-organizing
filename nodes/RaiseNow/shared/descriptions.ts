import type { INodeProperties } from 'n8n-workflow';

/**
 * A UUID that goes into the request path. RaiseNow identifies every resource by
 * UUID, so this shape repeats in almost every operation.
 */
export function uuidProperty(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required: true,
		description,
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

/**
 * Key-value pairs RaiseNow stores alongside a resource. The API takes a JSON
 * object with string values only.
 */
export function customParametersProperty(property = 'custom_parameters'): INodeProperties {
	return {
		displayName: 'Custom Parameters',
		name: 'customParameters',
		type: 'json',
		default: '{}',
		description: 'Free key-value pairs to attach. Values must be strings.',
		routing: {
			send: {
				type: 'body',
				property,
				value: '={{ JSON.parse($value || "{}") }}',
			},
		},
	};
}

/**
 * Offset pagination shared by the list operations: RaiseNow returns a plain
 * array and pages it with `from` / `size`.
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
							limitParameter: 'size',
							offsetParameter: 'from',
							pageSize: 100,
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
			routing: {
				send: { type: 'query', property: 'size' },
			},
		},
	];
}
