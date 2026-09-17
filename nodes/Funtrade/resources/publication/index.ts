import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { clientLimitProperties } from '../../../shared/pagination';
import {
	CRM,
	additionalFieldsProperty,
	personIdProperty,
	recordIdProperty,
	referenceOptions,
} from '../../shared/descriptions';

const resource = 'publication';
const show = { resource: [resource] };

/**
 * Publications — `/crmapi/people/{id}/publications`: which periodicals a person
 * receives, in what quantity and through which channel.
 *
 * Read and update only. A person's publication subscriptions are set up in funtrade
 * itself, so the API has no create or delete — what a workflow changes here is the
 * delivery: the quantity, the channel, the address it goes to, and the validity
 * window that ends a subscription.
 *
 * The sequence numbers point into the person's address list rather than carrying an
 * address: Address Sequence Number picks the postal address, the three email
 * sequence numbers pick up to three telecom addresses. Get Many on the Address
 * resource is where those numbers come from.
 *
 * Unlike the other sub-resources, PersonPublicationEdit carries no version field, so
 * there is no concurrent mutation check on this write.
 */
export const publicationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many publications',
				routing: {
					request: { method: 'GET', url: `=${CRM}/people/{{$parameter.personId}}/publications` },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a publication',
				routing: {
					request: {
						method: 'PATCH',
						url: `=${CRM}/people/{{$parameter.personId}}/publications/{{$parameter.publicationId}}`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'getAll',
	},

	personIdProperty(resource, ['getAll', 'update']),
	recordIdProperty('publicationId', 'Publication ID', resource, ['update']),

	...clientLimitProperties(resource),

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
				displayName: 'Address Sequence Number',
				name: 'address_sequence_number',
				type: 'number',
				default: 0,
				description: 'Which of the person addresses the publication is delivered to',
				routing: { send: { type: 'body', property: 'address_sequence_number' } },
			},
			{
				displayName: 'Channel Name or ID',
				name: 'channel',
				type: 'options',
				typeOptions: referenceOptions('channels', 'channel', 'description'),
				default: '',
				description:
					'How the publication is delivered. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'channel' } },
			},
			{
				displayName: 'Email Sequence Number 1',
				name: 'email_sequence_number_1',
				type: 'number',
				default: 0,
				description: 'Which of the person telecom addresses the publication is emailed to',
				routing: { send: { type: 'body', property: 'email_sequence_number_1' } },
			},
			{
				displayName: 'Email Sequence Number 2',
				name: 'email_sequence_number_2',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'email_sequence_number_2' } },
			},
			{
				displayName: 'Email Sequence Number 3',
				name: 'email_sequence_number_3',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'email_sequence_number_3' } },
			},
			{
				displayName: 'Quantity',
				name: 'quantity',
				type: 'number',
				default: 1,
				description: 'How many copies the person receives',
				routing: { send: { type: 'body', property: 'quantity' } },
			},
			{
				displayName: 'Valid From',
				name: 'valid_from',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'body', property: 'valid_from' } },
			},
			{
				displayName: 'Valid To',
				name: 'valid_to',
				type: 'dateTime',
				default: '',
				description: 'Set this to end the subscription rather than deleting it',
				routing: { send: { type: 'body', property: 'valid_to' } },
			},
		],
	},

	additionalFieldsProperty(
		resource,
		['update'],
		'Extra keys merged into the request body, for fields of the PersonPublicationEdit schema this node does not model and for sending an explicit null',
	),
];
