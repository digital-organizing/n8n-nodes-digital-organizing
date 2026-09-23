import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';
import { brandOptions, postStatusOptions } from '../Metricool/shared/descriptions';
import { toZonedLocal } from '../Metricool/shared/scheduledPost';

/** One entry of a scheduled post's per-network status list. */
type Provider = {
	network?: string;
	status?: string;
	publicUrl?: string;
	detailedStatus?: string;
};

type ScheduledPost = IDataObject & {
	id?: number;
	uuid?: string;
	providers?: Provider[];
};

/**
 * Starts a workflow when a scheduled post reaches a status on a network.
 *
 * Metricool has no outbound webhooks — the `/webhooks` paths in its API are
 * where TikTok and X deliver *to* Metricool, not where Metricool delivers to
 * anyone else. So this polls the planner and compares.
 *
 * What it compares is the per-network status inside a post, not the post: a post
 * to three networks publishes three times and can fail on one while succeeding
 * on the others, and that failure is the event worth reacting to. Each tick
 * emits one item per network that entered a watched status since the last tick.
 *
 * "Since the last tick" is remembered as the set of post-network-status triples
 * seen in the window, so a status that is merely still true does not fire again.
 * The set is rebuilt from the window every tick rather than accumulated, which
 * is what keeps it from growing without bound — and since the window only ever
 * moves forward, a post that ages out of it cannot come back and fire twice.
 *
 * The first tick after activation only records what is already there; it does
 * not replay history.
 */
export class MetricoolTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Metricool Trigger',
		name: 'metricoolTrigger',
		icon: {
			light: 'file:../../icons/metricool.svg',
			dark: 'file:../../icons/metricool.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["statuses"].join(", ") }}',
		description: 'Starts the workflow when a Metricool post changes status',
		defaults: {
			name: 'Metricool Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'metricoolApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'Metricool sends no webhooks, so this node polls the planner. Posts that already carry a watched status when the workflow is activated are not replayed.',
				name: 'pollingNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Brand Name or ID',
				name: 'blogId',
				type: 'options',
				typeOptions: brandOptions,
				default: '',
				required: true,
				description:
					'Brand whose planner to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				options: postStatusOptions,
				default: ['PUBLISHED', 'ERROR'],
				required: true,
				description: 'Which per-network statuses start the workflow',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Lookahead (Hours)',
						name: 'lookaheadHours',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 0 },
						description:
							'How far into the future to look as well. Only useful for watching drafts and pending posts, which sit ahead of the clock.',
					},
					{
						displayName: 'Lookback (Hours)',
						name: 'lookbackHours',
						type: 'number',
						default: 24,
						typeOptions: { minValue: 1 },
						description:
							'How far back each tick looks. It has to comfortably outlast the poll interval, and long enough for Metricool to have finished publishing.',
					},
					{
						displayName: 'Networks',
						name: 'networks',
						type: 'string',
						default: '',
						placeholder: 'instagram,linkedin',
						description:
							'Comma-separated networks to watch. Leave empty for every network of the post.',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						placeholder: 'Europe/Zurich',
						description:
							'IANA timezone the window and the dates on the posts are expressed in. Defaults to UTC, which keeps the window honest whatever zone the brand is in.',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const credentials = await this.getCredentials('metricoolApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
		const blogId = this.getNodeParameter('blogId') as string;
		const statuses = this.getNodeParameter('statuses', []) as string[];
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const lookback = Number(options.lookbackHours ?? 24);
		const lookahead = Number(options.lookaheadHours ?? 1);
		const networks = String(options.networks ?? '')
			.split(',')
			.map((entry) => entry.trim().toLowerCase())
			.filter((entry) => entry !== '');

		// The planner takes its window without an offset and reads it in whatever
		// timezone the query names, so the two have to agree: the bounds are
		// rendered in that zone rather than in UTC, and the zone is always sent.
		// Defaulting it to the brand's own would mean not knowing what was asked
		// for — a window an hour or two off, silently dropping the posts that
		// just published — so the default is UTC, which is knowable.
		const timezone = String(options.timezone ?? '').trim() || 'UTC';
		const now = Date.now();
		const bound = (offsetHours: number): string =>
			toZonedLocal(new Date(now + offsetHours * 3_600_000), timezone);

		const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'metricoolApi', {
			method: 'GET',
			url: `${baseUrl}/v2/scheduler/posts`,
			qs: {
				blogId,
				timezone,
				start: bound(-lookback),
				end: bound(lookahead),
			},
			json: true,
		})) as { data?: ScheduledPost[] };

		const posts = response.data ?? [];
		const matches: INodeExecutionData[] = [];
		const current: string[] = [];

		for (const post of posts) {
			const postKey = String(post.id ?? post.uuid ?? '');

			for (const provider of post.providers ?? []) {
				const network = String(provider.network ?? '').toLowerCase();
				const status = String(provider.status ?? '');

				if (!statuses.includes(status)) continue;
				if (networks.length > 0 && !networks.includes(network)) continue;

				current.push(`${postKey}:${network}:${status}`);
				matches.push({
					json: {
						...post,
						// Which of the post's networks this item is about, lifted out of
						// `providers` so a workflow can branch on it without digging.
						network: provider.network,
						status: provider.status,
						detailedStatus: provider.detailedStatus,
						publicUrl: provider.publicUrl,
					},
				});
			}
		}

		if (this.getMode() === 'manual') {
			return matches.length === 0 ? null : [matches.slice(-1)];
		}

		const staticData = this.getWorkflowStaticData('node');
		const seen = (staticData.seen as string[] | undefined) ?? undefined;
		staticData.seen = current;

		// First tick after activation: record the window, emit nothing.
		if (seen === undefined) {
			return null;
		}

		const known = new Set(seen);
		const fresh = matches.filter((_, index) => !known.has(current[index]));

		return fresh.length === 0 ? null : [fresh];
	}
}
