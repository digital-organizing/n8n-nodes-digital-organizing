import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { listOutput, offsetListProperties } from '../../../shared/pagination';

const resource = 'share';
const show = { resource: [resource] };

/**
 * Shares — a text shared on several platforms, under /api/v1/shares/.
 *
 * Create makes one short link per platform, each redirecting to that platform's
 * share URL (`wa.me/?text=…` and so on). Slugs are random, optionally behind a
 * prefix: `my-campaign-x3k9qa`. The response carries the links as a list and as
 * a `short_urls` map from platform to short URL.
 *
 * Updating the text or URL rewrites every link of the share. Generate Links
 * builds the share URLs without storing anything.
 */

/** The platform keys the API accepts, see `shortener/share.py`. */
const platformOptions: INodePropertyOptions[] = [
	{ name: 'Bluesky', value: 'bluesky' },
	{ name: 'E-Mail', value: 'email' },
	{ name: 'Facebook', value: 'facebook', description: 'Needs a URL' },
	{ name: 'LinkedIn', value: 'linkedin', description: 'Needs a URL' },
	{ name: 'SMS', value: 'sms' },
	{ name: 'Telegram', value: 'telegram' },
	{ name: 'Threads', value: 'threads' },
	{ name: 'WhatsApp', value: 'whatsapp' },
	{ name: 'X / Twitter', value: 'x' },
];

const textProperty: Omit<INodeProperties, 'displayOptions'> = {
	displayName: 'Text',
	name: 'text',
	type: 'string',
	typeOptions: { rows: 4 },
	default: '',
	required: true,
	description: 'The message to share',
	routing: { send: { type: 'body', property: 'text' } },
};

const urlProperty: Omit<INodeProperties, 'displayOptions'> = {
	displayName: 'URL',
	name: 'url',
	type: 'string',
	default: '',
	placeholder: 'https://example.com/campaign',
	description:
		'Link to share along with the text. Facebook and LinkedIn can only share a link, so they need one.',
	routing: { send: { type: 'body', property: 'url' } },
};

export const shareDescription: INodeProperties[] = [
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
				action: 'Create a share with short links',
				routing: { request: { method: 'POST', url: '/api/v1/shares/' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a share and its links',
				routing: {
					request: { method: 'DELETE', url: '=/api/v1/shares/{{$parameter.shareId}}/' },
				},
			},
			{
				name: 'Generate Links',
				value: 'preview',
				action: 'Generate share links without storing them',
				routing: { request: { method: 'POST', url: '/api/v1/shares/preview/' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a share',
				routing: { request: { method: 'GET', url: '=/api/v1/shares/{{$parameter.shareId}}/' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many shares',
				routing: {
					request: { method: 'GET', url: '/api/v1/shares/' },
					...listOutput('results'),
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a share',
				routing: {
					request: { method: 'PATCH', url: '=/api/v1/shares/{{$parameter.shareId}}/' },
				},
			},
		],
		default: 'create',
	},

	{
		displayName: 'Share ID',
		name: 'shareId',
		type: 'number',
		default: 0,
		required: true,
		description: 'The ID of the share',
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},

	// ─── Create / Generate Links ───────────────────────────────────────────────
	{
		...textProperty,
		displayOptions: { show: { ...show, operation: ['create', 'preview'] } },
	},
	{
		displayName: 'Platforms',
		name: 'platforms',
		type: 'multiOptions',
		options: platformOptions,
		default: [],
		required: true,
		description: 'One short link is created per platform',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'platforms' } },
	},
	{
		displayName: 'Platforms',
		name: 'previewPlatforms',
		type: 'multiOptions',
		options: platformOptions,
		default: [],
		description: 'The platforms to generate links for. All of them if left empty.',
		displayOptions: { show: { ...show, operation: ['preview'] } },
		// An empty list is what the API reads as "all platforms".
		routing: { send: { type: 'body', property: 'platforms' } },
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'example.com',
		description: 'Domain name the short links are served from. Must be one your key may use.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'domain' } },
	},
	{
		displayName: 'Group',
		name: 'group',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the group that owns the share. Must be one your key belongs to.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'group' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Slug Prefix',
				name: 'slug_prefix',
				type: 'string',
				default: '',
				placeholder: 'my-campaign',
				description:
					'Slugs become the prefix, a dash and a random part, e.g. my-campaign-x3k9qa. Without a prefix they are just the random part.',
				routing: { send: { type: 'body', property: 'slug_prefix' } },
			},
			urlProperty,
		],
	},
	{
		displayName: 'Options',
		name: 'previewOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['preview'] } },
		options: [urlProperty],
	},

	// ─── Update ────────────────────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Only the fields you add are changed. The links of the share are rewritten to match.',
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: [
			{
				displayName: 'Group',
				name: 'group',
				type: 'string',
				default: '',
				description: 'Name of the group that owns the share and its links',
				routing: { send: { type: 'body', property: 'group' } },
			},
			{ ...textProperty, required: false },
			urlProperty,
		],
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	...offsetListProperties(resource, 'results'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Ordering',
				name: 'ordering',
				type: 'options',
				options: [
					{ name: 'Newest First', value: '-created_at' },
					{ name: 'Oldest First', value: 'created_at' },
				],
				default: '-created_at',
				routing: { send: { type: 'query', property: 'ordering' } },
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Substring match on the text, the URL and the slugs of the links',
				routing: { send: { type: 'query', property: 'search' } },
			},
		],
	},
];
