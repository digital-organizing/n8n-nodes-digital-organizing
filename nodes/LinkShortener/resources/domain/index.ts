import type { INodeProperties } from 'n8n-workflow';
import { listOutput, offsetListProperties } from '../../../shared/pagination';

const resource = 'domain';
const show = { resource: [resource] };

/**
 * Domains are read-only over the API — they are configured in the admin. The
 * list is what your key may put links on, which is what a workflow needs before
 * creating one.
 */
export const domainDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a domain',
				routing: { request: { method: 'GET', url: '=/api/v1/domains/{{$parameter.domainId}}/' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many domains',
				routing: {
					request: { method: 'GET', url: '/api/v1/domains/' },
					...listOutput('results'),
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Domain ID',
		name: 'domainId',
		type: 'number',
		default: 0,
		required: true,
		description: 'The ID of the domain',
		displayOptions: { show: { ...show, operation: ['get'] } },
	},
	...offsetListProperties(resource, 'results'),
	{
		displayName: 'Search',
		name: 'domainSearch',
		type: 'string',
		default: '',
		description: 'Substring match on the domain name',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'search' } },
	},
];
