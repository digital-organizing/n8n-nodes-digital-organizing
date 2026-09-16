import type { INodeProperties } from 'n8n-workflow';

const resource = 'identity';
const show = { resource: [resource] };

/**
 * Who the key belongs to, and what it may reach. The API documents this as its
 * own smoke test, so it doubles as a health check in a workflow.
 */
export const identityDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Who Am I',
				value: 'whoAmI',
				action: 'Get the identity behind the API key',
				routing: { request: { method: 'GET', url: '/api/v1/whoami/' } },
			},
		],
		default: 'whoAmI',
	},
];
