import type { INodeProperties } from 'n8n-workflow';
import {
	API,
	buildObjectBody,
	createdIdToItem,
	listProperties,
	memberGroupOptions,
	objectBodyProperties,
	objectsToItems,
	withRequestedId,
} from '../../shared/descriptions';

const resource = 'member';
const show = { resource: [resource] };
const writes = ['create', 'update'];

/**
 * Members — `/member`, the record a club exists to keep.
 *
 * A member has **no fixed set of fields**. They are configured per Webling
 * account and can be renamed at any time, so `Vorname`, `Name` and `Geburtstag`
 * are the demo account's fields rather than part of the API. That is why writes
 * take a JSON `properties` object instead of a field list, and why Definition →
 * Get earns its place: it is how a workflow learns what this account calls
 * things before it writes to them.
 *
 * Every member belongs to at least one member group, so Create needs a parent
 * and Update must not clear the ones it has.
 */
export const memberDescription: INodeProperties[] = [
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
				action: 'Create a member',
				routing: {
					request: { method: 'POST', url: `${API}/member` },
					send: { preSend: [buildObjectBody] },
					output: { postReceive: [createdIdToItem] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a member',
				routing: {
					request: { method: 'DELETE', url: `=${API}/member/{{$parameter.memberId}}` },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a member',
				routing: {
					request: { method: 'GET', url: `=${API}/member/{{$parameter.memberId}}` },
					output: { postReceive: [withRequestedId('memberId')] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many members',
				routing: {
					request: { method: 'GET', url: `${API}/member` },
					output: { postReceive: [objectsToItems] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a member',
				routing: {
					request: { method: 'PUT', url: `=${API}/member/{{$parameter.memberId}}` },
					send: { preSend: [buildObjectBody] },
				},
			},
		],
		default: 'getAll',
	},

	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		default: '',
		required: true,
		description:
			'Numeric ID of the member. Several IDs separated by commas work too, for Get and Delete.',
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	...listProperties(resource),

	// ─── Create and Update ─────────────────────────────────────────────────────
	{
		displayName:
			'Member fields are configured per account and can be renamed, so they are passed as JSON rather than as a field list. Read Definition → Get to see what this account calls them.',
		name: 'propertiesNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { ...show, operation: writes } },
	},
	...objectBodyProperties(resource, writes, {
		displayName: 'Member Group Names or IDs',
		type: 'multiOptions',
		typeOptions: memberGroupOptions,
		default: [],
		description:
			'Member groups the member belongs to. Required on create — a member needs at least one — and leaving it empty on update keeps the groups it has. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	}),
];
