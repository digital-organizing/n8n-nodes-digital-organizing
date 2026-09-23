import type { INodeProperties } from 'n8n-workflow';
import { listOutput } from '../../../shared/pagination';
import {
	DATA,
	brandIdProperty,
	dateRangeProperties,
	timezoneProperty,
} from '../../shared/descriptions';

const resource = 'competitor';
const show = { resource: [resource] };

/**
 * Competitors — `/v2/analytics/competitors/{network}`.
 *
 * A competitor is another account on the same network that Metricool tracks
 * publicly alongside the brand. Adding one is how a workflow puts a new account
 * under observation; Get Many is the benchmark table, which is why it needs a
 * period rather than just a list.
 *
 * Add takes the account as the network itself identifies it — a page ID for
 * Facebook, a handle for X and Bluesky, a username for Instagram and TikTok.
 * Metricool resolves it and answers with the competitor record, whose `id` is
 * what Delete wants.
 */
export const competitorDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Add a competitor',
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/analytics/competitors/{{$parameter.network}}',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Remove a competitor',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v2/analytics/competitors/{{$parameter.network}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many competitors',
				routing: {
					request: {
						method: 'GET',
						url: '=/v2/analytics/competitors/{{$parameter.network}}',
					},
					...listOutput(DATA),
				},
			},
		],
		default: 'getAll',
	},

	brandIdProperty(resource),

	{
		displayName: 'Network',
		name: 'network',
		type: 'options',
		options: [
			{ name: 'Bluesky', value: 'bluesky' },
			{ name: 'Facebook', value: 'facebook' },
			{ name: 'Instagram', value: 'instagram' },
			{ name: 'Twitch', value: 'twitch' },
			{ name: 'X (Twitter)', value: 'twitter' },
			{ name: 'YouTube', value: 'youtube' },
		],
		default: 'instagram',
		displayOptions: { show },
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	...dateRangeProperties(resource, ['getAll']),
	timezoneProperty(resource, ['getAll']),
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Competitor IDs',
		name: 'competitors',
		type: 'string',
		default: '',
		placeholder: '1234,5678',
		description:
			'Comma-separated list of competitor IDs to restrict the answer to. Leave empty for every competitor of the brand on this network.',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: {
			send: {
				type: 'query',
				property: 'competitors[]',
				value: '={{ $value.split(",").map((id) => id.trim()).filter((id) => id !== "") }}',
			},
		},
	},

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Account',
		name: 'account',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'metricool',
		description:
			'The account to track, as the network identifies it — a handle, a username or a page ID depending on the network',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'query', property: 'id' } },
	},

	// ─── Delete ────────────────────────────────────────────────────────────────
	{
		displayName: 'Competitor ID',
		name: 'competitorId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID Metricool gave the competitor, from Get Many',
		displayOptions: { show: { ...show, operation: ['delete'] } },
		routing: { send: { type: 'query', property: 'competitorId' } },
	},
];
