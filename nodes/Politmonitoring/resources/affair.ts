import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { filters, listProperties, operation, readLimit, textField } from '../shared/descriptions';
import { forEachItem, pmPaginate, pmRequest } from '../shared/request';
const show = (...operation: string[]) => ({ resource: ['affair'], operation });
export const affairDescription: INodeProperties[] = [
	operation('affair', [
		['Get Dossier', 'get', 'Get a Geschäft dossier'],
		['Get Many', 'getAll', 'Get many Geschäfte'],
		['Get Timeline', 'timeline', 'Get the timeline of a Geschäft'],
		['Get Event History', 'event-history', 'Get the event history of a Geschäft'],
	]),
	textField('Geschäft ID', 'affairId', show('get', 'timeline', 'event-history')),
	{
		displayName: 'Include Raw Source',
		name: 'includeRaw',
		type: 'boolean',
		default: false,
		description: 'Whether to include the stored upstream payload',
		displayOptions: { show: show('get') },
	},
	...listProperties(show('getAll', 'timeline', 'event-history')),
	filters(show('getAll'), ['search', 'type', 'state', 'council', 'person', 'date_from', 'date_to']),
];
export async function runAffair(ctx: IExecuteFunctions) {
	return forEachItem(ctx, async (i) => {
		const language = ctx.getNodeParameter('language', i, 'de') as string;
		const op = ctx.getNodeParameter('operation', i) as string;
		if (op === 'getAll')
			return pmPaginate(
				ctx,
				'/affairs/',
				{ language, ...(ctx.getNodeParameter('filters', i, {}) as IDataObject) },
				readLimit(ctx, i),
			);
		const id = encodeURIComponent(ctx.getNodeParameter('affairId', i) as string);
		const path = `/affairs/${id}/`;
		if (op !== 'get') return pmPaginate(ctx, `${path}${op}/`, { language }, readLimit(ctx, i));
		const result = (await pmRequest(ctx, 'GET', path, {
			qs: { language, include_raw: ctx.getNodeParameter('includeRaw', i, false) as boolean },
		})) as IDataObject;
		for (const [key, url] of Object.entries(result.collections as IDataObject))
			result[key] = await pmPaginate(ctx, url as string, { language });
		delete result.collections;
		return result;
	});
}
