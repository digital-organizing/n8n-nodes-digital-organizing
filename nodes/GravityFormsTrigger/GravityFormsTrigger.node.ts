import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';
import { GF, fromGravityDate, statusOptions } from '../GravityForms/shared/descriptions';

/** Entries the endpoint hands back, of which only the timestamps matter here. */
type Entry = IDataObject & { id?: string };

/** One request per page; ten pages is the most a single tick will drain. */
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

async function fetchEntries(this: IPollFunctions, qs: IDataObject): Promise<Entry[]> {
	const credentials = await this.getCredentials('gravityFormsApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
	const formId = (this.getNodeParameter('formId', '') as string).trim();
	const path = formId ? `${GF}/forms/${formId}/entries` : `${GF}/entries`;

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'gravityFormsApi', {
		method: 'GET',
		url: `${baseUrl}${path}`,
		qs,
		json: true,
	})) as { entries?: Entry[] };

	return response.entries ?? [];
}

/**
 * Starts a workflow on new Gravity Forms entries.
 *
 * Gravity Forms core has no webhooks — the Webhooks add-on is an Elite licence
 * feature, and even then the URL is registered per form in the WordPress admin
 * rather than over the API. So this node polls: each tick asks for the newest
 * entries and emits the ones it has not seen.
 *
 * "Seen" is measured against the timestamp of the newest entry of the previous
 * tick, taken from the API itself rather than from the n8n clock, so a
 * WordPress server whose time is off does not cost entries. The first tick
 * after activation only sets that mark: entries that already existed are not
 * replayed.
 *
 * If the site does run the Webhooks add-on, point it at a plain Webhook node
 * instead — that delivers on submission rather than on the next tick.
 */
export class GravityFormsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gravity Forms Trigger',
		name: 'gravityFormsTrigger',
		icon: {
			light: 'file:../../icons/gravityforms.svg',
			dark: 'file:../../icons/gravityforms.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["formId"] ? "form " + $parameter["formId"] : "all forms" }}',
		description: 'Starts the workflow when a Gravity Forms entry comes in',
		defaults: {
			name: 'Gravity Forms Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gravityFormsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'Gravity Forms core has no webhooks, so this node polls the entries endpoint. Entries that already exist when the workflow is activated are not replayed.',
				name: 'pollingNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Form ID',
				name: 'formId',
				type: 'string',
				default: '',
				description: 'Only entries of this form. Leave empty to watch every form.',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Entry Created',
						value: 'created',
						description: 'Fires once per entry, when it is first stored',
					},
					{
						name: 'Entry Created or Updated',
						value: 'updated',
						description: 'Fires again whenever an entry is edited afterwards',
					},
				],
				default: 'created',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Field IDs',
						name: '_field_ids',
						type: 'string',
						default: '',
						placeholder: '1.3,1.6,3',
						description:
							'Comma-separated list of the fields to return, to keep the payload small. The date the node compares on is always added.',
					},
					{
						displayName: 'Include Labels',
						name: '_labels',
						type: 'boolean',
						default: false,
						description:
							'Whether to add a _labels object mapping each field ID in the response to its label',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: statusOptions,
						default: 'active',
						description: 'Which entries to watch. Gravity Forms defaults to active.',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const staticData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event') as 'created' | 'updated';
		const options = this.getNodeParameter('options', {}) as IDataObject;

		// The column the entries are ordered and compared by. Sorting descending
		// and cutting client side works whatever the API makes of a date filter.
		const dateKey = event === 'updated' ? 'date_updated' : 'date_created';
		const timestampOf = (entry: Entry): number => fromGravityDate(String(entry[dateKey] ?? ''));

		const qs: IDataObject = {
			'sorting[key]': dateKey,
			'sorting[direction]': 'DESC',
			'paging[page_size]': PAGE_SIZE,
			search: JSON.stringify({ status: options.status ?? 'active' }),
		};

		if (options._labels) {
			qs._labels = 1;
		}

		if (options._field_ids) {
			// Trimming the response must not trim away what the comparison needs.
			qs._field_ids = `${options._field_ids as string},${dateKey}`;
		}

		if (this.getMode() === 'manual') {
			const [newest] = await fetchEntries.call(this, { ...qs, 'paging[page_size]': 1 });
			return newest === undefined ? null : [this.helpers.returnJsonArray([newest])];
		}

		const since = staticData.lastTimestamp as number | undefined;

		if (since === undefined) {
			const [newest] = await fetchEntries.call(this, { ...qs, 'paging[page_size]': 1 });
			staticData.lastTimestamp = newest === undefined ? 0 : timestampOf(newest);
			return null;
		}

		const collected: Entry[] = [];
		const seen = new Set<string>();

		for (let page = 1; page <= MAX_PAGES; page++) {
			const entries = await fetchEntries.call(this, { ...qs, 'paging[current_page]': page });
			const fresh = entries.filter((entry) => timestampOf(entry) > since);

			for (const entry of fresh) {
				// Entries arriving mid-scan shift the pages under us, so the same
				// entry can show up twice.
				const id = String(entry.id ?? '');
				if (!seen.has(id)) {
					seen.add(id);
					collected.push(entry);
				}
			}

			// The page held entries we have seen before, or was the last one.
			if (fresh.length < entries.length || entries.length < PAGE_SIZE) {
				break;
			}
		}

		if (collected.length === 0) {
			return null;
		}

		staticData.lastTimestamp = Math.max(since, ...collected.map(timestampOf));

		// Hand them over oldest first, the order they happened in.
		return [this.helpers.returnJsonArray(collected.reverse())];
	}
}
