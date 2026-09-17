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
} from '../../shared/descriptions';

const resource = 'interaction';
const show = { resource: [resource] };
const writes = ['create', 'refuse', 'respond'];

/**
 * Interactions — `/crmapi/people/{id}/interactions`, the contact history: a mailing
 * sent, a call made, a visit paid.
 *
 * There is no update. An interaction is a fact that happened, so it is corrected by
 * deleting and recording it again; what changes afterwards is its outcome, and that
 * is what the two extra operations write:
 *
 *   - Record Response — the person reacted, e.g. donated off the back of a mailing
 *   - Record Refusal  — the person declined, and should not be approached this way
 *
 * Both post to their own endpoint under the interaction, not to the interaction.
 */
export const interactionDescription: INodeProperties[] = [
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
				action: 'Create an interaction',
				routing: {
					request: { method: 'POST', url: `=${CRM}/people/{{$parameter.personId}}/interactions` },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an interaction',
				routing: {
					request: {
						method: 'DELETE',
						url: `=${CRM}/people/{{$parameter.personId}}/interactions/{{$parameter.interactionId}}`,
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many interactions',
				routing: {
					request: { method: 'GET', url: `=${CRM}/people/{{$parameter.personId}}/interactions` },
				},
			},
			{
				name: 'Record Refusal',
				value: 'refuse',
				action: 'Record a refusal for an interaction',
				routing: {
					request: {
						method: 'POST',
						url: `=${CRM}/people/{{$parameter.personId}}/interactions/{{$parameter.interactionId}}/refusee`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Record Response',
				value: 'respond',
				action: 'Record a response for an interaction',
				routing: {
					request: {
						method: 'POST',
						url: `=${CRM}/people/{{$parameter.personId}}/interactions/{{$parameter.interactionId}}/response`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'getAll',
	},

	personIdProperty(resource, ['getAll', 'create', 'delete', 'refuse', 'respond']),
	recordIdProperty('interactionId', 'Interaction ID', resource, ['delete', 'refuse', 'respond']),

	...clientLimitProperties(resource),

	// ─── Create ────────────────────────────────────────────────────────────────
	{
		displayName: 'Interaction',
		name: 'interaction',
		type: 'string',
		default: '',
		required: true,
		description:
			'Identifier of the funtrade interaction the contact belongs to — the mailing, campaign or action it was part of. This is a concrete interaction, not its type; the types behind /api/v1.0/crmapi/interactiontypes are what Interaction State draws on.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'interaction' } },
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
				displayName: 'Channel Name or ID',
				name: 'channel',
				type: 'options',
				typeOptions: referenceOptions('channels', 'channel', 'description'),
				default: '',
				description:
					'How the contact happened — post, phone, email. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'channel' } },
			},
			{
				displayName: 'Interaction Date',
				name: 'interaction_date',
				type: 'dateTime',
				default: '',
				description: 'When the contact happened. Defaults to now if left out.',
				routing: { send: { type: 'body', property: 'interaction_date' } },
			},
			{
				displayName: 'Interaction Position',
				name: 'interaction_position',
				type: 'string',
				default: '',
				description: 'Position within the interaction, for one that has several',
				routing: { send: { type: 'body', property: 'interaction_position' } },
			},
			{
				displayName: 'Interaction State Name or ID',
				name: 'interaction_state',
				type: 'options',
				typeOptions: referenceOptions('interactiontypes', 'interaction_state', 'description'),
				default: '',
				description:
					'State the interaction is recorded in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'interaction_state' } },
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: 0,
				description: 'Amount attached to the interaction, where it carries one',
				routing: { send: { type: 'body', property: 'value' } },
			},
		],
	},

	// ─── Record Refusal ────────────────────────────────────────────────────────
	{
		displayName: 'Refusal Fields',
		name: 'refusalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['refuse'] } },
		options: [
			{
				displayName: 'Interaction Date',
				name: 'interaction_date',
				type: 'dateTime',
				default: '',
				description: 'When the refusal came in',
				routing: { send: { type: 'body', property: 'interaction_date' } },
			},
			{
				displayName: 'Interaction State Name or ID',
				name: 'interaction_state',
				type: 'options',
				typeOptions: referenceOptions('interactiontypes', 'interaction_state', 'description'),
				default: '',
				description:
					'State to record the refusal under. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'interaction_state' } },
			},
		],
	},

	// ─── Record Response ───────────────────────────────────────────────────────
	{
		displayName: 'Response Fields',
		name: 'responseFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['respond'] } },
		options: [
			{
				displayName: 'Interaction Date',
				name: 'interaction_date',
				type: 'dateTime',
				default: '',
				description: 'When the response came in',
				routing: { send: { type: 'body', property: 'interaction_date' } },
			},
		],
	},

	// ─── Writes ────────────────────────────────────────────────────────────────
	qualityOverridesProperty(
		resource,
		['create'],
		[
			{
				name: 'qc_thank_you',
				displayName: 'Skip Thank You Check',
				description:
					'Whether to record the interaction even though a thank-you is still outstanding',
			},
		],
	),
	qualityOverridesProperty(
		resource,
		['refuse'],
		[
			{
				name: 'qc_date_issue',
				displayName: 'Accept Date',
				description: 'Whether to accept the date even though funtrade reads it as implausible',
			},
			{
				name: 'qc_household',
				displayName: 'Accept Household',
				description: 'Whether to record the refusal even though it also affects the household',
			},
		],
	),
	qualityOverridesProperty(
		resource,
		['respond'],
		[
			{
				name: 'qc_date_issue',
				displayName: 'Accept Date',
				description: 'Whether to accept the date even though funtrade reads it as implausible',
			},
			{
				name: 'qc_thank_you',
				displayName: 'Skip Thank You Check',
				description: 'Whether to record the response even though a thank-you is still outstanding',
			},
		],
	),
	additionalFieldsProperty(
		resource,
		writes,
		'Extra keys merged into the request body, for fields the node does not model and for sending an explicit null',
	),
];
