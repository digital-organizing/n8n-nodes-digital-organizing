import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { listProperties, operation, readLimit, textField } from '../shared/descriptions';
import { forEachItem, pmPaginate, pmRequest } from '../shared/request';
const show = (...operation: string[]) => ({ resource: ['tracking'], operation });
export const trackingDescription: INodeProperties[] = [
	operation('tracking', [
		['Get Many', 'getAll', 'Get tracked Geschäfte'],
		['Get', 'get', 'Get a tracked Geschäft'],
		['Add', 'add', 'Track a Geschäft'],
		['Remove', 'remove', 'Remove Geschäft tracking'],
	]),
	textField('Geschäft ID', 'affairId', show('get', 'add', 'remove')),
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		options: [
			{ name: 'Organisation', value: 'organization' },
			{ name: 'Personal', value: 'personal' },
		],
		default: 'personal',
		displayOptions: { show: show('add', 'remove') },
	},
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Organisation', value: 'organization' },
			{ name: 'Personal', value: 'personal' },
		],
		default: 'all',
		displayOptions: { show: show('get', 'getAll') },
	},
	...listProperties(show('getAll')),
];
export async function runTracking(ctx: IExecuteFunctions) {
	return forEachItem(ctx, async (i) => {
		const language = ctx.getNodeParameter('language', i, 'de') as string;
		const op = ctx.getNodeParameter('operation', i) as string;
		const scope = ctx.getNodeParameter('scope', i) as string;
		if (op === 'getAll')
			return pmPaginate(ctx, '/tracking/', { scope, language }, readLimit(ctx, i));
		const id = ctx.getNodeParameter('affairId', i) as string;
		if (op === 'get')
			return (await pmRequest(ctx, 'GET', `/tracking/${encodeURIComponent(id)}/`, {
				qs: { scope },
			})) as IDataObject;
		return (await pmRequest(
			ctx,
			op === 'add' ? 'POST' : 'DELETE',
			op === 'add' ? '/tracking/' : `/tracking/${encodeURIComponent(id)}/`,
			{ body: { affair_id: id, scope } },
		)) as IDataObject;
	});
}
