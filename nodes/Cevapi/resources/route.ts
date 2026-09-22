import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { CevapiAnswer, CevapiDecideResponse } from '../shared/request';
import { cevapiRequest, parseState, stripScores } from '../shared/request';
import { profileProperty, stateProperty } from './shared';

const show = { resource: ['decision'], operation: ['route'] };

/** Label the server returns when no option reaches Min Score. */
export const FALLBACK_LABEL = '__fallback__';

/**
 * One output per option, so this node replaces a Decide plus a Switch.
 *
 * n8n serialises this function into an expression and calls it with the node's
 * parameters whenever they change, which is why it must stay self-contained:
 * no imports, no constants from this module, plain strings instead of enums.
 */
export const configuredOutputs = (parameters: INodeParameters) => {
	if (parameters.operation !== 'route') {
		return [{ type: 'main' }];
	}

	const collection =
		parameters.source === 'profile'
			? (parameters.labels as IDataObject)
			: (parameters.routes as IDataObject);
	const rules = ((collection?.values ?? []) as IDataObject[]).filter((rule) => rule.label);

	const outputs = rules.map((rule) => ({ type: 'main', displayName: rule.label as string }));

	const options = (parameters.options as IDataObject) ?? {};
	if (options.fallbackOutput !== false) {
		outputs.push({ type: 'main', displayName: 'Fallback' });
	}
	if (options.unsureOutput === true) {
		outputs.push({ type: 'main', displayName: 'Unsure' });
	}

	return outputs.length > 0 ? outputs : [{ type: 'main' }];
};

export const routeDescription: INodeProperties[] = [
	{
		displayName: 'Options From',
		name: 'source',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Options Defined Here',
				value: 'inline',
				description: 'Each option carries its own English criterion',
			},
			{
				name: 'Profile on the Server',
				value: 'profile',
				description: 'Use a choice question from a stored profile and list its labels here',
			},
		],
		default: 'inline',
	},
	{
		displayName: 'Options',
		name: 'routes',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		default: {},
		placeholder: 'Add Option',
		displayOptions: { show: { ...show, source: ['inline'] } },
		description: 'Every option becomes an output of this node',
		options: [
			{
				name: 'values',
				displayName: 'Option',
				values: [
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'billing',
						description: 'Name of the output this option routes to',
					},
					{
						displayName: 'Criterion',
						name: 'criterion',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'The sender writes about an invoice, a payment or a refund.',
						description:
							'English statement that is true when this option applies. Write it as a full sentence.',
					},
				],
			},
		],
	},
	profileProperty({ ...show, source: ['profile'] }),
	{
		displayName: 'Question ID',
		name: 'questionId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'route',
		displayOptions: { show: { ...show, source: ['profile'] } },
		description: 'ID of the choice question in that profile',
	},
	{
		displayName: 'Labels',
		name: 'labels',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		default: {},
		placeholder: 'Add Label',
		displayOptions: { show: { ...show, source: ['profile'] } },
		description: "The profile's labels, in the order they should appear as outputs",
		options: [
			{
				name: 'values',
				displayName: 'Label',
				values: [
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'billing',
					},
				],
			},
		],
	},
	stateProperty(show),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Fallback Output',
				name: 'fallbackOutput',
				type: 'boolean',
				default: true,
				description:
					'Whether to add an output for items where no option reaches Min Score. Without it, the best option always wins.',
			},
			{
				displayName: 'Include Per-Criterion Scores',
				name: 'includeScores',
				type: 'boolean',
				default: false,
				description: 'Whether to keep the probability of every single option in the output',
			},
			{
				displayName: 'Min Confidence',
				name: 'minConfidence',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 0.6,
				description: 'Below this probability the item goes to the Unsure output',
			},
			{
				displayName: 'Min Margin',
				name: 'minMargin',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 0.1,
				description:
					'Minimum distance between the best and the second-best option. Below it the item goes to the Unsure output.',
			},
			{
				displayName: 'Min Score',
				name: 'minScore',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 0.5,
				displayOptions: { show: { '/source': ['inline'] } },
				description: 'An option must reach this probability to win, otherwise Fallback applies',
			},
			{
				displayName: 'Output Key',
				name: 'outputKey',
				type: 'string',
				default: 'cevapi',
				description: 'Field the answer is written to. Leave empty to write it at the top level.',
			},
			{
				displayName: 'Unsure Output',
				name: 'unsureOutput',
				type: 'boolean',
				default: false,
				description:
					'Whether to add an output for answers below Min Confidence or Min Margin, e.g. to hand them to a human or an LLM',
			},
		],
	},
];

interface RouteRule {
	label: string;
	criterion?: string;
}

function rules(ctx: IExecuteFunctions, i: number): RouteRule[] {
	const source = ctx.getNodeParameter('source', i) as string;
	const name = source === 'profile' ? 'labels' : 'routes';
	const values = ((ctx.getNodeParameter(name, i, {}) as IDataObject).values ??
		[]) as unknown as RouteRule[];
	return values.filter((rule) => rule.label);
}

export async function runRoute(ctx: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = ctx.getInputData();
	const options = ctx.getNodeParameter('options', 0, {}) as IDataObject;
	const withFallback = options.fallbackOutput !== false;
	const withUnsure = options.unsureOutput === true;

	const labels = rules(ctx, 0).map((rule) => rule.label);
	if (labels.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'Add at least one option');
	}

	const fallbackIndex = withFallback ? labels.length : -1;
	const unsureIndex = withUnsure ? labels.length + (withFallback ? 1 : 0) : -1;
	const out: INodeExecutionData[][] = Array.from(
		{ length: labels.length + (withFallback ? 1 : 0) + (withUnsure ? 1 : 0) },
		() => [],
	);

	for (let i = 0; i < items.length; i++) {
		try {
			const source = ctx.getNodeParameter('source', i) as string;
			const questionId =
				source === 'profile' ? (ctx.getNodeParameter('questionId', i) as string) : 'route';
			const body: IDataObject = { state: parseState(ctx.getNodeParameter('state', i)) };

			if (source === 'profile') {
				body.profile = ctx.getNodeParameter('profile', i) as string;
			} else {
				const choice: IDataObject = {};
				for (const rule of rules(ctx, i)) choice[rule.label] = rule.criterion;
				body.questions = [
					{
						id: questionId,
						type: 'choice',
						options: choice,
						min_score: options.minScore ?? 0.5,
						...(withFallback ? { fallback: FALLBACK_LABEL } : {}),
					},
				];
			}

			const response = (await cevapiRequest(
				ctx,
				'POST',
				'/v1/decide',
				body,
			)) as unknown as CevapiDecideResponse;
			const answer = response.answers[questionId] as CevapiAnswer | undefined;
			if (answer === undefined) {
				throw new NodeOperationError(
					ctx.getNode(),
					`The profile answered no question called "${questionId}"`,
					{ itemIndex: i },
				);
			}

			const key = options.outputKey === undefined ? 'cevapi' : (options.outputKey as string);
			const payload = options.includeScores
				? (answer as unknown as IDataObject)
				: stripScores(answer);
			const item: INodeExecutionData = {
				json: { ...items[i].json, ...(key ? { [key]: payload } : payload) },
				pairedItem: { item: i },
			};

			const unsure =
				answer.confidence < ((options.minConfidence as number) ?? 0.6) ||
				(answer.margin !== undefined && answer.margin < ((options.minMargin as number) ?? 0.1));
			if (withUnsure && unsure) {
				out[unsureIndex].push(item);
				continue;
			}

			const matched = labels.indexOf(answer.value as string);
			if (matched !== -1) {
				out[matched].push(item);
			} else if (withFallback) {
				out[fallbackIndex].push(item);
			} else {
				throw new NodeOperationError(
					ctx.getNode(),
					`No output for the answer "${String(answer.value)}". Add it as an option or turn on the Fallback output.`,
					{ itemIndex: i },
				);
			}
		} catch (error) {
			if (!ctx.continueOnFail()) {
				throw new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex: i });
			}
			const target = withFallback ? fallbackIndex : 0;
			out[target].push({
				json: { ...items[i].json, error: (error as Error).message },
				pairedItem: { item: i },
			});
		}
	}

	return out;
}
