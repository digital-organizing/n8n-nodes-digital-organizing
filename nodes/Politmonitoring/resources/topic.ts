import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	filters,
	jobProperties,
	listProperties,
	operation,
	readLimit,
	submitJob,
	textField,
} from '../shared/descriptions';
import { forEachItem, pmPaginate, pmRequest } from '../shared/request';
const show = (...operation: string[]) => ({ resource: ['topic'], operation });
const profileFields: INodeProperties[] = [];
for (const [language, label] of [
	['de', 'German'],
	['fr', 'French'],
	['en', 'English'],
]) {
	for (const [field, title] of [
		['title', 'Title'],
		['scope', 'Scope'],
		['position', 'Position'],
		['supports', 'Supported Measures'],
		['opposes', 'Opposed Measures'],
	]) {
		profileFields.push({
			displayName: `${title} (${label})`,
			name:
				field === 'title'
					? language === 'de'
						? 'titel'
						: `titel_${language}`
					: `${field}_${language}`,
			type: 'string',
			default: '',
		});
	}
}
profileFields.push(
	{
		displayName: 'Active',
		name: 'active',
		type: 'boolean',
		default: true,
		description: 'Whether this Thema is active',
	},
	{ displayName: 'Description', name: 'beschreibung', type: 'string', default: '' },
	{
		displayName: 'Keywords',
		name: 'keywords',
		type: 'string',
		default: '',
		description: 'Comma-separated keywords',
	},
);
profileFields.sort((a, b) => a.displayName.localeCompare(b.displayName));
export const topicDescription: INodeProperties[] = [
	operation('topic', [
		['Get Many', 'getAll', 'Get many Themen'],
		['Get', 'get', 'Get a Thema'],
		['Create', 'create', 'Create a Thema'],
		['Update', 'update', 'Update a Thema'],
		['Get Geschäfte', 'affairs', 'Get Geschäfte for a Thema'],
		['Get Documents', 'documents', 'Get documents for a Thema'],
	]),
	textField('Thema ID', 'topicId', show('get', 'update', 'affairs', 'documents')),
	{
		displayName: 'Profile Fields',
		name: 'profileFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: profileFields,
		displayOptions: { show: show('create', 'update') },
		description:
			'Complete title, scope, position, supported and opposed measures in one language. Missing translations are generated; updates change only supplied fields.',
	},
	...listProperties(show('getAll', 'affairs', 'documents')),
	filters(show('getAll'), ['search']),
	...jobProperties(show('create', 'update')),
];
export async function runTopic(ctx: IExecuteFunctions) {
	return forEachItem(ctx, async (i) => {
		const language = ctx.getNodeParameter('language', i, 'de') as string;
		const op = ctx.getNodeParameter('operation', i) as string;
		if (op === 'getAll')
			return pmPaginate(
				ctx,
				'/topics/',
				{ language, ...(ctx.getNodeParameter('filters', i, {}) as IDataObject) },
				readLimit(ctx, i),
			);
		const id =
			op === 'create' ? '' : encodeURIComponent(ctx.getNodeParameter('topicId', i) as string);
		const path = `/topics/${id}/`;
		if (op === 'get')
			return (await pmRequest(ctx, 'GET', path, { qs: { language } })) as IDataObject;
		if (op === 'affairs' || op === 'documents')
			return pmPaginate(ctx, `${path}${op}/`, { language }, readLimit(ctx, i));
		const body = { ...(ctx.getNodeParameter('profileFields', i, {}) as IDataObject) };
		if (typeof body.keywords === 'string')
			body.keywords = body.keywords
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		const { job, waited } = await submitJob(
			ctx,
			i,
			op === 'create' ? 'POST' : 'PATCH',
			op === 'create' ? '/topics/' : path,
			body,
			body,
		);
		if (!waited) return job;
		return (await pmRequest(ctx, 'GET', `/topics/${job.topic_id}/`, {
			qs: { language },
		})) as IDataObject;
	});
}
