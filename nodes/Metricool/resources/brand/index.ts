import type { INodeProperties } from 'n8n-workflow';
import { clientLimitProperties, listOutput } from '../../../shared/pagination';
import { DATA, brandOptions } from '../../shared/descriptions';

const resource = 'brand';
const show = { resource: [resource] };

/**
 * Brands — `/v2/settings/brands`, what Metricool calls a `blogId` everywhere else.
 *
 * This is the discovery resource: a brand ID is otherwise only visible in the
 * web app's URL, so a workflow that should run over every brand of an account
 * starts here. Get Many also carries `networksData`, which is how a workflow can
 * tell whether the network it is about to post to is connected at all.
 */
export const brandDescription: INodeProperties[] = [
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
				action: 'Get a brand',
				routing: {
					request: { method: 'GET', url: '=/v2/settings/brands/{{$parameter.brandId}}' },
					...listOutput(DATA),
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many brands',
				routing: {
					request: { method: 'GET', url: '/v2/settings/brands' },
					...listOutput(DATA),
				},
			},
		],
		default: 'getAll',
	},

	{
		displayName: 'Brand Name or ID',
		name: 'brandId',
		type: 'options',
		typeOptions: brandOptions,
		default: '',
		required: true,
		description:
			'Brand to read. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { ...show, operation: ['get'] } },
	},

	...clientLimitProperties(resource),
];
