import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { clientLimitProperties } from '../../../shared/pagination';
import { GF, splitFormsById } from '../../shared/descriptions';

const resource = 'form';
const show = { resource: [resource] };

/**
 * Forms — `/forms` and `/forms/[FORM_ID]`.
 *
 * A form is one large JSON object: title, settings, notifications, confirmations
 * and the field definitions. The node does not model it field by field; create
 * and update take the object as JSON, which is how it comes out of Get anyway.
 *
 * Reading forms needs `gravityforms_edit_forms`, writing them needs
 * `gravityforms_create_form` — a key that may only read entries cannot list forms.
 */
export const formDescription: INodeProperties[] = [
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
				action: 'Create a form',
				routing: {
					request: { method: 'POST', url: `${GF}/forms` },
					send: { preSend: [mergeJsonBody('form', 'Form')] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a form',
				routing: { request: { method: 'DELETE', url: `=${GF}/forms/{{$parameter.formId}}` } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a form',
				routing: { request: { method: 'GET', url: `=${GF}/forms/{{$parameter.formId}}` } },
			},
			{
				name: 'Get Field Filters',
				value: 'getFieldFilters',
				action: 'Get the field filters of a form',
				routing: {
					request: { method: 'GET', url: `=${GF}/forms/{{$parameter.formId}}/field-filters` },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many forms',
				routing: {
					// PHP wants `include[]=1&include[]=2`, which is not the default
					// serialisation of an array parameter.
					request: { method: 'GET', url: `${GF}/forms`, arrayFormat: 'brackets' },
					output: { postReceive: [splitFormsById] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a form',
				routing: {
					request: { method: 'PUT', url: `=${GF}/forms/{{$parameter.formId}}` },
					send: { preSend: [mergeJsonBody('form', 'Form')] },
				},
			},
		],
		default: 'getAll',
	},

	{
		displayName: 'Form ID',
		name: 'formId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the form, as shown in the Gravity Forms admin',
		displayOptions: {
			show: { ...show, operation: ['get', 'update', 'delete', 'getFieldFilters'] },
		},
	},

	// ─── Create and Update ─────────────────────────────────────────────────────
	{
		displayName:
			'Update replaces the whole form object — send what Get returned, changed, rather than only the properties you want to touch.',
		name: 'updateNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { ...show, operation: ['update'] } },
	},
	{
		displayName: 'Form',
		name: 'form',
		type: 'json',
		default: '{\n  "title": "",\n  "fields": []\n}',
		required: true,
		description:
			'The form object. Title and fields are required on create; the ID property is assigned by Gravity Forms and should not be set.',
		displayOptions: { show: { ...show, operation: ['create', 'update'] } },
	},

	// ─── Get ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...show, operation: ['getFieldFilters'] } },
		options: [
			{
				displayName: 'Admin Labels',
				name: '_admin_labels',
				type: 'boolean',
				default: false,
				description: 'Whether to label the filters with the admin labels of the fields, where set',
				routing: {
					send: { type: 'query', property: '_admin_labels', value: '={{ $value ? 1 : 0 }}' },
				},
			},
		],
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	{
		displayName:
			'Without Form IDs this answers with ID, title and entry count per form. Name the forms you want to get their full definition.',
		name: 'getAllNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
	},
	{
		displayName: 'Form IDs',
		name: 'include',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Form ID' },
		default: [],
		description:
			'Return the full form object of these forms only. Leave empty for a summary of all.',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'include' } },
	},
	...clientLimitProperties(resource),

	// ─── Delete ────────────────────────────────────────────────────────────────
	{
		displayName: 'Permanently Delete',
		name: 'force',
		type: 'boolean',
		default: false,
		description:
			'Whether to delete the form and its entries for good. Off moves it to the trash, and repeating that answers 410.',
		displayOptions: { show: { ...show, operation: ['delete'] } },
		routing: { send: { type: 'query', property: 'force', value: '={{ $value ? 1 : 0 }}' } },
	},
];
