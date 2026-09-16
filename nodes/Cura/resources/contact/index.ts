import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';

const resource = 'contact';
const show = { resource: [resource] };

/**
 * Cura's inbound interface is a single endpoint: post a JSON payload and it lands
 * in the Cura inbox ("Postfach"), where a contact is created from it or an
 * existing one — matched on membership number or a person match — is extended.
 *
 * Every key is optional, so there are no required parameters here beyond the
 * payload itself. Keys Cura does not know are kept and shown in the inbox but do
 * not affect processing, which is what Additional Payload is for.
 *
 * https://www.cura-fundraising.ch/support/systemintegration-und-schnittstellen/daten-via-schnittstelle/
 */
export const contactDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send a contact to the inbox',
				routing: {
					request: { method: 'POST', url: '/api/latest/inbox/receiver/' },
					send: {
						preSend: [mergeJsonBody('additionalPayload', 'Additional Payload')],
					},
				},
			},
		],
		default: 'send',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'The payload keys Cura processes',
		displayOptions: { show },
		options: [
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'string',
				default: '',
				placeholder: '1970-01-01',
				description: 'Date of birth as YYYY-MM-DD',
				routing: { send: { type: 'body', property: 'birthday' } },
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				placeholder: 'Anfrage via Kontaktformular',
				description: 'Where this record came from, shown in the inbox',
				routing: { send: { type: 'body', property: 'comment' } },
			},
			{
				displayName: 'Country Code',
				name: 'country_code',
				type: 'string',
				default: '',
				placeholder: 'CH',
				description: 'Country in ISO-3166 alpha-2, two uppercase letters',
				routing: { send: { type: 'body', property: 'country_code' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Extra Salutation',
				name: 'extra_salutation',
				type: 'string',
				default: '',
				placeholder: 'Hey Maxi!',
				description: 'Free-form salutation used instead of the generated one',
				routing: { send: { type: 'body', property: 'extra_salutation' } },
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'first_name' } },
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				options: [
					{ name: 'Female', value: 'f' },
					{ name: 'Male', value: 'm' },
				],
				default: 'f',
				routing: { send: { type: 'body', property: 'gender' } },
			},
			{
				displayName: 'Info',
				name: 'info',
				type: 'string',
				default: '',
				description: 'Free text stored on the record',
				routing: { send: { type: 'body', property: 'info' } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'de',
				routing: { send: { type: 'body', property: 'language' } },
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'last_name' } },
			},
			{
				displayName: 'Locality',
				name: 'locality',
				type: 'string',
				default: '',
				placeholder: 'Basel',
				description: 'Town or city',
				routing: { send: { type: 'body', property: 'locality' } },
			},
			{
				displayName: 'Membership Number',
				name: 'membership_number',
				type: 'string',
				default: '',
				description:
					'Cura matches an existing contact on this before falling back to a person match',
				routing: { send: { type: 'body', property: 'membership_number' } },
			},
			{
				displayName: 'Organisation Name',
				name: 'organisation_name',
				type: 'string',
				default: '',
				description: 'Company name, for contacts that are organisations',
				routing: { send: { type: 'body', property: 'organisation_name' } },
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: '+41613311570',
				routing: { send: { type: 'body', property: 'phone' } },
			},
			{
				displayName: 'Postcode',
				name: 'postcode',
				type: 'string',
				default: '',
				placeholder: '4000',
				routing: { send: { type: 'body', property: 'postcode' } },
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				placeholder: 'Hauptstrasse 123',
				description: 'Street including house number',
				routing: { send: { type: 'body', property: 'street' } },
			},
			{
				displayName: 'Tags',
				name: 'cura_tags',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Tag' },
				default: [],
				description: 'Cura tags to set on the contact',
				routing: {
					send: {
						type: 'body',
						property: 'cura_tags',
						value: '={{ $value.join(",") }}',
					},
				},
			},
			{
				displayName: 'Use Personal Salutation',
				name: 'use_personal_salutation',
				type: 'options',
				options: [
					{ name: 'Yes', value: 'yes' },
					{ name: 'No', value: 'no' },
				],
				default: 'yes',
				description: 'Whether Cura addresses the contact personally',
				routing: { send: { type: 'body', property: 'use_personal_salutation' } },
			},
		],
	},
	{
		displayName: 'Key-Value Pairs',
		name: 'keyValuePairs',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Pair',
		default: {},
		description: 'Sent as the key_value_pairs object',
		displayOptions: { show },
		options: [
			{
				displayName: 'Pair',
				name: 'pair',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'key_value_pairs',
				value: '={{ Object.fromEntries(($value.pair || []).map((p) => [p.key, p.value])) }}',
			},
		},
	},
	{
		displayName: 'Create Donation Letter',
		name: 'createInvoice',
		type: 'boolean',
		default: false,
		description:
			'Whether to add the contact to a campaign and create a donation letter. The campaign must allow automatic QR invoices and automatic date changes.',
		displayOptions: { show },
		routing: {
			send: {
				type: 'body',
				property: 'create_invoice',
				value: '={{ $value ? "true" : "false" }}',
			},
		},
	},
	{
		displayName: 'Campaign ID',
		name: 'curaCampaignId',
		type: 'string',
		default: '',
		required: true,
		description: 'Cura campaign the contact is added to',
		displayOptions: { show: { ...show, createInvoice: [true] } },
		routing: { send: { type: 'body', property: 'cura_campaign_id' } },
	},
	{
		displayName: 'Additional Payload',
		name: 'additionalPayload',
		type: 'json',
		default: '{}',
		description:
			'Extra JSON keys merged into the payload. Cura keeps them visible in the inbox but ignores them when processing, unless support has built a rule for them.',
		displayOptions: { show },
	},
];
