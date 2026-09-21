import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { listOutput, offsetListProperties } from '../../../shared/pagination';
import {
	GF,
	buildEntrySearch,
	fieldFilterProperty,
	formatEntryDates,
	statusOptions,
} from '../../shared/descriptions';

const resource = 'entry';
const show = { resource: [resource] };

/**
 * Entries — `/entries`, `/forms/[FORM_ID]/entries` and `/entries/[ENTRY_ID]`.
 *
 * An entry is flat: the entry properties (`id`, `form_id`, `date_created`,
 * `payment_status`, …) and beside them the submitted values, keyed by field ID
 * — `"3"` for a single-input field, `"1.3"` for the first name of a name field.
 * Which key is which is in the form definition, or in `_labels` when you ask for
 * it.
 *
 * Creating an entry here writes it to the database directly: no validation, no
 * notifications, no add-on feeds. Use the Submission resource when the entry
 * should go through the form as if someone had filled it in.
 */
export const entryDescription: INodeProperties[] = [
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
				action: 'Create an entry',
				routing: {
					request: { method: 'POST', url: `=${GF}/forms/{{$parameter.formId}}/entries` },
					send: {
						preSend: [mergeJsonBody('fieldValues', 'Field Values'), formatEntryDates],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an entry',
				routing: { request: { method: 'DELETE', url: `=${GF}/entries/{{$parameter.entryId}}` } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an entry',
				routing: { request: { method: 'GET', url: `=${GF}/entries/{{$parameter.entryId}}` } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many entries',
				routing: {
					request: {
						// The form-scoped endpoint when a form is named, the global one
						// otherwise. PHP wants `include[]=12`, hence the array format.
						method: 'GET',
						url: `={{ $parameter.searchFormId ? "${GF}/forms/" + $parameter.searchFormId + "/entries" : "${GF}/entries" }}`,
						arrayFormat: 'brackets',
					},
					send: { preSend: [buildEntrySearch] },
					...listOutput('entries'),
				},
			},
			{
				name: 'Send Notifications',
				value: 'sendNotifications',
				action: 'Send the notifications of an entry',
				routing: {
					request: {
						method: 'POST',
						url: `=${GF}/entries/{{$parameter.entryId}}/notifications`,
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an entry',
				routing: {
					request: { method: 'PUT', url: `=${GF}/entries/{{$parameter.entryId}}` },
					send: { preSend: [mergeJsonBody('entry', 'Entry')] },
				},
			},
		],
		default: 'getAll',
	},

	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the entry',
		displayOptions: {
			show: { ...show, operation: ['get', 'update', 'delete', 'sendNotifications'] },
		},
	},

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Form ID',
		name: 'formId',
		type: 'string',
		default: '',
		required: true,
		description: 'The form the entry belongs to',
		displayOptions: { show: { ...show, operation: ['create'] } },
	},
	{
		displayName: 'Field Values',
		name: 'fieldValues',
		type: 'json',
		default: '{}',
		required: true,
		placeholder: '{ "1.3": "Neil", "1.6": "Armstrong", "3": "neil@example.com" }',
		description:
			'The submitted values, keyed by field ID. Compound fields such as name or address use the input IDs, 1.3 and 1.6 for first and last name.',
		displayOptions: { show: { ...show, operation: ['create'] } },
	},
	{
		displayName: 'Entry Properties',
		name: 'entryProperties',
		type: 'collection',
		placeholder: 'Add Property',
		default: {},
		description: 'Entry metadata to set alongside the field values',
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Created By',
				name: 'created_by',
				type: 'number',
				default: 0,
				description: 'WordPress user ID to record as the submitter',
				routing: { send: { type: 'body', property: 'created_by' } },
			},
			{
				displayName: 'Date Created',
				name: 'date_created',
				type: 'dateTime',
				default: '',
				description: 'Defaults to now. Interpreted as UTC.',
				routing: { send: { type: 'body', property: 'date_created' } },
			},
			{
				displayName: 'IP',
				name: 'ip',
				type: 'string',
				default: '',
				description: 'IP address to record for the entry',
				routing: { send: { type: 'body', property: 'ip' } },
			},
			{
				displayName: 'Is Read',
				name: 'is_read',
				type: 'boolean',
				default: false,
				description: 'Whether the entry counts as already read in the entry list',
				routing: { send: { type: 'body', property: 'is_read', value: '={{ $value ? 1 : 0 }}' } },
			},
			{
				displayName: 'Is Starred',
				name: 'is_starred',
				type: 'boolean',
				default: false,
				description: 'Whether the entry is starred',
				routing: { send: { type: 'body', property: 'is_starred', value: '={{ $value ? 1 : 0 }}' } },
			},
			{
				displayName: 'Payment Amount',
				name: 'payment_amount',
				type: 'string',
				default: '',
				description: 'Only meaningful on forms with payment fields',
				routing: { send: { type: 'body', property: 'payment_amount' } },
			},
			{
				displayName: 'Payment Status',
				name: 'payment_status',
				type: 'string',
				default: '',
				placeholder: 'Paid',
				routing: { send: { type: 'body', property: 'payment_status' } },
			},
			{
				displayName: 'Source URL',
				name: 'source_url',
				type: 'string',
				default: '',
				description: 'Page the form was submitted from',
				routing: { send: { type: 'body', property: 'source_url' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: statusOptions,
				default: 'active',
				routing: { send: { type: 'body', property: 'status' } },
			},
			{
				displayName: 'Transaction ID',
				name: 'transaction_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'transaction_id' } },
			},
			{
				displayName: 'User Agent',
				name: 'user_agent',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'user_agent' } },
			},
		],
	},

	// ─── Update ────────────────────────────────────────────────────────────────
	{
		displayName:
			'Update replaces the whole entry: every field and property you leave out is blanked out. Send the entry as Get returned it, with your changes applied.',
		name: 'updateNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { ...show, operation: ['update'] } },
	},
	{
		displayName: 'Entry',
		name: 'entry',
		type: 'json',
		default: '{}',
		required: true,
		description: 'The complete entry object, field values and entry properties together',
		displayOptions: { show: { ...show, operation: ['update'] } },
	},

	// ─── Get ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['get', 'getAll'] } },
		options: [
			{
				displayName: 'Field IDs',
				name: '_field_ids',
				type: 'string',
				default: '',
				placeholder: '1.3,1.6,3,date_created',
				description:
					'Comma-separated list of the fields and properties to return. Everything else is left out of the response.',
				routing: { send: { type: 'query', property: '_field_ids' } },
			},
			{
				displayName: 'Include Labels',
				name: '_labels',
				type: 'boolean',
				default: false,
				description:
					'Whether to add a _labels object mapping each field ID in the response to its label',
				routing: { send: { type: 'query', property: '_labels', value: '={{ $value ? 1 : 0 }}' } },
			},
		],
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	{
		displayName: 'Form ID',
		name: 'searchFormId',
		type: 'string',
		default: '',
		description: 'Only entries of this form. Leave empty to search across all forms.',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
	},
	...offsetListProperties(resource, 'entries', {
		limitParameter: 'paging[page_size]',
		offsetParameter: 'paging[offset]',
	}),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		description: 'Conditions the entries have to meet, sent as the search argument',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'Only entries created at or before this moment, compared in UTC',
			},
			fieldFilterProperty,
			{
				displayName: 'Filter Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Match All', value: 'all' },
					{ name: 'Match Any', value: 'any' },
				],
				default: 'all',
				description: 'Whether an entry has to meet every field filter or just one of them',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Only entries created at or after this moment, compared in UTC',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: statusOptions,
				default: 'active',
				description:
					'Gravity Forms defaults to active, so trashed entries stay out unless asked for',
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'collection',
		placeholder: 'Add Sort Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'ASC' },
					{ name: 'Descending', value: 'DESC' },
					{ name: 'Random', value: 'RAND' },
				],
				default: 'DESC',
				routing: { send: { type: 'query', property: 'sorting[direction]' } },
			},
			{
				displayName: 'Is Numeric',
				name: 'is_numeric',
				type: 'boolean',
				default: false,
				description:
					'Whether the values behind the sort key are numbers, which changes their order',
				routing: {
					send: { type: 'query', property: 'sorting[is_numeric]', value: '={{ $value ? 1 : 0 }}' },
				},
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: 'id',
				placeholder: 'date_created',
				description: 'Entry column or field ID to sort by',
				routing: { send: { type: 'query', property: 'sorting[key]' } },
			},
		],
	},
	{
		displayName: 'Entry IDs',
		name: 'include',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Entry ID' },
		default: [],
		description:
			'Return these entries only. An ID that does not exist is skipped without an error.',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'include' } },
	},

	// ─── Send Notifications ────────────────────────────────────────────────────
	{
		displayName: 'Notification Options',
		name: 'notificationOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['sendNotifications'] } },
		options: [
			{
				displayName: 'Event',
				name: '_event',
				type: 'string',
				default: 'form_submission',
				description: 'Which event the notifications are sent for',
				routing: { send: { type: 'body', property: '_event' } },
			},
			{
				displayName: 'Notification IDs',
				name: '_notifications',
				type: 'string',
				default: '',
				placeholder: '64f23a145de7b,64f8e7b9abaea',
				description:
					'Comma-separated list of notifications to send. Leave empty to send every notification configured for the event.',
				routing: { send: { type: 'body', property: '_notifications' } },
			},
		],
	},

	// ─── Delete ────────────────────────────────────────────────────────────────
	{
		displayName: 'Permanently Delete',
		name: 'force',
		type: 'boolean',
		default: false,
		description:
			'Whether to delete the entry for good. Off moves it to the trash, and repeating that answers 410.',
		displayOptions: { show: { ...show, operation: ['delete'] } },
		routing: { send: { type: 'query', property: 'force', value: '={{ $value ? 1 : 0 }}' } },
	},
];
