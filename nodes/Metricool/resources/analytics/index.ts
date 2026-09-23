import type { INodeProperties } from 'n8n-workflow';
import { clientLimitProperties, listOutput } from '../../../shared/pagination';
import {
	DATA,
	brandIdProperty,
	dateRangeProperties,
	timezoneProperty,
} from '../../shared/descriptions';

const resource = 'analytics';
const show = { resource: [resource] };
/** Everything here is a report over a period; only the shape of the answer differs. */
const reports = ['timeline', 'aggregate', 'distribution', 'posts'];
/** The three that share the network/metric/subject/scope query. */
const metricReports = ['timeline', 'aggregate', 'distribution'];

/**
 * Analytics — the read side of Metricool, `/v2/analytics`.
 *
 * Three of these four operations are the same query answered at three
 * resolutions: **Timeline** gives one value per day, **Aggregate** collapses the
 * period to a single number, **Distribution** breaks it down by a key. All three
 * take a network and a metric, and which metrics a network has is the part worth
 * checking before wiring one up — the list is long, per network, and documented
 * only in the spec's own prose.
 *
 * **Get Posts** is the other half: the published posts themselves with their
 * per-post numbers, which is what a report about content rather than about an
 * account is built from.
 *
 * Both halves read history, never the live account — a post published minutes
 * ago has no numbers yet, and Metricool backfills on its own schedule.
 */
export const analyticsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Aggregate',
				value: 'aggregate',
				action: 'Get an aggregate metric',
				description: 'One number for the whole period',
				routing: {
					// The envelope holds a bare number in `data`, which cannot be an
					// item of its own, so this operation hands back the envelope.
					request: { method: 'GET', url: '/v2/analytics/aggregation' },
				},
			},
			{
				name: 'Get Distribution',
				value: 'distribution',
				action: 'Get a metric distribution',
				description: 'The period broken down into key and value pairs',
				routing: {
					request: { method: 'GET', url: '/v2/analytics/distribution' },
					...listOutput(DATA),
				},
			},
			{
				name: 'Get Posts',
				value: 'posts',
				action: 'Get published posts with their metrics',
				routing: {
					request: {
						method: 'GET',
						url: '=/v2/analytics/{{$parameter.contentType}}/{{$parameter.postNetwork}}',
					},
					...listOutput(DATA),
				},
			},
			{
				name: 'Get Timeline',
				value: 'timeline',
				action: 'Get a metric timeline',
				description: 'One value per day over the period',
				routing: {
					request: { method: 'GET', url: '/v2/analytics/timelines' },
					...listOutput(DATA),
				},
			},
		],
		default: 'timeline',
	},

	brandIdProperty(resource),
	...dateRangeProperties(resource, reports),
	timezoneProperty(resource, reports),

	// ─── Timeline, Aggregate, Distribution ─────────────────────────────────────
	{
		displayName: 'Network',
		name: 'network',
		type: 'options',
		options: [
			{ name: 'Bluesky', value: 'bluesky' },
			{ name: 'Facebook', value: 'facebook' },
			{ name: 'Google Ads', value: 'adwords' },
			{ name: 'Google Business Profile', value: 'gmb' },
			{ name: 'Instagram', value: 'instagram' },
			{ name: 'LinkedIn', value: 'linkedin' },
			{ name: 'Meta Ads', value: 'facebookads' },
			{ name: 'Pinterest', value: 'pinterest' },
			{ name: 'Threads', value: 'threads' },
			{ name: 'TikTok', value: 'tiktok' },
			{ name: 'TikTok Ads', value: 'tiktokads' },
			{ name: 'X (Twitter)', value: 'twitter' },
			{ name: 'YouTube', value: 'youtube' },
		],
		default: 'instagram',
		displayOptions: { show: { ...show, operation: metricReports } },
		routing: { send: { type: 'query', property: 'network' } },
	},
	{
		displayName: 'Metric',
		name: 'metric',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'interactions',
		description:
			'Which number to report, case insensitive. Every network has its own set — <code>followers</code>, <code>impressions</code>, <code>reach</code>, <code>interactions</code>, <code>engagement</code> and <code>likes</code> exist almost everywhere, the rest do not. The full per-network list is spelled out in the metric parameter of /v2/analytics/timelines in the Metricool API spec.',
		displayOptions: { show: { ...show, operation: metricReports } },
		routing: { send: { type: 'query', property: 'metric' } },
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		placeholder: 'posts',
		description:
			'Which part of the network the metric is about — <code>account</code>, <code>posts</code>, <code>reels</code>, <code>stories</code>. Each network defines its own; Instagram requires one.',
		displayOptions: { show: { ...show, operation: metricReports } },
		routing: { send: { type: 'query', property: 'subject' } },
	},
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'string',
		default: '',
		description:
			'Second filter on top of Subject, used by YouTube (<code>viewed</code>, <code>published</code>) and by the Instagram breakdown metrics',
		displayOptions: { show: { ...show, operation: metricReports } },
		routing: { send: { type: 'query', property: 'scope' } },
	},

	// ─── Get Posts ─────────────────────────────────────────────────────────────
	{
		displayName: 'Network',
		name: 'postNetwork',
		type: 'options',
		options: [
			{ name: 'Bluesky', value: 'bluesky' },
			{ name: 'Facebook', value: 'facebook' },
			{ name: 'Instagram', value: 'instagram' },
			{ name: 'LinkedIn', value: 'linkedin' },
			{ name: 'Pinterest', value: 'pinterest' },
			{ name: 'Threads', value: 'threads' },
			{ name: 'TikTok', value: 'tiktok' },
			{ name: 'X (Twitter)', value: 'twitter' },
		],
		default: 'instagram',
		displayOptions: { show: { ...show, operation: ['posts'] } },
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		options: [
			{ name: 'Posts', value: 'posts', description: 'Every network' },
			{ name: 'Reels', value: 'reels', description: 'Facebook and Instagram only' },
			{ name: 'Stories', value: 'stories', description: 'Facebook and Instagram only' },
		],
		default: 'posts',
		description:
			'Which feed to read. Asking a network for a kind of content it does not have answers 404.',
		displayOptions: { show: { ...show, operation: ['posts'] } },
	},

	// Timeline answers one series per metric, so a cap on it would never bite.
	...clientLimitProperties(resource, ['posts', 'distribution']),
];
