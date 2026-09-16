import type { INodeProperties } from 'n8n-workflow';

/** An identifier that goes into the request path. */
export function idProperty(
	displayName: string,
	name: string,
	resource: string,
	operations: string[],
	description: string,
	type: 'string' | 'number' = 'number',
): INodeProperties {
	return {
		displayName,
		name,
		type,
		default: type === 'number' ? 0 : '',
		required: true,
		description,
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}
