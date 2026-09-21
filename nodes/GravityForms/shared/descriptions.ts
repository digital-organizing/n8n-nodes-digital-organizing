import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type PreSendAction,
} from 'n8n-workflow';

/** Gravity Forms is mounted as a route of the WordPress REST API. */
export const GF = '/wp-json/gf/v2';

/** Entry dates are UTC `Y-m-d H:i:s` strings, not ISO 8601. */
export function toGravityDate(value: string): string {
	return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

/** The reverse, for comparing what the API returned against a point in time. */
export function fromGravityDate(value: string): number {
	return Date.parse(`${value.replace(' ', 'T')}Z`);
}

/**
 * `GET /forms` answers with one object keyed by form ID, not with a list:
 * `{"30": {...}, "31": {...}}`. Hand the workflow one item per form instead, with
 * the key folded in as `id` — the summary response carries `id` itself, the full
 * form objects returned for `include` do not.
 */
export async function splitFormsById(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body as IDataObject;

	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return items;
	}

	return Object.entries(body).map(([id, form]) => ({
		json: { id, ...(form as IDataObject) },
	}));
}

/**
 * Rewrites `date_created` from the ISO 8601 a dateTime parameter carries into the
 * `Y-m-d H:i:s` Gravity Forms stores. Runs after the body is assembled, so it
 * only has to look at the one property.
 */
export const formatEntryDates: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions,
) {
	const body = requestOptions.body as IDataObject | undefined;

	if (body !== undefined && typeof body.date_created === 'string' && body.date_created !== '') {
		body.date_created = toGravityDate(body.date_created);
	}

	return requestOptions;
};

/** A single condition of the entry search. */
type FieldFilter = {
	key?: string;
	value?: string;
	operator?: string;
	isNumeric?: boolean;
};

/**
 * Folds the Filters collection into the `search` query parameter.
 *
 * Gravity Forms expects one JSON object there rather than separate parameters,
 * and expects `field_filters` as a PHP associative array — numeric keys for the
 * conditions plus a `mode` key beside them, which a JSON array cannot express.
 *
 * `start_date` and `end_date` are not in the REST reference but are part of the
 * search criteria the endpoint passes down to `GFAPI::get_entries()`, where they
 * bound `date_created`.
 */
export const buildEntrySearch: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions,
) {
	const filters = this.getNodeParameter('filters', {}) as IDataObject;
	const search: IDataObject = {};

	if (filters.status) {
		search.status = filters.status;
	}

	for (const [parameter, property] of [
		['startDate', 'start_date'],
		['endDate', 'end_date'],
	] as const) {
		const value = filters[parameter] as string | undefined;
		if (value) {
			search[property] = toGravityDate(value);
		}
	}

	const conditions = ((filters.fieldFilters as IDataObject)?.filter ?? []) as FieldFilter[];

	if (conditions.length > 0) {
		const fieldFilters: IDataObject = {};

		conditions.forEach((condition, index) => {
			if (!condition.key) {
				throw new NodeOperationError(this.getNode(), 'A field filter needs a key', {
					description:
						'Use a field ID such as 1.3, or an entry property such as date_created or payment_status.',
				});
			}

			const operator = condition.operator ?? '=';
			const raw = condition.value ?? '';

			fieldFilters[String(index)] = {
				key: condition.key,
				// IN and NOT IN match against a list; the node takes it as one comma
				// separated string because a fixedCollection cannot nest a list.
				value: ['in', 'not in'].includes(operator)
					? raw.split(',').map((part) => part.trim())
					: raw,
				operator,
				...(condition.isNumeric ? { is_numeric: true } : {}),
			};
		});

		fieldFilters.mode = filters.mode ?? 'all';
		search.field_filters = fieldFilters;
	}

	if (Object.keys(search).length > 0) {
		requestOptions.qs = { ...requestOptions.qs, search: JSON.stringify(search) };
	}

	return requestOptions;
};

/** The conditions half of the entry search, shared by the node and its trigger. */
export const fieldFilterProperty: INodeProperties = {
	displayName: 'Field Filters',
	name: 'fieldFilters',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field Filter' },
	default: {},
	description:
		'Conditions on field values or entry properties. Form → Get Field Filters lists the keys and operators a form accepts.',
	options: [
		{
			displayName: 'Filter',
			name: 'filter',
			values: [
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					default: '',
					required: true,
					placeholder: '1.3',
					description: 'Field ID, entry property or entry meta key to match on',
				},
				{
					displayName: 'Operator',
					name: 'operator',
					type: 'options',
					options: [
						{ name: 'Contains', value: 'contains' },
						{ name: 'In', value: 'in' },
						{ name: 'Is', value: '=' },
						{ name: 'Is Not', value: 'is not' },
						{ name: 'Like', value: 'like' },
						{ name: 'Not In', value: 'not in' },
					],
					default: '=',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'The value to match. For In and Not In, a comma-separated list.',
				},
				{
					displayName: 'Is Numeric',
					name: 'isNumeric',
					type: 'boolean',
					default: false,
					description:
						'Whether the values behind the key are numbers, which changes how they compare',
				},
			],
		},
	],
};

/** Entry statuses, as used by both the search and the trigger. */
export const statusOptions = [
	{ name: 'Active', value: 'active' },
	{ name: 'Spam', value: 'spam' },
	{ name: 'Trash', value: 'trash' },
];
