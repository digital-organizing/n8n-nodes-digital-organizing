import type { INodeProperties } from 'n8n-workflow';
import { listOutput } from '../../../shared/pagination';
import { DATA, brandIdProperty, timezoneProperty } from '../../shared/descriptions';
import { naiveQueryDates } from '../../shared/scheduledPost';

const resource = 'bestTime';
const show = { resource: [resource] };

/**
 * Best times — `/v2/scheduler/besttimes/{provider}`.
 *
 * Metricool scores every hour of every weekday from how the brand's own audience
 * behaved over the window given, and answers one entry per weekday with a value
 * per hour. It is the input to "schedule this when it will be seen": pick the
 * highest-scoring hour and hand it to Post → Create.
 *
 * The scores are relative to the brand, not to the network, so they only mean
 * something once the brand has enough published history in the window.
 */
export const bestTimeDescription: INodeProperties[] = [
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
				action: 'Get the best times to publish',
				routing: {
					request: { method: 'GET', url: '=/v2/scheduler/besttimes/{{$parameter.provider}}' },
					send: { preSend: [naiveQueryDates] },
					...listOutput(DATA),
				},
			},
		],
		default: 'get',
	},

	brandIdProperty(resource),

	{
		displayName: 'Network',
		name: 'provider',
		type: 'options',
		options: [
			{ name: 'Facebook', value: 'facebook' },
			{ name: 'Instagram', value: 'instagram' },
			{ name: 'LinkedIn', value: 'linkedin' },
			{ name: 'TikTok', value: 'tiktok' },
			{ name: 'YouTube', value: 'youtube' },
		],
		default: 'instagram',
		description: 'Network to score. Metricool computes best times for these five only.',
		displayOptions: { show },
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		default: '',
		description:
			'Beginning of the history the scores are computed from. Read as wall-clock time in the Timezone below.',
		displayOptions: { show },
		routing: { send: { type: 'query', property: 'start' } },
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		default: '',
		description: 'End of that history',
		displayOptions: { show },
		routing: { send: { type: 'query', property: 'end' } },
	},
	timezoneProperty(resource, ['get']),
];
