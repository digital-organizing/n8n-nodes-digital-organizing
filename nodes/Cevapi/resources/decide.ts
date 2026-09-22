import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { CevapiAnswer, CevapiDecideResponse } from '../shared/request';
import { cevapiRequest, parseState, stripScores } from '../shared/request';
import { profileProperty, stateProperty } from './shared';

const show = { resource: ['decision'], operation: ['decide'] };

export const decideDescription: INodeProperties[] = [
	{
		displayName: 'Questions From',
		name: 'source',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Profile on the Server',
				value: 'profile',
				description: 'Use a question set stored on the server, so several workflows share it',
			},
			{
				name: 'Questions Defined Here',
				value: 'inline',
				description: 'Define the questions in this node',
			},
		],
		default: 'profile',
	},
	profileProperty({ ...show, source: ['profile'] }),
	{
		displayName: 'Questions',
		name: 'questions',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		default: {},
		placeholder: 'Add Question',
		displayOptions: { show: { ...show, source: ['inline'] } },
		options: [
			{
				name: 'values',
				displayName: 'Question',
				// Fields are listed alphabetically by display name, as the linter requires.
				values: [
					{
						displayName: 'Criterion',
						name: 'criterion',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'The sender asks for a refund.',
						displayOptions: { show: { type: ['bool'] } },
						description: 'English statement that is true when the answer is yes',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'urgent',
						description: 'Key this answer appears under in the output',
					},
					{
						displayName: 'Levels',
						name: 'levels',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true, sortable: true },
						default: {},
						placeholder: 'Add Level',
						displayOptions: { show: { type: ['score'] } },
						description:
							'Ordered from the lowest level to the highest. The answer is the level number.',
						options: [
							{
								name: 'values',
								displayName: 'Level',
								values: [
									{
										displayName: 'Criterion',
										name: 'criterion',
										type: 'string',
										default: '',
										required: true,
										placeholder: 'The sender is clearly angry.',
									},
								],
							},
						],
					},
					{
						displayName: 'Options',
						name: 'options',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true, sortable: true },
						default: {},
						placeholder: 'Add Option',
						displayOptions: { show: { type: ['choice'] } },
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
									},
									{
										displayName: 'Criterion',
										name: 'criterion',
										type: 'string',
										default: '',
										required: true,
										placeholder: 'The sender writes about an invoice or a payment.',
										description: 'English statement that is true when this label applies',
									},
								],
							},
						],
					},
					{
						displayName: 'Threshold',
						name: 'threshold',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
						default: 0.5,
						displayOptions: { show: { type: ['bool'] } },
						description: 'Probability from which the answer counts as yes',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Level (Score)', value: 'score' },
							{ name: 'One of Several (Choice)', value: 'choice' },
							{ name: 'Yes/No (Bool)', value: 'bool' },
						],
						default: 'bool',
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
				displayName: 'Include Per-Criterion Scores',
				name: 'includeScores',
				type: 'boolean',
				default: false,
				description: 'Whether to keep the probability of every single criterion in the output',
			},
			{
				displayName: 'Output Key',
				name: 'outputKey',
				type: 'string',
				default: 'cevapi',
				description:
					'Field the answers are written to. Leave empty to write them at the top level.',
			},
		],
	},
];

interface InlineOption {
	label: string;
	criterion: string;
}

/** Turn the fixedCollection UI values into the API's question objects. */
export function buildQuestions(raw: IDataObject[]): IDataObject[] {
	return raw.map((question) => {
		const id = (question.id as string) ?? '';

		switch (question.type as string) {
			case 'choice': {
				const values = ((question.options as IDataObject)?.values ??
					[]) as unknown as InlineOption[];
				const options: IDataObject = {};
				for (const option of values) options[option.label] = option.criterion;
				return { id, type: 'choice', options };
			}
			case 'score': {
				const values = ((question.levels as IDataObject)?.values ??
					[]) as unknown as InlineOption[];
				return { id, type: 'score', levels: values.map((level) => level.criterion) };
			}
			default:
				return {
					id,
					type: 'bool',
					criterion: question.criterion,
					threshold: question.threshold ?? 0.5,
				};
		}
	});
}

export function buildBody(ctx: IExecuteFunctions, i: number): IDataObject {
	const body: IDataObject = { state: parseState(ctx.getNodeParameter('state', i)) };

	if ((ctx.getNodeParameter('source', i) as string) === 'profile') {
		body.profile = ctx.getNodeParameter('profile', i) as string;
		return body;
	}

	const raw = ((ctx.getNodeParameter('questions', i, {}) as IDataObject).values ??
		[]) as IDataObject[];
	if (raw.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'Add at least one question', { itemIndex: i });
	}
	body.questions = buildQuestions(raw);
	return body;
}

export async function runDecide(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = ctx.getInputData();
	const out: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
			const response = (await cevapiRequest(
				ctx,
				'POST',
				'/v1/decide',
				buildBody(ctx, i),
			)) as unknown as CevapiDecideResponse;

			const answers: IDataObject = {};
			for (const [id, answer] of Object.entries(response.answers)) {
				answers[id] = options.includeScores
					? (answer as unknown as IDataObject)
					: stripScores(answer as CevapiAnswer);
			}

			const key = options.outputKey === undefined ? 'cevapi' : (options.outputKey as string);
			out.push({
				json: { ...items[i].json, ...(key ? { [key]: answers } : answers) },
				pairedItem: { item: i },
			});
		} catch (error) {
			if (!ctx.continueOnFail()) {
				throw new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex: i });
			}
			out.push({
				json: { ...items[i].json, error: (error as Error).message },
				pairedItem: { item: i },
			});
		}
	}

	return out;
}
