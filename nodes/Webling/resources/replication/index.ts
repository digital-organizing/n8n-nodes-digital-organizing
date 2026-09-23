import type { INodeProperties } from 'n8n-workflow';
import { API } from '../../shared/descriptions';

const resource = 'replication';
const show = { resource: [resource] };

/**
 * Change tracking — `/replicate` and `/changes`.
 *
 * Every write in a Webling account produces a revision, numbered and increasing.
 * Asking for the changes since a revision you already hold is exact: no clock to
 * drift, no window to size, nothing seen twice and nothing missed. It is what
 * Webling asks integrations to use instead of re-reading the store, and with a
 * rate limit of 500 requests a minute and a recommendation to stay under 50,
 * that matters.
 *
 * Both endpoints answer the same body: `objects` grouped by type, `deleted`
 * (whose IDs also appear in `objects`), `definitions` naming the types whose
 * field configuration changed, and the new `revision`.
 *
 * A `revision` of **-1** is not a revision. It means the key's permissions
 * changed, so the data it can see has changed too, and anything cached against
 * the old revision has to be thrown away and read again.
 *
 * Get Changes takes a timestamp instead and suits a job on a fixed schedule;
 * revisions suit everything else. The trigger node uses revisions.
 */
export const replicationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Changes Since Revision',
				value: 'sinceRevision',
				action: 'Get changes since a revision',
				routing: {
					request: { method: 'GET', url: `=${API}/replicate/{{$parameter.revision}}` },
				},
			},
			{
				name: 'Get Changes Since Timestamp',
				value: 'sinceTimestamp',
				action: 'Get changes since a timestamp',
				routing: {
					request: { method: 'GET', url: `=${API}/changes/{{$parameter.timestamp}}` },
				},
			},
			{
				name: 'Get Current Revision',
				value: 'current',
				action: 'Get the current revision',
				description: 'The revision to start tracking from',
				routing: { request: { method: 'GET', url: `${API}/replicate` } },
			},
		],
		default: 'current',
	},

	{
		displayName: 'Revision',
		name: 'revision',
		type: 'number',
		default: 0,
		required: true,
		description:
			'The last revision you already have. A revision higher than the current one is not an error — it answers empty with the current revision.',
		displayOptions: { show: { ...show, operation: ['sinceRevision'] } },
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		type: 'number',
		default: 0,
		required: true,
		placeholder: '1631167410',
		description: 'Unix timestamp in seconds to report changes since',
		displayOptions: { show: { ...show, operation: ['sinceTimestamp'] } },
	},
];
