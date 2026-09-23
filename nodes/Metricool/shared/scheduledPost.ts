import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeProperties,
	type PreSendAction,
} from 'n8n-workflow';
import { networkOptions } from './descriptions';

/**
 * Metricool reads a publication date as a *local* date-time — `2026-10-01T09:00:00`,
 * no offset and no `Z` — and applies the timezone sent next to it in the same
 * object. An n8n dateTime parameter carries an offset, so the offset is dropped
 * and the wall clock kept: the hour you picked is the hour Metricool schedules,
 * in the Timezone field's zone (the brand's own, when that is left empty).
 */
export function toLocalDateTime(value: string): string {
	const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?/.exec(value.trim());

	if (match === null) {
		throw new Error(`"${value}" is not a date and time`);
	}

	return `${match[1]}T${match[2]}${match[3] ?? ':00'}`;
}

/**
 * The same for the `start`/`end` of a calendar query, which Metricool reads the
 * same way the planner writes them: naive, in the brand's own timezone. The
 * analytics endpoints are the exception — those document ISO 8601 with an offset
 * and are left alone.
 */
export const naiveQueryDates: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const qs = requestOptions.qs as IDataObject | undefined;

	for (const key of ['start', 'end'] as const) {
		const value = qs?.[key];
		if (typeof value === 'string' && value !== '') {
			qs![key] = toLocalDateTime(value);
		}
	}

	return requestOptions;
};

/**
 * `YYYY-MM-DDTHH:mm:ss` as that instant reads on a wall clock in `timeZone` —
 * the format the calendar endpoints take, for a moment rather than a picked date.
 */
export function toZonedLocal(date: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(date);

	const part = (type: string): string => parts.find((entry) => entry.type === type)?.value ?? '00';

	return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
}

/** A comma-separated parameter into the array of strings the API expects. */
function toList(value: unknown): string[] {
	return String(value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

/**
 * Assembles the three structural fields of a scheduled post.
 *
 * `publicationDate` is an object, `providers` is a list of objects and `media`
 * and `mediaAltText` are lists of strings — none of which a flat node parameter
 * can express, so they are built here rather than routed field by field. Every
 * scalar next to them goes through plain `send` routing.
 */
export const buildScheduledPost: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as IDataObject;
	const publicationDate = this.getNodeParameter('publicationDate', '') as string;
	const timezone = (this.getNodeParameter('timezone', '') as string).trim();
	const networks = this.getNodeParameter('networks', []) as string[];
	const options = this.getNodeParameter('options', {}) as IDataObject;

	if (publicationDate !== '') {
		try {
			body.publicationDate = {
				dateTime: toLocalDateTime(publicationDate),
				...(timezone === '' ? {} : { timezone }),
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), (error as Error).message, {
				description: 'Publication Date has to be a date and time',
			});
		}
	}

	if (networks.length > 0) {
		body.providers = networks.map((network) => ({ network }));
	}

	// Sent only when set: an empty array would clear the media of a post being
	// updated, which is not what leaving the field alone should mean.
	for (const field of ['media', 'mediaAltText'] as const) {
		const entries = toList(options[field]);
		if (entries.length > 0) {
			body[field] = entries;
		}
	}

	requestOptions.body = body;

	return requestOptions;
};

/** The scalar fields, shared by Create and Update — both take the same schema. */
export const postOptionFields: INodeProperties[] = [
	{
		displayName: 'Auto Publish',
		name: 'autoPublish',
		type: 'boolean',
		default: true,
		description:
			'Whether Metricool publishes the post itself. Turn it off to get a reminder instead, which is the only option for networks that do not allow automatic publishing.',
		routing: { send: { type: 'body', property: 'autoPublish' } },
	},
	{
		displayName: 'Draft',
		name: 'draft',
		type: 'boolean',
		default: false,
		description: 'Whether the post is kept as a draft rather than queued for publication',
		routing: { send: { type: 'body', property: 'draft' } },
	},
	{
		displayName: 'First Comment Text',
		name: 'firstCommentText',
		type: 'string',
		default: '',
		description:
			'Posted as the first comment right after the post itself, where the network supports it',
		routing: { send: { type: 'body', property: 'firstCommentText' } },
	},
	{
		displayName: 'Media Alt Texts',
		name: 'mediaAltText',
		type: 'string',
		default: '',
		placeholder: 'A red bicycle, A crowded square',
		description: 'Comma-separated alt texts, in the same order as Media URLs',
	},
	{
		displayName: 'Media URLs',
		name: 'media',
		type: 'string',
		default: '',
		placeholder: 'https://example.org/one.jpg,https://example.org/two.jpg',
		description:
			'Comma-separated list of publicly reachable image or video URLs. Metricool fetches them, so a URL behind a login will not do.',
	},
	{
		displayName: 'Parent Post ID',
		name: 'parentId',
		type: 'number',
		default: 0,
		description: 'ID of the post this one continues, for a thread',
		routing: { send: { type: 'body', property: 'parentId' } },
	},
	{
		displayName: 'Save External Media Files',
		name: 'saveExternalMediaFiles',
		type: 'boolean',
		default: false,
		description:
			"Whether to copy the media into the brand's Metricool library instead of only referencing the URLs",
		routing: { send: { type: 'body', property: 'saveExternalMediaFiles' } },
	},
	{
		displayName: 'Shortener',
		name: 'shortener',
		type: 'boolean',
		default: false,
		description: 'Whether to run the links in the text through the Metricool shortener',
		routing: { send: { type: 'body', property: 'shortener' } },
	},
	{
		displayName: 'Video Cover Milliseconds',
		name: 'videoCoverMilliseconds',
		type: 'number',
		default: 0,
		description: 'Offset into the video of the frame used as its cover',
		routing: { send: { type: 'body', property: 'videoCoverMilliseconds' } },
	},
	{
		displayName: 'Video Thumbnail URL',
		name: 'videoThumbnailUrl',
		type: 'string',
		default: '',
		description: 'Image used as the video cover, instead of a frame of the video itself',
		routing: { send: { type: 'body', property: 'videoThumbnailUrl' } },
	},
];

/** Text, date, networks and the rest, gated on one operation of the post resource. */
export function postBodyProperties(resource: string, operation: string): INodeProperties[] {
	const show = { resource: [resource], operation: [operation] };

	return [
		{
			displayName: 'Text',
			name: 'text',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			required: true,
			description: 'The post itself. Metricool sends the same text to every network chosen.',
			displayOptions: { show },
			routing: { send: { type: 'body', property: 'text' } },
		},
		{
			displayName: 'Publication Date',
			name: 'publicationDate',
			type: 'dateTime',
			default: '',
			required: true,
			description:
				'When to publish. Read as wall-clock time in the Timezone below, so the offset of the value is ignored.',
			displayOptions: { show },
		},
		{
			displayName: 'Networks',
			name: 'networks',
			type: 'multiOptions',
			options: networkOptions,
			default: [],
			required: true,
			description:
				'Networks to publish to. Each has to be connected to the brand, and the post fails for a network that is not.',
			displayOptions: { show },
		},
		{
			displayName: 'Timezone',
			name: 'timezone',
			type: 'string',
			default: '',
			placeholder: 'Europe/Zurich',
			description:
				"IANA timezone the publication date is read in. Leave empty to use the brand's own timezone.",
			displayOptions: { show },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: { show },
			options: postOptionFields,
		},
		{
			displayName: 'Network Data',
			name: 'networkData',
			type: 'json',
			default: '{}',
			description:
				'Network-specific settings, merged into the body as-is: instagramData, tiktokData, youtubeData, linkedinData, twitterData, facebookData, pinterestData, gmbData, threadsData, blueskyData, location, descendants — and any other key of the ScheduledPost schema this node does not model',
			displayOptions: { show },
		},
	];
}
