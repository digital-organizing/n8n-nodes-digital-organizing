import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';
import { API, objectTypeOptions } from '../Webling/shared/descriptions';

/** What `/replicate/{revision}` answers, of which the node reads four fields. */
type Replication = {
	objects?: Record<string, number[]>;
	deleted?: number[];
	definitions?: string[];
	revision?: number;
};

/** How many changed objects one tick will fetch in full before giving up on it. */
const MAX_FULL_FETCH = 200;

/**
 * Starts a workflow when something changes in Webling.
 *
 * Webling has no webhooks, but it has something better than the usual polling
 * consolation prize: every write produces a numbered revision, and
 * `/replicate/{revision}` answers exactly what changed since the one you hold.
 * So this node does not compare timestamps, size a window or keep a list of
 * things it has already seen — it remembers one number. Nothing is emitted
 * twice and nothing falls through a gap, which is not true of any clock-based
 * trigger.
 *
 * It also costs one request per tick when nothing changed, which is what makes
 * a short interval affordable against a documented recommendation of fewer than
 * 50 requests a minute.
 *
 * The first tick after activation only records the current revision; it does not
 * replay history.
 *
 * A revision of **-1** means the key's permissions changed, so what it can see
 * changed too. The node treats that as a fresh start: it takes the new revision
 * and emits nothing, rather than reporting a store's worth of objects as new.
 */
export class WeblingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webling Trigger',
		name: 'weblingTrigger',
		icon: {
			light: 'file:../../icons/webling.svg',
			dark: 'file:../../icons/webling.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{ $parameter["objectTypes"].length ? $parameter["objectTypes"].join(", ") : "all types" }}',
		description: 'Starts the workflow when Webling objects are created, changed or deleted',
		defaults: {
			name: 'Webling Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'weblingApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'Webling has no webhooks, so this node polls — but it asks what changed since the revision it last saw, so nothing is emitted twice and nothing is missed. Changes that happened before the workflow was activated are not replayed.',
				name: 'pollingNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Object Types',
				name: 'objectTypes',
				type: 'multiOptions',
				options: objectTypeOptions,
				default: ['member'],
				description: 'Which types to watch. Leave empty for every type.',
			},
			{
				displayName: 'Fetch Full Objects',
				name: 'fetchFull',
				type: 'boolean',
				default: true,
				description:
					'Whether to read each changed object and emit it whole. Turn it off to emit only the ID and type, which costs one request per tick however much changed.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Deletions',
						name: 'includeDeleted',
						type: 'boolean',
						default: true,
						description:
							'Whether to emit deleted objects too, marked with deleted: true. A deleted object cannot be read, so it is emitted as its ID and type whatever Fetch Full Objects says.',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const credentials = await this.getCredentials('weblingApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
		const watched = this.getNodeParameter('objectTypes', []) as string[];
		const fetchFull = this.getNodeParameter('fetchFull', true) as boolean;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const includeDeleted = options.includeDeleted !== false;

		const request = async (path: string): Promise<unknown> =>
			await this.helpers.httpRequestWithAuthentication.call(this, 'weblingApi', {
				method: 'GET',
				url: `${baseUrl}${API}${path}`,
				json: true,
			});

		const staticData = this.getWorkflowStaticData('node');
		const known = staticData.revision as number | undefined;

		// First tick, and manual runs that have nothing to compare against yet:
		// take the current revision as the mark and emit nothing.
		if (known === undefined) {
			const current = (await request('/replicate')) as Replication;
			staticData.revision = current.revision ?? 0;
			return null;
		}

		const changes = (await request(`/replicate/${known}`)) as Replication;
		const revision = changes.revision ?? known;

		// -1 is not a revision: the key's permissions changed, so what it can see
		// did too. Re-mark from the current revision instead of reporting the
		// newly visible half of the store as freshly changed.
		if (revision === -1) {
			const current = (await request('/replicate')) as Replication;
			staticData.revision = current.revision ?? known;
			return null;
		}

		const deleted = new Set(changes.deleted ?? []);
		const pending: Array<{ type: string; id: number; deleted: boolean }> = [];

		for (const [type, ids] of Object.entries(changes.objects ?? {})) {
			if (watched.length > 0 && !watched.includes(type)) continue;

			for (const id of ids) {
				const wasDeleted = deleted.has(id);
				if (wasDeleted && !includeDeleted) continue;
				pending.push({ type, id, deleted: wasDeleted });
			}
		}

		staticData.revision = revision;

		if (pending.length === 0) {
			return null;
		}

		const items: INodeExecutionData[] = [];

		for (const change of pending) {
			// A deleted object cannot be read back, and a run that would take
			// hundreds of requests is not worth the rate limit — both fall back to
			// the identity, which is enough for a workflow to act on.
			const readable = fetchFull && !change.deleted && items.length < MAX_FULL_FETCH;
			let object: IDataObject = {};

			if (readable) {
				try {
					object = (await request(`/${change.type}/${change.id}`)) as IDataObject;
				} catch {
					// Changed and gone again between the two calls, or outside what
					// this key may read. The change itself is still worth reporting.
					object = {};
				}
			}

			items.push({
				json: { id: change.id, type: change.type, deleted: change.deleted, ...object, revision },
			});
		}

		return [items];
	}
}
