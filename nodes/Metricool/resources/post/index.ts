import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { clientLimitProperties, listOutput } from '../../../shared/pagination';
import { DATA, brandIdProperty, timezoneProperty } from '../../shared/descriptions';
import {
	buildScheduledPost,
	naiveQueryDates,
	postBodyProperties,
} from '../../shared/scheduledPost';

const resource = 'post';
const show = { resource: [resource] };

/**
 * Scheduled posts — `/v2/scheduler/posts`, the calendar behind the Metricool
 * planner and the reason most workflows talk to this API at all.
 *
 * One post carries one text and a list of networks, so scheduling the same
 * message to five accounts is one call, not five. What comes back has a status
 * per network in `providers`, which is where a partial failure shows up: the
 * post as a whole succeeded, one network in it did not.
 *
 * Get Many is a calendar query, not a paged list: it answers with everything in
 * the window, so narrow the window rather than asking for a page.
 *
 * Two shapes of write, because the API has two:
 *
 * - **Update** is a PUT and *replaces* the post. Fields you leave empty are
 *   dropped from it, so read the post first and send it back whole.
 * - **Reschedule** is the PATCH, which only accepts a new publication date. It
 *   is the safe way to move a post without touching anything else, and it moves
 *   a whole thread when aimed at the parent.
 */
export const postDescription: INodeProperties[] = [
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
				action: 'Create a scheduled post',
				routing: {
					request: { method: 'POST', url: '/v2/scheduler/posts' },
					send: {
						preSend: [buildScheduledPost, mergeJsonBody('networkData', 'Network Data')],
					},
					...listOutput(DATA),
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a scheduled post',
				routing: {
					request: { method: 'DELETE', url: '=/v2/scheduler/posts/{{$parameter.postId}}' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a scheduled post',
				routing: {
					request: { method: 'GET', url: '=/v2/scheduler/posts/{{$parameter.postId}}' },
					...listOutput(DATA),
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many scheduled posts',
				routing: {
					request: { method: 'GET', url: '/v2/scheduler/posts' },
					send: { preSend: [naiveQueryDates] },
					...listOutput(DATA),
				},
			},
			{
				name: 'Reschedule',
				value: 'reschedule',
				action: 'Reschedule a scheduled post',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/v2/scheduler/posts/{{$parameter.postId}}',
						qs: { fields: 'publicationDate' },
					},
					send: { preSend: [buildScheduledPost] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a scheduled post',
				routing: {
					request: { method: 'PUT', url: '=/v2/scheduler/posts/{{$parameter.postId}}' },
					send: {
						preSend: [buildScheduledPost, mergeJsonBody('networkData', 'Network Data')],
					},
					...listOutput(DATA),
				},
			},
		],
		default: 'getAll',
	},

	brandIdProperty(resource),

	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Numeric ID of the scheduled post',
		displayOptions: { show: { ...show, operation: ['get', 'update', 'reschedule', 'delete'] } },
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Beginning of the calendar window. Read as wall-clock time in the Timezone below, so the offset of the value is ignored.',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'start' } },
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'End of the calendar window, read the same way as Start',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'end' } },
	},
	timezoneProperty(resource, ['getAll']),
	...clientLimitProperties(resource),

	// ─── Create ────────────────────────────────────────────────────────────────
	...postBodyProperties(resource, 'create'),

	// ─── Update ────────────────────────────────────────────────────────────────
	{
		displayName:
			'Update replaces the post rather than patching it: anything not sent here is dropped. Read the post with Get first and send back what you want to keep — or use Reschedule, which only moves the publication date.',
		name: 'updateNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { ...show, operation: ['update'] } },
	},
	...postBodyProperties(resource, 'update'),

	// ─── Reschedule ────────────────────────────────────────────────────────────
	{
		displayName: 'Publication Date',
		name: 'publicationDate',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'The new publication date. Read as wall-clock time in the Timezone below, so the offset of the value is ignored.',
		displayOptions: { show: { ...show, operation: ['reschedule'] } },
	},
	timezoneProperty(resource, ['reschedule'], false),
];
