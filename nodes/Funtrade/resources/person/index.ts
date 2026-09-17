import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { clientLimitProperties } from '../../../shared/pagination';
import {
	CRM,
	additionalFieldsProperty,
	qualityOverridesProperty,
	referenceOptions,
	versionProperty,
} from '../../shared/descriptions';

const resource = 'person';
const show = { resource: [resource] };
const writes = ['create', 'update'];

/**
 * People — `/crmapi/people`, the record everything else in this node hangs off.
 *
 * Search is the only way in without an ID, and it has no paging: it answers with
 * the full match list, so narrow it with the filters rather than fetching
 * everything. Passing no filter at all is accepted but not meaningful.
 *
 * Create and update share one schema (`PersonEdit`), so the field list is the same
 * for both; update is a PATCH, so only the fields you add are touched.
 */
const personFields: INodeProperties[] = [
	{
		displayName: 'Birth Day',
		name: 'birth_day',
		type: 'number',
		default: 0,
		description: 'Day of the month, stored separately so a partial birth date can be recorded',
		routing: { send: { type: 'body', property: 'birth_day' } },
	},
	{
		displayName: 'Birth Month',
		name: 'birth_month',
		type: 'number',
		default: 0,
		routing: { send: { type: 'body', property: 'birth_month' } },
	},
	{
		displayName: 'Birth Year',
		name: 'birth_year',
		type: 'number',
		default: 0,
		routing: { send: { type: 'body', property: 'birth_year' } },
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description: 'Organisation name, for records of type Organization',
		routing: { send: { type: 'body', property: 'company' } },
	},
	{
		displayName: 'Contact Of',
		name: 'contact_of',
		type: 'number',
		default: 0,
		description: 'Person number of the organisation this record is a contact of',
		routing: { send: { type: 'body', property: 'contact_of' } },
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'first_name' } },
	},
	{
		displayName: 'Is Standard Contact',
		name: 'is_standard_contact',
		type: 'boolean',
		default: false,
		description: 'Whether this is the main contact of the organisation it belongs to',
		routing: { send: { type: 'body', property: 'is_standard_contact' } },
	},
	{
		displayName: 'Language Name or ID',
		name: 'language_code',
		type: 'options',
		typeOptions: referenceOptions('languages', 'language_code', 'description'),
		default: '',
		description:
			'Correspondence language. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'language_code' } },
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'last_name' } },
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
			'Unit the record is filed under. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'organisational_unit_code' } },
	},
	{
		displayName: 'Person Type',
		name: 'person_type',
		type: 'options',
		options: [
			{ name: 'Contact', value: 'CONTACT' },
			{ name: 'Organization', value: 'ORGANIZATION' },
			{ name: 'Private', value: 'PRIVATE' },
		],
		default: 'PRIVATE',
		routing: { send: { type: 'body', property: 'person_type' } },
	},
	{
		displayName: 'Salutation Name or ID',
		name: 'salutation_code',
		type: 'options',
		typeOptions: referenceOptions('salutations', 'salutation_code', 'description'),
		default: '',
		description:
			'How the person is addressed in correspondence. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'salutation_code' } },
	},
	{
		displayName: 'Sex Code',
		name: 'sex_code',
		type: 'options',
		options: [
			{ name: 'Female', value: 'SEXCODE_FEMALE' },
			{ name: 'Male', value: 'SEXCODE_MALE' },
			{ name: 'Not Stated', value: 'SEXCODE_EMPTY' },
		],
		default: 'SEXCODE_EMPTY',
		routing: { send: { type: 'body', property: 'sex_code' } },
	},
	{
		displayName: 'Title Name or ID',
		name: 'title_code',
		type: 'options',
		typeOptions: referenceOptions('titles', 'title_code', 'title'),
		default: '',
		description:
			'Academic or professional title. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'title_code' } },
	},
];

export const personDescription: INodeProperties[] = [
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
				action: 'Create a person',
				routing: {
					request: { method: 'POST', url: `${CRM}/people` },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a person',
				routing: {
					request: { method: 'DELETE', url: `=${CRM}/people/{{$parameter.personId}}` },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a person',
				routing: {
					request: { method: 'GET', url: `=${CRM}/people/{{$parameter.personId}}` },
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search people',
				routing: {
					request: { method: 'GET', url: `${CRM}/people` },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a person',
				routing: {
					request: { method: 'PATCH', url: `=${CRM}/people/{{$parameter.personId}}` },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'search',
	},

	{
		displayName: 'Person ID',
		name: 'personId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Funtrade person number',
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},

	// ─── Search ────────────────────────────────────────────────────────────────
	...clientLimitProperties(resource, 'search'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		description:
			'Search criteria, combined by funtrade. Name and address fields match on a substring.',
		displayOptions: { show: { ...show, operation: ['search'] } },
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'Switzerland',
				description: 'Country name, not the country code',
				routing: { send: { type: 'query', property: 'country' } },
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'firstname' } },
			},
			{
				displayName: 'Last Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'name' } },
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'street' } },
			},
			{
				displayName: 'Telecommunication',
				name: 'telecommunication',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description: 'Matches any telecom address on the record: phone number, email and the rest',
				routing: { send: { type: 'query', property: 'telecommunication' } },
			},
			{
				displayName: 'ZIP and City',
				name: 'zipCity',
				type: 'string',
				default: '',
				placeholder: '8000 Zurich',
				description: 'Postal code, city, or both in one string',
				routing: { send: { type: 'query', property: 'zip-city' } },
			},
		],
	},

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: personFields,
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
		options: personFields,
	},

	// ─── Both writes ───────────────────────────────────────────────────────────
	qualityOverridesProperty(resource, writes, [
		{
			name: 'qc_correct_first_name',
			displayName: 'Accept First Name',
			description: 'Whether to keep the first name as given even though funtrade reads it as wrong',
		},
		{
			name: 'qc_correct_person',
			displayName: 'Accept Person',
			description: 'Whether to save the person even though funtrade flags the record itself',
		},
		{
			name: 'qc_create_attribute',
			displayName: 'Create Attribute',
			valueType: 'number',
			description: 'ID of an attribute to create alongside the person instead of erroring',
		},
		{
			name: 'qc_create_household',
			displayName: 'Create Household',
			description: 'Whether to create a household for the person instead of erroring',
		},
	]),
	additionalFieldsProperty(
		resource,
		writes,
		'Extra keys merged into the request body, for fields of the PersonEdit schema this node does not model and for sending an explicit null',
	),
];
