import type { INodeProperties } from 'n8n-workflow';
import {
	API,
	buildObjectBody,
	createdIdToItem,
	listProperties,
	objectBodyProperties,
	objectTypeOptions,
	objectsToItems,
	withRequestedId,
} from '../../shared/descriptions';

const resource = 'record';
const show = { resource: [resource] };
const writes = ['create', 'update'];

/**
 * Any other object type — `/{type}`.
 *
 * Webling's API is one shape repeated: every documented type answers the same
 * five endpoints, with the same query language, the same `{objects: [...]}` list
 * and the same `{properties, parents, links}` body. Modelling each as its own
 * resource would be twenty-five copies of this file, so they share one with the
 * type as a parameter — invoices, bookings, documents, periods, users and the
 * rest included.
 *
 * Member has a resource of its own only because it is the one everybody reaches
 * for and its parents are worth a dropdown; it is otherwise the same endpoints.
 *
 * Unlike `/object`, which addresses fields by their immutable internal number,
 * this goes through the typed endpoints and addresses them by name — the names
 * Definition → Get reports.
 */
export const recordDescription: INodeProperties[] = [
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
				action: 'Create a record',
				routing: {
					request: { method: 'POST', url: `=${API}/{{$parameter.objectType}}` },
					send: { preSend: [buildObjectBody] },
					output: { postReceive: [createdIdToItem] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a record',
				routing: {
					request: {
						method: 'DELETE',
						url: `=${API}/{{$parameter.objectType}}/{{$parameter.recordId}}`,
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a record',
				routing: {
					request: {
						method: 'GET',
						url: `=${API}/{{$parameter.objectType}}/{{$parameter.recordId}}`,
					},
					output: { postReceive: [withRequestedId('recordId')] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many records',
				routing: {
					request: { method: 'GET', url: `=${API}/{{$parameter.objectType}}` },
					output: { postReceive: [objectsToItems] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a record',
				routing: {
					request: {
						method: 'PUT',
						url: `=${API}/{{$parameter.objectType}}/{{$parameter.recordId}}`,
					},
					send: { preSend: [buildObjectBody] },
				},
			},
		],
		default: 'getAll',
	},

	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
		options: objectTypeOptions,
		default: 'debitor',
		description: 'Which kind of Webling object to work with',
		displayOptions: { show },
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		description:
			'Numeric ID of the record. Several IDs separated by commas work too, for Get and Delete.',
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},

	// ─── Get Many ──────────────────────────────────────────────────────────────
	...listProperties(resource),

	// ─── Create and Update ─────────────────────────────────────────────────────
	...objectBodyProperties(resource, writes, {
		description:
			'Comma-separated IDs of the parent objects. Most types need at least one — a debitor belongs to a period, an entry to an entry group. Leave empty on update to keep the parents the record has.',
	}),
];
