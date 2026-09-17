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

const resource = 'pledge';
const show = { resource: [resource] };
const writes = ['create', 'update'];

/**
 * Pledges — `/crmapi/people/{id}/pledges`, the "Zusagen" of the funtrade UI: a
 * membership, a standing order, a recurring donation commitment.
 *
 * The PersonPledge schema is by far the widest in this API — around seventy fields
 * covering dunning levels, revocations, master pledges and payment history, most of
 * which funtrade maintains itself. What is modelled here is the part a workflow
 * sets when it books a pledge; everything else goes through Additional Fields.
 *
 * The card fields (`credit_card_number` and friends) are deliberately not modelled:
 * they are reachable through Additional Fields, but nothing should push card data
 * into a workflow parameter by default.
 *
 * Ending a pledge is its own operation. Delete removes the record; Exit keeps it and
 * records that the person left, which is what you almost always want.
 */
const pledgeFields: INodeProperties[] = [
	{
		displayName: 'Acquisition Date',
		name: 'acquisition_date',
		type: 'string',
		default: '',
		placeholder: '2026-01-01',
		description: 'When the pledge was won',
		routing: { send: { type: 'body', property: 'acquisition_date' } },
	},
	{
		displayName: 'Acquisition Interaction',
		name: 'acquisition_interaction',
		type: 'string',
		default: '',
		description: 'Identifier of the interaction the pledge came out of',
		routing: { send: { type: 'body', property: 'acquisition_interaction' } },
	},
	{
		displayName: 'Acquisition Interaction Channel Name or ID',
		name: 'acquisition_interaction_channel',
		type: 'options',
		typeOptions: referenceOptions('channels', 'channel', 'description'),
		default: '',
		description:
			'Channel of that interaction. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'acquisition_interaction_channel' } },
	},
	{
		displayName: 'Acquisition Source',
		name: 'acquisition_source',
		type: 'string',
		default: '',
		description: 'Where the pledge came from, in the instance own source coding',
		routing: { send: { type: 'body', property: 'acquisition_source' } },
	},
	{
		displayName: 'Bank Account',
		name: 'bank_account',
		type: 'string',
		default: '',
		placeholder: 'CH93 0076 2011 6238 5295 7',
		routing: { send: { type: 'body', property: 'bank_account' } },
	},
	{
		displayName: 'Bank Name',
		name: 'bank_name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'bank_name' } },
	},
	{
		displayName: 'Charge From',
		name: 'charge_from',
		type: 'string',
		default: '',
		placeholder: '2026-01-01',
		description: 'Date the first invoice is raised from',
		routing: { send: { type: 'body', property: 'charge_from' } },
	},
	{
		displayName: 'Default Amount',
		name: 'default_amount',
		type: 'number',
		default: 0,
		description: 'Amount per payment, not per year',
		routing: { send: { type: 'body', property: 'default_amount' } },
	},
	{
		displayName: 'ESR Payment Slip Channel',
		name: 'esr_payment_slip_channel',
		type: 'options',
		options: [
			{ name: 'Email', value: 'ESR_CHANNEL_E_MAIL' },
			{ name: 'Not Set', value: 'ESR_CHANNEL_EMPTY' },
		],
		default: 'ESR_CHANNEL_EMPTY',
		description: 'How the payment slip reaches the person',
		routing: { send: { type: 'body', property: 'esr_payment_slip_channel' } },
	},
	{
		displayName: 'External Membership Number',
		name: 'external_memberschip_number',
		type: 'number',
		default: 0,
		description:
			'Membership number from a system outside funtrade. The API spells the field external_memberschip_number, and the node sends it exactly as spelled.',
		routing: { send: { type: 'body', property: 'external_memberschip_number' } },
	},
	{
		displayName: 'Institution ID',
		name: 'institution_id',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'institution_id' } },
	},
	{
		displayName: 'Invoiced Annual Amount',
		name: 'invoiced_annual_amount',
		type: 'number',
		default: 0,
		routing: { send: { type: 'body', property: 'invoiced_annual_amount' } },
	},
	{
		displayName: 'Is Master Pledge',
		name: 'is_master_pledge',
		type: 'boolean',
		default: false,
		description: 'Whether other pledges are billed together with this one',
		routing: { send: { type: 'body', property: 'is_master_pledge' } },
	},
	{
		displayName: 'Payment Mode',
		name: 'payment_mode',
		type: 'string',
		default: '',
		description: 'Payment mode code as configured in the instance',
		routing: { send: { type: 'body', property: 'payment_mode' } },
	},
	{
		displayName: 'Payments Per Year',
		name: 'payment_number_per_year',
		type: 'options',
		options: [
			{ name: 'Every Two Months (6)', value: 'NUMBER_6' },
			{ name: 'Half-Yearly (2)', value: 'NUMBER_2' },
			{ name: 'Monthly (12)', value: 'NUMBER_12' },
			{ name: 'None (0)', value: 'NUMBER_0' },
			{ name: 'Quarterly (4)', value: 'NUMBER_4' },
			{ name: 'Yearly (1)', value: 'NUMBER_1' },
		],
		default: 'NUMBER_1',
		routing: { send: { type: 'body', property: 'payment_number_per_year' } },
	},
	{
		displayName: 'Pledge',
		name: 'pledge',
		type: 'string',
		default: '',
		description: 'Pledge code as configured in the instance, e.g. the membership category',
		routing: { send: { type: 'body', property: 'pledge' } },
	},
	{
		displayName: 'Pledge Description',
		name: 'pledge_description',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'pledge_description' } },
	},
	{
		displayName: 'Pledge Type',
		name: 'pledge_type',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'pledge_type' } },
	},
	{
		displayName: 'Postal Account',
		name: 'postal_account',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'postal_account' } },
	},
	{
		displayName: 'Region Code',
		name: 'region_code',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'region_code' } },
	},
	{
		displayName: 'Region Group',
		name: 'region_group',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'region_group' } },
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
	{
		displayName: 'Validity Code',
		name: 'validity_code',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'validity_code' } },
	},
];

export const pledgeDescription: INodeProperties[] = [
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
				action: 'Create a pledge',
				routing: {
					request: { method: 'POST', url: `=${CRM}/people/{{$parameter.personId}}/pledges` },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a pledge',
				routing: {
					request: {
						method: 'DELETE',
						url: `=${CRM}/people/{{$parameter.personId}}/pledges/{{$parameter.pledgeId}}`,
					},
				},
			},
			{
				name: 'Exit',
				value: 'exit',
				action: 'Exit a pledge',
				routing: {
					request: {
						method: 'POST',
						url: `=${CRM}/people/{{$parameter.personId}}/pledges/{{$parameter.pledgeId}}/exit`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many pledges',
				routing: {
					request: { method: 'GET', url: `=${CRM}/people/{{$parameter.personId}}/pledges` },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a pledge',
				routing: {
					request: {
						method: 'PATCH',
						url: `=${CRM}/people/{{$parameter.personId}}/pledges/{{$parameter.pledgeId}}`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'getAll',
	},

	personIdProperty(resource, ['getAll', 'create', 'update', 'delete', 'exit']),
	recordIdProperty('pledgeId', 'Pledge ID', resource, ['update', 'delete', 'exit']),

	...clientLimitProperties(resource),

	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: pledgeFields,
	},

	versionProperty(resource, ['update']),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Only the fields you add are sent, and only those change',
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: pledgeFields,
	},

	// ─── Exit ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		options: [
			{ name: 'ACTION_L', value: 'ACTION_L' },
			{ name: 'ACTION_S', value: 'ACTION_S' },
		],
		default: 'ACTION_S',
		required: true,
		description:
			'Which kind of exit funtrade records. The API documents the two codes but not what each stands for — check with funtrade support which one your process needs before wiring this into a live workflow.',
		displayOptions: { show: { ...show, operation: ['exit'] } },
		routing: { send: { type: 'body', property: 'action' } },
	},
	{
		displayName: 'Exit Fields',
		name: 'exitFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['exit'] } },
		options: [
			{
				displayName: 'Channel Name or ID',
				name: 'channel',
				type: 'options',
				typeOptions: referenceOptions('channels', 'channel', 'description'),
				default: '',
				description:
					'How the exit reached you. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'channel' } },
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				description: 'When the person left',
				routing: { send: { type: 'body', property: 'date' } },
			},
			{
				displayName: 'Interaction',
				name: 'interaction',
				type: 'string',
				default: '',
				description: 'Identifier of the interaction the exit came out of',
				routing: { send: { type: 'body', property: 'interaction' } },
			},
			{
				displayName: 'Interaction Position',
				name: 'interaction_position',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'interaction_position' } },
			},
			{
				displayName: 'Interaction Type Name or ID',
				name: 'interaction_type',
				type: 'options',
				typeOptions: referenceOptions('interactiontypes', 'interaction_type', 'description'),
				default: '',
				description:
					'Type of that interaction. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'interaction_type' } },
			},
			{
				displayName: 'Reactivate',
				name: 'ui_reactivate',
				type: 'boolean',
				default: false,
				description: 'Whether funtrade reactivates the pledge rather than ending it',
				routing: { send: { type: 'body', property: 'ui_reactivate' } },
			},
		],
	},

	// ─── Writes ────────────────────────────────────────────────────────────────
	qualityOverridesProperty(resource, writes, [
		{
			name: 'qc_raisenow_card',
			displayName: 'Accept RaiseNow Card',
			description: 'Whether to save the pledge even though its card is managed by RaiseNow',
		},
		{
			name: 'qc_valid_from',
			displayName: 'Accept Valid From',
			valueType: 'string',
			description:
				'Date to accept as Valid From even though funtrade reads it as implausible, as YYYY-MM-DD',
		},
	]),
	additionalFieldsProperty(
		resource,
		[...writes, 'exit'],
		'Extra keys merged into the request body. The PersonPledge schema has around seventy fields and this node models the common ones, so the rest — including the card fields — go here.',
	),
];
