import type { INodeProperties } from 'n8n-workflow';

const resource = 'account';
const show = { resource: [resource] };

/**
 * The identification echo Cura documents as a way to check that a token and an
 * organisation slug belong together. Useful in a workflow as a health check.
 */
export const accountDescription: INodeProperties[] = [
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
				action: 'Identify the authenticated organisation',
				routing: {
					request: {
						method: 'GET',
						url: '/api/latest/who-am-i/',
						qs: { org: '={{$credentials.organisationSlug}}' },
					},
				},
			},
		],
		default: 'whoAmI',
	},
];
