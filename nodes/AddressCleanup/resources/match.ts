import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type {
	AddressBatchResponse,
	AddressCandidate,
	AddressMatchResponse,
} from '../shared/request';
import { addressCleanupRequest } from '../shared/request';

const show = { resource: ['address'], operation: ['match'] };

/** The server's own CHADDR_MAX_BATCH default is 1000; stay well under it. */
const DEFAULT_BATCH_SIZE = 100;

const COMPONENT_FIELDS = ['street', 'houseNumber', 'zip', 'locality'] as const;

export const matchDescription: INodeProperties[] = [
	{
		displayName: 'Address From',
		name: 'inputMode',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'One Field',
				value: 'text',
				description: 'A whole address in one string, split by the server',
			},
			{
				name: 'Separate Fields',
				value: 'components',
				description: 'Street, ZIP and locality in their own fields, which skips the parser',
			},
		],
		default: 'text',
	},
	{
		displayName: 'Address',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Bahnhofstr. 12, 8001 Zürich',
		displayOptions: { show: { ...show, inputMode: ['text'] } },
		description:
			'Typed as it stands, abbreviations and typos included. House number, ZIP and locality are picked out of it.',
	},
	{
		displayName: 'Street',
		name: 'street',
		type: 'string',
		default: '',
		placeholder: 'Bahnhofstrasse',
		displayOptions: { show: { ...show, inputMode: ['components'] } },
		description: 'Street name, with or without the house number',
	},
	{
		displayName: 'House Number',
		name: 'houseNumber',
		type: 'string',
		default: '',
		placeholder: '12a',
		displayOptions: { show: { ...show, inputMode: ['components'] } },
		description: 'Leave empty if the number is already part of the street',
	},
	{
		displayName: 'ZIP',
		name: 'zip',
		type: 'string',
		default: '',
		placeholder: '8001',
		displayOptions: { show: { ...show, inputMode: ['components'] } },
		description: 'Narrows the search to one postcode, which is what makes a match fast and sure',
	},
	{
		displayName: 'Locality',
		name: 'locality',
		type: 'string',
		default: '',
		placeholder: 'Zürich',
		displayOptions: { show: { ...show, inputMode: ['components'] } },
		description: 'Town as typed; exonyms such as Genf or Freiburg are understood',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: DEFAULT_BATCH_SIZE,
				description:
					'How many input items go into one request. The server rejects batches above its CHADDR_MAX_BATCH, 1000 by default. Set to 1 to send every address on its own.',
			},
			{
				displayName: 'Candidates',
				name: 'candidates',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 5,
				description:
					'How many scored candidates the server returns per address. The best one is always used; the rest only show up with Include Candidates.',
			},
			{
				displayName: 'Include Candidates',
				name: 'includeCandidates',
				type: 'boolean',
				default: false,
				description:
					'Whether to add every scored candidate under "candidates", not just the best one',
			},
			{
				displayName: 'Include Parsed Address',
				name: 'includeParsed',
				type: 'boolean',
				default: false,
				description:
					'Whether to add how the server read the input under "parsed", which explains a surprising match',
			},
			{
				displayName: 'Minimum Score',
				name: 'minScore',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 0.5,
				description: 'Candidates scoring below this are dropped',
			},
			{
				displayName: 'Output Key',
				name: 'outputKey',
				type: 'string',
				default: 'cleaned',
				description:
					'Key the result is written under, next to the fields of the input item. Leave empty to write the fields at the top level.',
			},
		],
	},
];

interface PendingAddress {
	index: number;
	body: IDataObject;
}

/** getNodeParameter hands back whatever the expression produced — a ZIP is often a number. */
function asText(value: unknown): string {
	return value === undefined || value === null ? '' : String(value).trim();
}

/**
 * An empty row is reported rather than thrown, so the caller decides between
 * failing the run and marking the one item.
 */
export type BuiltAddress =
	| { body: IDataObject; problem?: undefined }
	| { body?: undefined; problem: string };

const EMPTY_ADDRESS = 'The address is empty';

export function buildAddress(ctx: IExecuteFunctions, i: number): BuiltAddress {
	if ((ctx.getNodeParameter('inputMode', i) as string) === 'text') {
		const query = asText(ctx.getNodeParameter('query', i, ''));
		return query ? { body: { query } } : { problem: EMPTY_ADDRESS };
	}

	const address: IDataObject = {};
	for (const field of COMPONENT_FIELDS) {
		const value = asText(ctx.getNodeParameter(field, i, ''));
		if (value) address[field] = value;
	}

	// A house number on its own matches nothing, so it does not count as filled in.
	if (!address.street && !address.zip && !address.locality) return { problem: EMPTY_ADDRESS };

	return { body: address };
}

/**
 * The response flattened to one level: verdict and the matched building, with a
 * stable set of keys so an unmatched item has the same shape as a matched one
 * and downstream mappings do not break on it.
 */
export function shapeResult(response: AddressMatchResponse, options: IDataObject): IDataObject {
	const best = response.results?.[0] as AddressCandidate | undefined;
	const verdict = response.verdict;

	const json: IDataObject = {
		verdict,
		matched: verdict === 'exact' || verdict === 'match',
		score: best?.score ?? 0,
		street: best?.street ?? null,
		houseNumber: best?.houseNumber ?? null,
		zip: best?.zip ?? null,
		locality: best?.locality ?? null,
		canton: best?.canton ?? null,
		municipality: best?.municipality ?? null,
		municipalityNumber: best?.municipalityNumber ?? null,
		egid: best?.egid ?? null,
		egaid: best?.egaid ?? null,
		edid: best?.edid ?? null,
		lat: best?.lat ?? null,
		lon: best?.lon ?? null,
		components: best?.components ?? null,
	};

	if (options.includeParsed) json.parsed = response.parsed ?? null;
	if (options.includeCandidates) json.candidates = response.results ?? [];
	return json;
}

/**
 * One request per chunk. A single address goes to /v1/match, which reports a
 * rejected input with a message about that address rather than about a batch.
 */
async function matchChunk(
	ctx: IExecuteFunctions,
	chunk: PendingAddress[],
	shared: IDataObject,
): Promise<AddressMatchResponse[]> {
	if (chunk.length === 1) {
		const response = await addressCleanupRequest(ctx, 'POST', '/v1/match', {
			...chunk[0].body,
			...shared,
		});
		return [response as AddressMatchResponse];
	}

	const response = (await addressCleanupRequest(ctx, 'POST', '/v1/match/batch', {
		items: chunk.map((entry) => entry.body),
		...shared,
	})) as AddressBatchResponse;

	return response.results ?? [];
}

export async function runMatch(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = ctx.getInputData();
	const out: INodeExecutionData[] = new Array(items.length);

	// One request covers many items, so the options that shape it are read once,
	// from the first item, rather than per item.
	const options = ctx.getNodeParameter('options', 0, {}) as IDataObject;
	const outputKey = options.outputKey === undefined ? 'cleaned' : (options.outputKey as string);

	const shared: IDataObject = {};
	if (options.candidates !== undefined) shared.limit = options.candidates;
	if (options.minScore !== undefined) shared.minScore = options.minScore;

	const fail = (i: number, message: string) => {
		out[i] = { json: { ...items[i].json, error: message }, pairedItem: { item: i } };
	};

	const pending: PendingAddress[] = [];
	for (let i = 0; i < items.length; i++) {
		const built = buildAddress(ctx, i);
		if (built.problem !== undefined) {
			if (!ctx.continueOnFail()) {
				throw new NodeOperationError(ctx.getNode(), built.problem, {
					itemIndex: i,
					description:
						'Nothing to look up in this item. Give a street, a ZIP or a locality, or filter empty rows out before this node.',
				});
			}
			fail(i, built.problem);
			continue;
		}
		pending.push({ index: i, body: built.body });
	}

	const batchSize = Math.max(1, (options.batchSize as number) ?? DEFAULT_BATCH_SIZE);

	for (let start = 0; start < pending.length; start += batchSize) {
		const chunk = pending.slice(start, start + batchSize);

		let responses: AddressMatchResponse[];
		try {
			responses = await matchChunk(ctx, chunk, shared);
		} catch (error) {
			if (!ctx.continueOnFail()) {
				throw new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex: chunk[0].index });
			}
			for (const entry of chunk) fail(entry.index, (error as Error).message);
			continue;
		}

		// Results come back in input order, one per item. A different count means
		// the pairing is guesswork, so stop rather than write the wrong address.
		if (responses.length !== chunk.length) {
			throw new NodeOperationError(
				ctx.getNode(),
				`The server answered ${responses.length} of ${chunk.length} addresses`,
				{ itemIndex: chunk[0].index },
			);
		}

		chunk.forEach((entry, n) => {
			const result = shapeResult(responses[n], options);
			out[entry.index] = {
				json: {
					...items[entry.index].json,
					...(outputKey ? { [outputKey]: result } : result),
				},
				pairedItem: { item: entry.index },
			};
		});
	}

	return out;
}
