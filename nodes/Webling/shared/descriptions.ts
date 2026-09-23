import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type INodePropertyTypeOptions,
	type PreSendAction,
} from 'n8n-workflow';

/** The version is part of the path, and 1 is the only one Webling publishes. */
export const API = '/api/1';

/**
 * The object types the API documents, each with the same five CRUD endpoints.
 *
 * Webling answers on further types the web app uses internally; those are
 * explicitly outside the public API and may change without notice, so they are
 * not offered here. Custom API Call reaches them for anyone willing.
 */
export const objectTypeOptions = [
	{ name: 'Account', value: 'account', description: 'A bookkeeping account' },
	{ name: 'Account Group', value: 'accountgroup' },
	{ name: 'Account Group Template', value: 'accountgrouptemplate' },
	{ name: 'Account Template', value: 'accounttemplate' },
	{ name: 'API Key', value: 'apikey' },
	{ name: 'Article', value: 'article' },
	{ name: 'Article Group', value: 'articlegroup' },
	{ name: 'Comment', value: 'comment' },
	{ name: 'Cost Centre', value: 'costcenter' },
	{ name: 'Debitor', value: 'debitor', description: 'An invoice (Rechnung)' },
	{ name: 'Debitor Category', value: 'debitorcategory' },
	{ name: 'Document', value: 'document' },
	{ name: 'Document Group', value: 'documentgroup' },
	{ name: 'Entry', value: 'entry', description: 'A financial posting (Buchung)' },
	{ name: 'Entry Group', value: 'entrygroup' },
	{ name: 'Letter', value: 'letter' },
	{ name: 'Letter PDF', value: 'letterpdf' },
	{ name: 'Member', value: 'member' },
	{ name: 'Member Group', value: 'membergroup' },
	{ name: 'Period', value: 'period' },
	{ name: 'Period Chain', value: 'periodchain' },
	{ name: 'Period Group', value: 'periodgroup' },
	{ name: 'User', value: 'user' },
	{ name: 'User Group', value: 'usergroup' },
	{ name: 'VAT', value: 'vat' },
];

/** The member groups a member can be filed under, read from the account itself. */
export const memberGroupOptions: INodePropertyTypeOptions = {
	loadOptions: {
		routing: {
			request: { method: 'GET', url: `${API}/membergroup`, qs: { format: 'full' } },
			output: {
				postReceive: [
					{ type: 'rootProperty', properties: { property: 'objects' } },
					{
						type: 'setKeyValue',
						properties: {
							name: '={{ $responseItem.properties.title || $responseItem.id }}',
							value: '={{ $responseItem.id }}',
						},
					},
					{ type: 'sort', properties: { key: 'name' } },
				],
			},
		},
	},
};

/**
 * Turns a list response into items.
 *
 * A list answers `{"objects": [...]}` holding bare IDs, or whole objects when
 * `format=full` was asked for. Neither shape survives n8n's generic unwrapping:
 * a bare ID is a number, and an item's `json` has to be an object. So the IDs
 * are wrapped as `{id}` and the objects are passed through — and since a Webling
 * object does not carry its own ID in the body, that wrapper is also the only
 * place a workflow can read one.
 */
export async function objectsToItems(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as { objects?: unknown[] } | undefined;

	return (body?.objects ?? []).map((entry) =>
		typeof entry === 'object' && entry !== null
			? { json: entry as IDataObject }
			: { json: { id: entry as number } },
	);
}

/**
 * Folds the requested ID into a single object.
 *
 * `GET /member/504` answers with the member but without its ID, so a workflow
 * that reads one loses track of which one it read. The node puts it back.
 */
export function withRequestedId(parameterName: string) {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
	): Promise<INodeExecutionData[]> {
		const id = this.getNodeParameter(parameterName, '') as string | number;

		return items.map((item) => ({ ...item, json: { id, ...item.json } }));
	};
}

/**
 * Wraps the bare ID a create answers with.
 *
 * `POST /member` returns `540` and nothing else — not an object, so not an item
 * either until it is wrapped.
 */
export async function createdIdToItem(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body;

	if (typeof body === 'object' && body !== null) {
		return items;
	}

	return [{ json: { id: body as string | number } }];
}

/** Filter, order, full objects and the row cap — the same on every list endpoint. */
export function listProperties(resource: string, operations = ['getAll']): INodeProperties[] {
	const show = { resource: [resource], operation: operations };

	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: true,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			// Webling pages by page number rather than by offset, so a capped read
			// is the first page sized to the cap — which keeps the work off the API
			// rather than throwing rows away after they arrive.
			routing: {
				send: {
					type: 'query',
					property: 'per_page',
				},
			},
		},
		{
			displayName: 'Full Objects',
			name: 'format',
			type: 'boolean',
			default: false,
			description:
				'Whether to return whole objects instead of only their IDs. Webling warns that a large store takes a while to answer this, so filter the list down first.',
			displayOptions: { show },
			routing: {
				send: { type: 'query', property: 'format', value: '={{ $value ? "full" : "" }}' },
			},
		},
		{
			displayName: 'Filter',
			name: 'filter',
			type: 'string',
			default: '',
			placeholder: '`Vorname` = "Hans" AND `PLZ` > 8000',
			description:
				"Webling query language. Property names go in backticks, and the special properties — $parents, $ancestors, $children, $links, $readonly, $label and the object's own identifier — are written with a leading dollar. FILTER matches a prefix and is much faster than CONTAINS.",
			displayOptions: { show },
			routing: { send: { type: 'query', property: 'filter' } },
		},
		{
			displayName: 'Order',
			name: 'order',
			type: 'string',
			default: '',
			placeholder: '`Name` ASC, `Vorname` ASC',
			description: 'Sort expression, in the same language as the filter',
			displayOptions: { show },
			routing: { send: { type: 'query', property: 'order' } },
		},
	];
}

/**
 * Assembles the writable half of an object.
 *
 * `properties`, `parents` and `links` are all structural — a JSON object, a list
 * of IDs, a map of lists — and none of them may be sent empty: an update that
 * carries `parents: []` is not "leave the parents alone", it is "this object has
 * no parents", which Webling rejects for the many types that need one. So they
 * are built here and left out when the field was not filled in.
 */
export const buildObjectBody: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as IDataObject;

	for (const field of ['properties', 'links'] as const) {
		const parsed = parseJsonParameter.call(this, field);
		if (parsed !== undefined && Object.keys(parsed).length > 0) {
			body[field] = parsed;
		}
	}

	// A dropdown of groups hands over an array, a plain field a comma-separated
	// string; both mean the same list of IDs.
	const chosen = this.getNodeParameter('parents', '') as string | string[];
	const parents = (Array.isArray(chosen) ? chosen : chosen.split(','))
		.map((id) => String(id).trim())
		.filter((id) => id !== '')
		.map(Number);

	if (parents.length > 0) {
		body.parents = parents;
	}

	requestOptions.body = body;

	return requestOptions;
};

/** Reads one JSON node parameter, reporting where the syntax error is. */
function parseJsonParameter(this: IExecuteSingleFunctions, name: string): IDataObject | undefined {
	const raw = ((this.getNodeParameter(name, '{}') as string) || '{}').trim();

	if (raw === '' || raw === '{}') {
		return undefined;
	}

	try {
		return JSON.parse(raw) as IDataObject;
	} catch {
		throw new NodeOperationError(this.getNode(), `${name} is not valid JSON`, {
			description: `Could not parse: ${raw}`,
		});
	}
}

/**
 * The writable half of an object, as node parameters.
 *
 * Webling objects have no fixed schema — a member's fields are configured per
 * account and can be renamed at any time — so the node cannot offer them as
 * parameters and takes the whole `properties` object as JSON instead. Definition
 * → Get is how a workflow discovers what the account actually has.
 */
export function objectBodyProperties(
	resource: string,
	operations: string[],
	parents: Pick<INodeProperties, 'description'> & Partial<INodeProperties>,
): INodeProperties[] {
	const show = { resource: [resource], operation: operations };

	return [
		{
			displayName: 'Properties',
			name: 'properties',
			type: 'json',
			default: '{}',
			description:
				'The fields themselves, keyed by the name the account gave them. Pass null to empty a field; files and images take {"name": "…", "content": "&lt;base64&gt;"}.',
			displayOptions: { show },
		},
		{
			displayName: 'Parents',
			name: 'parents',
			type: 'string',
			default: '',
			placeholder: '555',
			displayOptions: { show },
			...parents,
		},
		{
			displayName: 'Links',
			name: 'links',
			type: 'json',
			default: '{}',
			description:
				'Linked objects by category, as {"debitor": [883, 1136]}. Leave empty to leave the links alone.',
			displayOptions: { show },
		},
	];
}
