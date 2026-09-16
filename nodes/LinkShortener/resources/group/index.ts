import type { INodeProperties } from 'n8n-workflow';
import { listOutput, offsetListProperties } from '../../../shared/pagination';

const resource = 'group';
const show = { resource: [resource] };

/**
 * Groups are read-only over the API. The list is the groups your key may file
 * links under, which a link create has to name.
 */
export const groupDescription: INodeProperties[] = [
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
				action: 'Get a group',
				routing: { request: { method: 'GET', url: '=/api/v1/groups/{{$parameter.groupId}}/' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many groups',
				routing: {
					request: { method: 'GET', url: '/api/v1/groups/' },
					...listOutput('results'),
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'number',
		default: 0,
		required: true,
		description: 'The ID of the group',
		displayOptions: { show: { ...show, operation: ['get'] } },
	},
	...offsetListProperties(resource, 'results'),
	{
		displayName: 'Search',
		name: 'groupSearch',
		type: 'string',
		default: '',
		description: 'Substring match on the group name',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'search' } },
	},
];
