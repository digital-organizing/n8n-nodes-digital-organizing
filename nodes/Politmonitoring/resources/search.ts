import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { jobProperties, operation, parseIds, submitJob, textField } from '../shared/descriptions';
import { forEachItem } from '../shared/request';
const show = { resource: ['search'], operation: ['run'] };
export const searchDescription: INodeProperties[] = [
	operation('search', [['Search', 'run', 'Search Themen and internal documents']]),
	textField('Text', 'text', show),
	{
		displayName: 'Corpora',
		name: 'corpora',
		type: 'multiOptions',
		options: [
			{ name: 'Internal Documents', value: 'documents' },
			{ name: 'Themen', value: 'topics' },
		],
		default: ['topics', 'documents'],
		displayOptions: { show },
	},
	{
		displayName: 'Generate Answer',
		name: 'generateAnswer',
		type: 'boolean',
		default: false,
		description: 'Whether to generate a cited answer alongside ranked matches',
		displayOptions: { show },
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'options',
		options: [
			{ name: 'English', value: 'en' },
			{ name: 'French', value: 'fr' },
			{ name: 'German', value: 'de' },
		],
		default: 'de',
		displayOptions: { show },
	},
	{
		displayName: 'Result Limit',
		name: 'resultLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 50 },
		default: 10,
		displayOptions: { show },
	},
	{
		displayName: 'Source Filters',
		name: 'sourceFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Document IDs',
				name: 'documentIds',
				type: 'string',
				default: '',
				description: 'Comma-separated document IDs',
			},
			{
				displayName: 'Thema IDs',
				name: 'topicIds',
				type: 'string',
				default: '',
				description: 'Comma-separated Thema IDs',
			},
		],
	},
	...jobProperties(show),
];
export async function runSearch(ctx: IExecuteFunctions) {
	return forEachItem(ctx, async (i) => {
		const body: IDataObject = {
			text: ctx.getNodeParameter('text', i) as string,
			corpora: ctx.getNodeParameter('corpora', i) as string[],
			language: ctx.getNodeParameter('language', i) as string,
			limit: ctx.getNodeParameter('resultLimit', i) as number,
			generate_answer: ctx.getNodeParameter('generateAnswer', i) as boolean,
		};
		const filters = ctx.getNodeParameter('sourceFilters', i, {}) as IDataObject;
		if (filters.documentIds) body.document_ids = parseIds(filters.documentIds as string);
		if (filters.topicIds) body.topic_ids = parseIds(filters.topicIds as string);
		const { job, waited } = await submitJob(ctx, i, 'POST', '/search/', body, body);
		return waited ? (job.result as IDataObject) : job;
	});
}
