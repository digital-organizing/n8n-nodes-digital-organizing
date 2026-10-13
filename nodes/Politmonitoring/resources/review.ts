import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { filters, listProperties, operation, readLimit, textField } from '../shared/descriptions';
import { forEachItem, pmPaginate, pmRequest } from '../shared/request';
const show = (...operation: string[]) => ({ resource: ['review'], operation });
export const reviewDescription: INodeProperties[] = [
	operation('review', [
		['Get Open', 'getOpen', 'Get open Prüfbereich matches'],
		['Get Many', 'getAll', 'Get many review matches'],
		['Get', 'get', 'Get a review match'],
		['Accept', 'accept', 'Accept a review match'],
		['Reject', 'reject', 'Reject a review match'],
	]),
	textField('Review ID', 'reviewId', show('get', 'accept', 'reject')),
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		default: '',
		displayOptions: { show: show('accept', 'reject') },
	},
	...listProperties(show('getOpen', 'getAll')),
	filters(show('getAll'), ['status', 'topic_id', 'affair_id']),
];
export async function runReview(ctx: IExecuteFunctions) {
	return forEachItem(ctx, async (i) => {
		const language = ctx.getNodeParameter('language', i, 'de') as string;
		const op = ctx.getNodeParameter('operation', i) as string;
		if (op === 'getOpen' || op === 'getAll')
			return pmPaginate(
				ctx,
				'/reviews/',
				op === 'getOpen'
					? { status: 'pending', language }
					: (ctx.getNodeParameter('filters', i, {}) as IDataObject),
				readLimit(ctx, i),
			);
		const path = `/reviews/${encodeURIComponent(ctx.getNodeParameter('reviewId', i) as string)}/`;
		if (op === 'get')
			return (await pmRequest(ctx, 'GET', path, { qs: { language } })) as IDataObject;
		return (await pmRequest(ctx, 'POST', `${path}decision/`, {
			body: {
				status: op === 'accept' ? 'accepted' : 'rejected',
				note: ctx.getNodeParameter('note', i, '') as string,
			},
		})) as IDataObject;
	});
}
