import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { clientLimitProperties } from '../../../shared/pagination';
import {
	CRM,
	additionalFieldsProperty,
	personIdProperty,
	recordIdProperty,
	referenceOptions,
	versionProperty,
} from '../../shared/descriptions';

const resource = 'task';
const show = { resource: [resource] };

/**
 * Tasks — the reminders and follow-ups sitting on a person.
 *
 * The three operations do not share a path or a schema, which is why this resource
 * has no shared field list:
 *
 *   GET    /people/{id}/tasks           list
 *   POST   /people/{id}/task            create, body `Remainder` (singular path)
 *   PATCH  /people/{id}/task/{taskId}   update, body `PersonTask`
 *
 * The two write schemas disagree on three field names for the same thing —
 * `emai_list` vs `emailList`, `time_unit` vs `unit`, `description` vs `text`. Those
 * are the API's spellings, not typos introduced here, and each operation sends the
 * one its own endpoint expects.
 *
 * There is no delete: a task is closed by setting its state, not by removing it.
 */
const stateOptions = [
	{ name: 'STATE_B', value: 'STATE_B' },
	{ name: 'STATE_I', value: 'STATE_I' },
	{ name: 'STATE_O', value: 'STATE_O' },
	{ name: 'STATE_W', value: 'STATE_W' },
	{ name: 'STATE_Z', value: 'STATE_Z' },
];

const stateDescription =
	'Processing state of the task. The API documents the codes but not what each stands for, so they are offered as-is — the funtrade task list shows which is which for your instance.';

export const taskDescription: INodeProperties[] = [
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
				action: 'Create a task',
				routing: {
					request: { method: 'POST', url: `=${CRM}/people/{{$parameter.personId}}/task` },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many tasks',
				routing: {
					request: { method: 'GET', url: `=${CRM}/people/{{$parameter.personId}}/tasks` },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a task',
				routing: {
					request: {
						method: 'PATCH',
						url: `=${CRM}/people/{{$parameter.personId}}/task/{{$parameter.taskId}}`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'getAll',
	},

	personIdProperty(resource, ['getAll', 'create', 'update']),
	recordIdProperty('taskId', 'Task ID', resource, ['update']),

	...clientLimitProperties(resource),

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Task Type Name or ID',
		name: 'task_typ',
		type: 'options',
		typeOptions: referenceOptions('tasktypes', 'type', 'description'),
		default: '',
		required: true,
		description:
			'Which kind of task this is. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'task_typ' } },
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				description: 'When the task is due',
				routing: { send: { type: 'body', property: 'date' } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Title of the task, sent as description on create',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Email List',
				name: 'emai_list',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description:
					'Who is notified about the task. The create endpoint spells the field emai_list, and the node sends it exactly as spelled.',
				routing: { send: { type: 'body', property: 'emai_list' } },
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				default: 0,
				description: 'How many time units apart a repeating task recurs',
				routing: { send: { type: 'body', property: 'interval' } },
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'note' } },
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				type: 'options',
				typeOptions: referenceOptions('users', 'user_id', 'user_name'),
				default: '',
				description:
					'Funtrade user the task belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'owner' } },
			},
			{
				displayName: 'Priority Name or ID',
				name: 'priority',
				type: 'options',
				typeOptions: referenceOptions('taskPriority', 'priority', 'description'),
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'priority' } },
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: stateOptions,
				default: 'STATE_O',
				description: stateDescription,
				routing: { send: { type: 'body', property: 'state' } },
			},
			{
				displayName: 'Time Unit Name or ID',
				name: 'time_unit',
				type: 'options',
				typeOptions: referenceOptions('taskTimeUnit', 'time_unit', 'description'),
				default: '',
				description:
					'Unit the interval counts in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'time_unit' } },
			},
			{
				displayName: 'To Date',
				name: 'to_date',
				type: 'dateTime',
				default: '',
				description: 'End of the window a repeating task runs in',
				routing: { send: { type: 'body', property: 'to_date' } },
			},
		],
	},

	// ─── Update ────────────────────────────────────────────────────────────────
	versionProperty(resource, ['update']),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Only the fields you add are sent, and only those change',
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: [
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				description: 'When the task is due',
				routing: { send: { type: 'body', property: 'date' } },
			},
			{
				displayName: 'Email List',
				name: 'emailList',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description:
					'Who is notified about the task. The update endpoint spells the field emailList, unlike the create endpoint.',
				routing: { send: { type: 'body', property: 'emailList' } },
			},
			{
				displayName: 'Info',
				name: 'info',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'info' } },
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				default: 0,
				description: 'How many time units apart a repeating task recurs',
				routing: { send: { type: 'body', property: 'interval' } },
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'note' } },
			},
			{
				displayName: 'Organisational Unit Name or ID',
				name: 'organisational_unit_code',
				type: 'options',
				typeOptions: referenceOptions(
					'organisationunits',
					'organisational_unit_code',
					'organisational_unit',
				),
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'organisational_unit_code' } },
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				type: 'options',
				typeOptions: referenceOptions('users', 'user_id', 'user_name'),
				default: '',
				description:
					'Funtrade user the task belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'owner' } },
			},
			{
				displayName: 'Priority Name or ID',
				name: 'priority',
				type: 'options',
				typeOptions: referenceOptions('taskPriority', 'priority', 'description'),
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'priority' } },
			},
			{
				displayName: 'Processed',
				name: 'processed',
				type: 'boolean',
				default: false,
				description: 'Whether the task has been dealt with',
				routing: { send: { type: 'body', property: 'processed' } },
			},
			{
				displayName: 'Repeatedly',
				name: 'repeatedly',
				type: 'boolean',
				default: false,
				description: 'Whether the task recurs on the interval below',
				routing: { send: { type: 'body', property: 'repeatedly' } },
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: stateOptions,
				default: 'STATE_O',
				description: stateDescription,
				routing: { send: { type: 'body', property: 'state' } },
			},
			{
				displayName: 'Task Type Name or ID',
				name: 'task_typ',
				type: 'options',
				typeOptions: referenceOptions('tasktypes', 'type', 'description'),
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'task_typ' } },
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'Title of the task, which the create endpoint calls description',
				routing: { send: { type: 'body', property: 'text' } },
			},
			{
				displayName: 'Time Unit Name or ID',
				name: 'unit',
				type: 'options',
				typeOptions: referenceOptions('taskTimeUnit', 'time_unit', 'description'),
				default: '',
				description:
					'Unit the interval counts in. The update endpoint spells the field unit, unlike the create endpoint. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'unit' } },
			},
		],
	},

	additionalFieldsProperty(
		resource,
		['create', 'update'],
		'Extra keys merged into the request body, for fields the node does not model and for sending an explicit null',
	),
];
