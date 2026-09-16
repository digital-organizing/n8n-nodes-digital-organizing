import type { INodeProperties } from 'n8n-workflow';
import { customParametersProperty, listProperties, uuidProperty } from '../../shared/descriptions';

const resource = 'supporter';
const show = { resource: [resource] };

/**
 * Supporter Store — https://docs.raisenow.com/api
 *
 * Create and update take the same field set, so it is defined once and reused:
 * on create the fields sit in an optional collection next to the required
 * organisation UUID, on update the collection is the whole payload.
 */
const supporterFields: INodeProperties[] = [
	{
		displayName: 'Address Addendum',
		name: 'address_addendum',
		type: 'string',
		default: '',
		description: 'Additional address line, e.g. building name and floor',
		routing: { send: { type: 'body', property: 'address_addendum' } },
	},
	{
		displayName: 'Birth Day',
		name: 'birth_day',
		type: 'string',
		default: '',
		placeholder: '15',
		description: 'Day part of the birth date',
		routing: { send: { type: 'body', property: 'birth_day' } },
	},
	{
		displayName: 'Birth Month',
		name: 'birth_month',
		type: 'string',
		default: '',
		placeholder: '12',
		description: 'Month part of the birth date',
		routing: { send: { type: 'body', property: 'birth_month' } },
	},
	{
		displayName: 'Birth Year',
		name: 'birth_year',
		type: 'string',
		default: '',
		placeholder: '1975',
		description: 'Year part of the birth date',
		routing: { send: { type: 'body', property: 'birth_year' } },
	},
	{
		displayName: 'Care Of',
		name: 'care_of',
		type: 'string',
		default: '',
		description: 'The c/o field',
		routing: { send: { type: 'body', property: 'care_of' } },
	},
	{
		displayName: 'City',
		name: 'city',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'city' } },
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		placeholder: 'CH',
		description: 'Country in ISO-3166 alpha-2, two uppercase letters',
		routing: { send: { type: 'body', property: 'country' } },
	},
	customParametersProperty(),
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'first_name' } },
	},
	{
		displayName: 'Honorific Prefix',
		name: 'honorific_prefix',
		type: 'string',
		default: '',
		placeholder: 'Prof.',
		routing: { send: { type: 'body', property: 'honorific_prefix' } },
	},
	{
		displayName: 'House Number',
		name: 'house_number',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'house_number' } },
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'last_name' } },
	},
	{
		displayName: 'Legal Entity',
		name: 'legal_entity',
		type: 'string',
		default: '',
		description: 'Company name, for supporters that are organisations',
		routing: { send: { type: 'body', property: 'legal_entity' } },
	},
	{
		displayName: 'Locale',
		name: 'locale',
		type: 'string',
		default: '',
		placeholder: 'de_CH',
		routing: { send: { type: 'body', property: 'locale' } },
	},
	{
		displayName: 'Middle Name',
		name: 'middle_name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'middle_name' } },
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'phone' } },
	},
	{
		displayName: 'Post Office Box',
		name: 'post_office_box',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'post_office_box' } },
	},
	{
		displayName: 'Postal Code',
		name: 'postal_code',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'postal_code' } },
	},
	{
		displayName: 'Raw',
		name: 'raw',
		type: 'string',
		default: '',
		description: 'Unstructured supporter details, when no parsed address is available',
		routing: { send: { type: 'body', property: 'raw' } },
	},
	{
		displayName: 'Raw Address',
		name: 'raw_address',
		type: 'string',
		default: '',
		description: 'Unstructured address',
		routing: { send: { type: 'body', property: 'raw_address' } },
	},
	{
		displayName: 'Raw Name',
		name: 'raw_name',
		type: 'string',
		default: '',
		description: 'Unstructured supporter name',
		routing: { send: { type: 'body', property: 'raw_name' } },
	},
	{
		displayName: 'Region Level 1',
		name: 'region_level_1',
		type: 'string',
		default: '',
		description: 'Broader administrative region, e.g. canton, state or province',
		routing: { send: { type: 'body', property: 'region_level_1' } },
	},
	{
		displayName: 'Region Level 2',
		name: 'region_level_2',
		type: 'string',
		default: '',
		description: 'Narrower administrative region, e.g. district',
		routing: { send: { type: 'body', property: 'region_level_2' } },
	},
	{
		displayName: 'Salutation',
		name: 'salutation',
		type: 'string',
		default: '',
		placeholder: 'ms',
		routing: { send: { type: 'body', property: 'salutation' } },
	},
	{
		displayName: 'Street',
		name: 'street',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'street' } },
	},
];

export const supporterDescription: INodeProperties[] = [
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
				action: 'Create a supporter',
				routing: { request: { method: 'POST', url: '/supporters' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a supporter',
				routing: {
					request: { method: 'GET', url: '=/supporters/{{$parameter.supporterUuid}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many supporters',
				routing: { request: { method: 'GET', url: '/supporters' } },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a supporter',
				routing: {
					request: { method: 'PATCH', url: '=/supporters/{{$parameter.supporterUuid}}' },
				},
			},
		],
		default: 'create',
	},

	uuidProperty(
		'Supporter UUID',
		'supporterUuid',
		resource,
		['get', 'update'],
		'The identifier of the supporter',
	),

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Organisation UUID',
		name: 'organisationUuid',
		type: 'string',
		default: '',
		required: true,
		description: 'UUID of the organisation the supporter belongs to',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'organisation_uuid' } },
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: supporterFields,
	},

	// ─── Update ────────────────────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: supporterFields,
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	...listProperties(resource),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Offset',
				name: 'from',
				type: 'number',
				default: 0,
				description: 'Starting point for pagination. Ignored when Return All is on.',
				routing: { send: { type: 'query', property: 'from' } },
			},
			{
				displayName: 'Organisation UUID',
				name: 'organisation_uuid',
				type: 'string',
				default: '',
				description: 'Return only supporters of this organisation',
				routing: { send: { type: 'query', property: 'organisation_uuid' } },
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'string',
				default: '',
				placeholder: 'created',
				description: 'Field to sort on',
				routing: { send: { type: 'query', property: 'sort_by' } },
			},
			{
				displayName: 'Sort Order',
				name: 'sort_order',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
				routing: { send: { type: 'query', property: 'sort_order' } },
			},
		],
	},
];
