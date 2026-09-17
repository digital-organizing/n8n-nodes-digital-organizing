import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { clientLimitProperties } from '../../../shared/pagination';
import {
	CRM,
	additionalFieldsProperty,
	personIdProperty,
	qualityOverridesProperty,
	recordIdProperty,
	referenceOptions,
	versionProperty,
} from '../../shared/descriptions';

const resource = 'address';
const show = { resource: [resource] };
const writes = ['create', 'update'];

/**
 * Addresses — `/crmapi/people/{id}/addresses`.
 *
 * "Address" covers both halves of funtrade's address book: a postal address and a
 * telecommunication address (phone, email) are the same record type, told apart by
 * Address Type. Which types exist is per instance, hence the reference list.
 *
 * These are the writes the data-quality checks bite on hardest — the ZIP has to
 * exist, the street has to exist at that ZIP, the house number in that street.
 */
const addressFields: INodeProperties[] = [
	{
		displayName: 'Address Addition',
		name: 'address_addition',
		type: 'string',
		default: '',
		placeholder: 'c/o Maria Muster',
		routing: { send: { type: 'body', property: 'address_addition' } },
	},
	{
		displayName: 'Address Entry',
		name: 'address_entry',
		type: 'string',
		default: '',
		description:
			'The value itself for a telecommunication address — the phone number or email address',
		routing: { send: { type: 'body', property: 'address_entry' } },
	},
	{
		displayName: 'Address Type Name or ID',
		name: 'address_type',
		type: 'options',
		typeOptions: referenceOptions('addresstypes', 'address_type', 'description'),
		default: '',
		description:
			'Which kind of address this is. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'address_type' } },
	},
	{
		displayName: 'City',
		name: 'city',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'city' } },
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'comment' } },
	},
	{
		displayName: 'Country Name or ID',
		name: 'country',
		type: 'options',
		typeOptions: referenceOptions('countries', 'country', 'country'),
		default: '',
		description:
			'Country by name, which is what this field stores — the country code lives elsewhere. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'country' } },
	},
	{
		displayName: 'Is PO Box',
		name: 'is_po_box',
		type: 'boolean',
		default: false,
		description: 'Whether the address is a PO box rather than a street address',
		routing: { send: { type: 'body', property: 'is_po_box' } },
	},
	{
		displayName: 'Is Standard Address',
		name: 'is_standard_address',
		type: 'boolean',
		default: false,
		description: 'Whether this is the address correspondence goes to',
		routing: { send: { type: 'body', property: 'is_standard_address' } },
	},
	{
		displayName: 'PO Box',
		name: 'po_box',
		type: 'string',
		default: '',
		placeholder: 'Postfach 123',
		routing: { send: { type: 'body', property: 'po_box' } },
	},
	{
		displayName: 'PO Box City',
		name: 'po_box_city',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'po_box_city' } },
	},
	{
		displayName: 'PO Box Postal Code',
		name: 'po_box_postal_code',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'po_box_postal_code' } },
	},
	{
		displayName: 'PO Box Postal Code Addition',
		name: 'po_box_postal_code_addition',
		type: 'number',
		default: 0,
		routing: { send: { type: 'body', property: 'po_box_postal_code_addition' } },
	},
	{
		displayName: 'Postal Code',
		name: 'postal_code',
		type: 'string',
		default: '',
		placeholder: '8000',
		routing: { send: { type: 'body', property: 'postal_code' } },
	},
	{
		displayName: 'Postal Code Addition',
		name: 'postal_code_addition',
		type: 'number',
		default: 0,
		description:
			'The two-digit suffix that disambiguates a Swiss postal code, as in 8000 for the code and 26 for the addition',
		routing: { send: { type: 'body', property: 'postal_code_addition' } },
	},
	{
		displayName: 'Street',
		name: 'street',
		type: 'string',
		default: '',
		description: 'Street name without the house number',
		routing: { send: { type: 'body', property: 'street' } },
	},
	{
		displayName: 'Street Number',
		name: 'street_number',
		type: 'string',
		default: '',
		placeholder: '12a',
		routing: { send: { type: 'body', property: 'street_number' } },
	},
	{
		displayName: 'Valid From',
		name: 'valid_from',
		type: 'string',
		default: '',
		placeholder: '2026-01-01',
		routing: { send: { type: 'body', property: 'valid_from' } },
	},
	{
		displayName: 'Valid To',
		name: 'valid_to',
		type: 'string',
		default: '',
		placeholder: '2026-12-31',
		routing: { send: { type: 'body', property: 'valid_to' } },
	},
];

export const addressDescription: INodeProperties[] = [
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
				action: 'Create an address',
				routing: {
					request: { method: 'POST', url: `=${CRM}/people/{{$parameter.personId}}/addresses` },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an address',
				routing: {
					request: {
						method: 'DELETE',
						url: `=${CRM}/people/{{$parameter.personId}}/addresses/{{$parameter.addressId}}`,
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many addresses',
				routing: {
					request: { method: 'GET', url: `=${CRM}/people/{{$parameter.personId}}/addresses` },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an address',
				routing: {
					request: {
						method: 'PATCH',
						url: `=${CRM}/people/{{$parameter.personId}}/addresses/{{$parameter.addressId}}`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'getAll',
	},

	personIdProperty(resource, ['getAll', 'create', 'update', 'delete']),
	recordIdProperty('addressId', 'Address ID', resource, ['update', 'delete']),

	// ─── Get Many ──────────────────────────────────────────────────────────────
	...clientLimitProperties(resource),
	{
		displayName: 'Query',
		name: 'query',
		type: 'options',
		options: [
			{ name: 'Active', value: 'active' },
			{ name: 'Alternative', value: 'alternative' },
			{ name: 'Default', value: 'default' },
			{ name: 'Standard', value: 'standard' },
		],
		default: 'active',
		description: 'Which slice of the address book to return',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'query' } },
	},

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: addressFields,
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
		options: addressFields,
	},

	// ─── Both writes ───────────────────────────────────────────────────────────
	qualityOverridesProperty(resource, writes, [
		{
			name: 'qc_contact_change',
			displayName: 'Accept Contact Change',
			description: 'Whether to apply the change even though it also moves a linked contact',
		},
		{
			name: 'qc_household_change',
			displayName: 'Accept Household Change',
			description: 'Whether to apply the change even though it also moves the household',
		},
		{
			name: 'qc_publication_email',
			displayName: 'Accept Publication Email',
			description: 'Whether to keep the email even though a publication is delivered to it',
		},
		{
			name: 'qc_raisenow_email',
			displayName: 'Accept RaiseNow Email',
			description: 'Whether to keep the email even though RaiseNow uses it',
		},
		{
			name: 'qc_recorrect_domain',
			displayName: 'Accept Domain',
			description:
				'Whether to keep the email domain as given even though funtrade reads it as wrong',
		},
		{
			name: 'qc_recorrect_person',
			displayName: 'Accept Person',
			description: 'Whether to keep the person as given even though funtrade reads it as wrong',
		},
		{
			name: 'qc_recorrect_telecom_format',
			displayName: 'Accept Telecom Format',
			description:
				'Whether to keep the phone number in the format given rather than reformatting it',
		},
	]),
	additionalFieldsProperty(
		resource,
		writes,
		'Extra keys merged into the request body, for fields of the PersonAddressEdit schema this node does not model and for sending an explicit null',
	),
];
