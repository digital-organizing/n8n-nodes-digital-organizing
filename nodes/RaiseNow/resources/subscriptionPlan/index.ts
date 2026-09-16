import type { INodeProperties } from 'n8n-workflow';
import { uuidProperty } from '../../shared/descriptions';

const resource = 'subscriptionPlan';
const show = { resource: [resource] };

/**
 * Subscription plans — https://docs.raisenow.com/api
 *
 * Read-only here: plans are configured in the RaiseNow Hub, workflows only need
 * to look them up to reference a plan UUID on a subscription.
 */
export const subscriptionPlanDescription: INodeProperties[] = [
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
				action: 'Get a subscription plan',
				routing: {
					request: {
						method: 'GET',
						url: '=/subscription-plans/{{$parameter.subscriptionPlanUuid}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many subscription plans',
				routing: { request: { method: 'GET', url: '/subscription-plans' } },
			},
		],
		default: 'getAll',
	},

	uuidProperty(
		'Subscription Plan UUID',
		'subscriptionPlanUuid',
		resource,
		['get'],
		'The identifier of the subscription plan',
	),
];
