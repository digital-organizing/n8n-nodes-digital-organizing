import type { INodeProperties } from 'n8n-workflow';
import { listOutput, offsetListProperties } from '../../../shared/pagination';

const resource = 'link';
const show = { resource: [resource] };

/**
 * Short links — the full CRUD set under /api/v1/links/.
 *
 * Domain and group are referenced by name, not by ID: `example.com` and the
 * group's name. A key can only use the domains and groups its owner may use,
 * anything else is rejected as a validation error.
 *
 * Slug and domain together must be unique; a clash answers 400 with the message
 * on the slug field.
 */

/** Open graph and Twitter card fields, writable on both create and update. */
const metadataOptions: INodeProperties[] = [
	{
		displayName: 'OG Description',
		name: 'og_description',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'og_description' } },
	},
	{
		displayName: 'OG Image Height',
		name: 'og_image_height',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'og_image_height' } },
	},
	{
		displayName: 'OG Image URL',
		name: 'og_image_url',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'og_image_url' } },
	},
	{
		displayName: 'OG Image Width',
		name: 'og_image_width',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'og_image_width' } },
	},
	{
		displayName: 'OG Title',
		name: 'og_title',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'og_title' } },
	},
	{
		displayName: 'OG Type',
		name: 'og_type',
		type: 'string',
		default: '',
		placeholder: 'website',
		routing: { send: { type: 'body', property: 'og_type' } },
	},
	{
		displayName: 'OG URL',
		name: 'og_url',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'og_url' } },
	},
	{
		displayName: 'OG Video Height',
		name: 'og_video_height',
		type: 'number',
		default: 1080,
		routing: { send: { type: 'body', property: 'og_video_height' } },
	},
	{
		displayName: 'OG Video URL',
		name: 'og_video_url',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'og_video_url' } },
	},
	{
		displayName: 'OG Video Width',
		name: 'og_video_width',
		type: 'number',
		default: 1920,
		routing: { send: { type: 'body', property: 'og_video_width' } },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'title' } },
	},
	{
		displayName: 'Twitter Card',
		name: 'twitter_card',
		type: 'options',
		options: [
			{ name: 'App', value: 'app' },
			{ name: 'Player', value: 'player' },
			{ name: 'Summary', value: 'summary' },
			{ name: 'Summary Large Image', value: 'summary_large_image' },
		],
		default: 'summary_large_image',
		routing: { send: { type: 'body', property: 'twitter_card' } },
	},
	{
		displayName: 'Twitter Creator',
		name: 'twitter_creator',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'twitter_creator' } },
	},
	{
		displayName: 'Twitter Site',
		name: 'twitter_site',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'twitter_site' } },
	},
];

export const linkDescription: INodeProperties[] = [
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
				action: 'Create a link',
				routing: { request: { method: 'POST', url: '/api/v1/links/' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a link',
				routing: {
					request: { method: 'DELETE', url: '=/api/v1/links/{{$parameter.linkId}}/' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a link',
				routing: { request: { method: 'GET', url: '=/api/v1/links/{{$parameter.linkId}}/' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many links',
				routing: {
					request: { method: 'GET', url: '/api/v1/links/' },
					...listOutput('results'),
				},
			},
			{
				name: 'Refresh Metadata',
				value: 'refreshMetadata',
				action: 'Refresh the metadata of a link',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/links/{{$parameter.linkId}}/refresh-metadata/',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a link',
				routing: {
					request: { method: 'PATCH', url: '=/api/v1/links/{{$parameter.linkId}}/' },
				},
			},
		],
		default: 'create',
	},

	{
		displayName: 'Link ID',
		name: 'linkId',
		type: 'number',
		default: 0,
		required: true,
		description: 'The ID of the link',
		displayOptions: {
			show: { ...show, operation: ['get', 'update', 'delete', 'refreshMetadata'] },
		},
	},

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Target',
		name: 'target',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/a-long-url',
		description: 'Where the short link points',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'target' } },
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'example.com',
		description: 'Domain name the link is served from. Must be one your key may use.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'domain' } },
	},
	{
		displayName: 'Group',
		name: 'group',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the group that owns the link. Must be one your key belongs to.',
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
				displayName: 'Custom Tags',
				name: 'custom_tags',
				type: 'boolean',
				default: true,
				description:
					'Whether to serve a preview page carrying the open graph tags instead of redirecting straight to the target',
				routing: { send: { type: 'body', property: 'custom_tags' } },
			},
			{
				displayName: 'Fetch Metadata',
				name: 'fetch_metadata',
				type: 'boolean',
				default: true,
				description:
					'Whether to scrape the target for open graph tags and fill in the fields you did not set. Only applies when Custom Tags is on.',
				routing: { send: { type: 'body', property: 'fetch_metadata' } },
			},
			...metadataOptions,
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description:
					'Path of the short link. A random one is generated if left empty. Lowercased before saving.',
				routing: { send: { type: 'body', property: 'slug' } },
			},
		],
	},

	// ─── Update ────────────────────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Only the fields you add are changed',
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: [
			{
				displayName: 'Custom Tags',
				name: 'custom_tags',
				type: 'boolean',
				default: true,
				description:
					'Whether to serve a preview page carrying the open graph tags instead of redirecting straight to the target',
				routing: { send: { type: 'body', property: 'custom_tags' } },
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'example.com',
				routing: { send: { type: 'body', property: 'domain' } },
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'string',
				default: '',
				description: 'Name of the group that owns the link',
				routing: { send: { type: 'body', property: 'group' } },
			},
			...metadataOptions,
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Path of the short link. Lowercased before saving.',
				routing: { send: { type: 'body', property: 'slug' } },
			},
			{
				displayName: 'Target',
				name: 'target',
				type: 'string',
				default: '',
				description: 'Where the short link points',
				routing: { send: { type: 'body', property: 'target' } },
			},
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
				displayName: 'Created After',
				name: 'created_after',
				type: 'dateTime',
				default: '',
				description: 'Only links created at or after this moment',
				routing: { send: { type: 'query', property: 'created_after' } },
			},
			{
				displayName: 'Created Before',
				name: 'created_before',
				type: 'dateTime',
				default: '',
				description: 'Only links created at or before this moment',
				routing: { send: { type: 'query', property: 'created_before' } },
			},
			{
				displayName: 'Custom Tags',
				name: 'custom_tags',
				type: 'boolean',
				default: true,
				description:
					'Whether to return only links that serve a preview page, or only those that do not',
				routing: { send: { type: 'query', property: 'custom_tags' } },
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'example.com',
				description: 'Exact match, case insensitive',
				routing: { send: { type: 'query', property: 'domain' } },
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'string',
				default: '',
				description: 'Exact match on the group name, case insensitive',
				routing: { send: { type: 'query', property: 'group' } },
			},
			{
				displayName: 'Ordering',
				name: 'ordering',
				type: 'options',
				options: [
					{ name: 'Least Viewed', value: 'views' },
					{ name: 'Most Viewed', value: '-views' },
					{ name: 'Newest First', value: '-created_at' },
					{ name: 'Oldest First', value: 'created_at' },
					{ name: 'Slug A-Z', value: 'slug' },
					{ name: 'Slug Z-A', value: '-slug' },
				],
				default: '-created_at',
				routing: { send: { type: 'query', property: 'ordering' } },
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Substring match on slug, title and target',
				routing: { send: { type: 'query', property: 'search' } },
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Exact match, case insensitive',
				routing: { send: { type: 'query', property: 'slug' } },
			},
			{
				displayName: 'Target',
				name: 'target',
				type: 'string',
				default: '',
				description: 'Substring match on the target URL',
				routing: { send: { type: 'query', property: 'target' } },
			},
		],
	},
];
