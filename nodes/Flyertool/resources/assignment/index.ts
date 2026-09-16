import type { INodeProperties } from 'n8n-workflow';
import { listOutput, listProperties } from '../../shared/descriptions';

const resource = 'assignment';
const show = { resource: [resource] };

/**
 * Contact assignments — GET/PATCH/DELETE under /api/flyertool/assignments.
 *
 * An assignment ties a contact to one cluster of a clustering run, and carries
 * the links to the cluster's HTML and PDF. Assignments are created by the
 * clustering, not through the API.
 *
 * A clustering, bez and idx combination is unique: moving an assignment onto a
 * cluster that is already taken answers 409.
 */
export const assignmentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an assignment',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/flyertool/assignments/{{$parameter.assignmentId}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an assignment',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/flyertool/assignments/{{$parameter.assignmentId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many assignments',
				routing: {
					request: { method: 'GET', url: '/api/flyertool/assignments' },
					...listOutput,
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an assignment',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/flyertool/assignments/{{$parameter.assignmentId}}',
					},
				},
			},
		],
		default: 'getAll',
	},

	{
		displayName: 'Assignment ID',
		name: 'assignmentId',
		type: 'number',
		default: 0,
		required: true,
		description: 'The ID of the assignment',
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},

	// ─── Update ────────────────────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: [
			{
				displayName: 'Capacity',
				name: 'capacity',
				type: 'number',
				default: 0,
				description: 'Capacity of the assigned cluster',
				routing: { send: { type: 'body', property: 'capacity' } },
			},
			{
				displayName: 'Cluster Designation',
				name: 'bez',
				type: 'string',
				default: '',
				description: 'The bez of the cluster. Together with the index it must stay unique.',
				routing: { send: { type: 'body', property: 'bez' } },
			},
			{
				displayName: 'Cluster Index',
				name: 'idx',
				type: 'number',
				default: 0,
				description: 'Index of the cluster. Together with the designation it must stay unique.',
				routing: { send: { type: 'body', property: 'idx' } },
			},
			{
				displayName: 'Distance',
				name: 'distance',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'distance' } },
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
				displayName: 'Wave',
				name: 'wave',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'wave' } },
			},
		],
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
				displayName: 'Campaign ID',
				name: 'campaign_id',
				type: 'number',
				default: 0,
				routing: { send: { type: 'query', property: 'campaign_id' } },
			},
			{
				displayName: 'Cluster Designation',
				name: 'bez',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'bez' } },
			},
			{
				displayName: 'Clustering ID',
				name: 'clustering_id',
				type: 'number',
				default: 0,
				routing: { send: { type: 'query', property: 'clustering_id' } },
			},
			{
				displayName: 'Contact UUID',
				name: 'contact_uuid',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'contact_uuid' } },
			},
			{
				displayName: 'Wave',
				name: 'wave',
				type: 'number',
				default: 0,
				routing: { send: { type: 'query', property: 'wave' } },
			},
		],
	},
];
