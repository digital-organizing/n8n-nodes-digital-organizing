import type { INodeProperties, INodePropertyTypeOptions } from 'n8n-workflow';

/** Every v2 response wraps its payload — a list or a single object — in `data`. */
export const DATA = 'data';

/**
 * The brand a call is about.
 *
 * Metricool calls it `blogId` on the wire and "brand" everywhere in the product;
 * the node follows the product. One account manages many brands and nearly every
 * endpoint is scoped to one, so this sits on almost every operation.
 *
 * The dropdown reads the account's own brand list rather than hardcoding IDs,
 * which is also the only place a workflow can discover a blogId at all — the ID
 * is otherwise only visible in the web app's URL.
 */
export function brandIdProperty(resource: string, operations?: string[]): INodeProperties {
	return {
		displayName: 'Brand Name or ID',
		name: 'blogId',
		type: 'options',
		typeOptions: brandOptions,
		default: '',
		required: true,
		description:
			'Brand the call is about, sent as blogId. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show:
				operations === undefined
					? { resource: [resource] }
					: { resource: [resource], operation: operations },
		},
		routing: { send: { type: 'query', property: 'blogId' } },
	};
}

/** The brand dropdown, filled from `/v2/settings/brands`. */
export const brandOptions: INodePropertyTypeOptions = {
	loadOptions: {
		routing: {
			request: { method: 'GET', url: '/v2/settings/brands' },
			output: {
				postReceive: [
					{ type: 'rootProperty', properties: { property: DATA } },
					{
						type: 'setKeyValue',
						properties: {
							name: '={{ $responseItem.label || $responseItem.title || $responseItem.id }}',
							value: '={{ $responseItem.id }}',
						},
					},
					{ type: 'sort', properties: { key: 'name' } },
				],
			},
		},
	},
};

/**
 * The networks a brand can connect, as Metricool spells them on the wire.
 *
 * The spec types every one of these fields as a plain string and documents the
 * accepted values only in prose, so this list comes from the endpoint
 * descriptions rather than from an enum — expect a new network to appear here
 * before it appears in the spec.
 */
export const networkOptions = [
	{ name: 'Bluesky', value: 'bluesky' },
	{ name: 'Facebook', value: 'facebook' },
	{ name: 'Facebook Group', value: 'fbgroup' },
	{ name: 'Google Business Profile', value: 'gmb' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'LinkedIn', value: 'linkedin' },
	{ name: 'Pinterest', value: 'pinterest' },
	{ name: 'Threads', value: 'threads' },
	{ name: 'TikTok', value: 'tiktok' },
	{ name: 'X (Twitter)', value: 'twitter' },
	{ name: 'YouTube', value: 'youtube' },
];

/** The statuses Metricool reports per network on a scheduled post. */
export const postStatusOptions = [
	{ name: 'Awaiting Confirmation', value: 'AWAITING_CONFIRMATION' },
	{ name: 'Draft', value: 'DRAFT' },
	{ name: 'Error', value: 'ERROR' },
	{ name: 'Pending', value: 'PENDING' },
	{ name: 'Published', value: 'PUBLISHED' },
	{ name: 'Publishing', value: 'PUBLISHING' },
];

/**
 * The timezone a date range is read in.
 *
 * Metricool stores a brand's own timezone and falls back to it when this is
 * omitted, so leaving it empty is usually right. It earns its keep when a
 * workflow reports on several brands and wants one common clock.
 */
export function timezoneProperty(
	resource: string,
	operations: string[],
	asQuery = true,
): INodeProperties {
	return {
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: '',
		placeholder: 'Europe/Zurich',
		description:
			"IANA timezone the dates are read in. Leave empty to use the brand's own timezone.",
		displayOptions: { show: { resource: [resource], operation: operations } },
		...(asQuery ? { routing: { send: { type: 'query', property: 'timezone' } } } : {}),
	};
}

/**
 * The `from`/`to` window every analytics endpoint requires.
 *
 * Both are mandatory on the API side: there is no "everything" and no default
 * period, so a report is always a range the workflow picks.
 */
export function dateRangeProperties(
	resource: string,
	operations: string[],
	names: { from: string; to: string } = { from: 'from', to: 'to' },
): INodeProperties[] {
	const show = { resource: [resource], operation: operations };

	return [
		{
			displayName: 'From',
			name: 'from',
			type: 'dateTime',
			default: '',
			required: true,
			description: 'Start of the period, inclusive',
			displayOptions: { show },
			routing: { send: { type: 'query', property: names.from } },
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'dateTime',
			default: '',
			required: true,
			description: 'End of the period, inclusive',
			displayOptions: { show },
			routing: { send: { type: 'query', property: names.to } },
		},
	];
}
