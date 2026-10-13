import { createHash } from 'node:crypto';
import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	filters,
	jobProperties,
	listProperties,
	operation,
	parseIds,
	readLimit,
	submitJob,
	textField,
} from '../shared/descriptions';
import { forEachItem, pmPaginate, pmRequest } from '../shared/request';
const show = (...operation: string[]) => ({ resource: ['document'], operation });
export const documentDescription: INodeProperties[] = [
	operation('document', [
		['Upload', 'upload', 'Upload a document'],
		['Get', 'get', 'Get a document'],
		['Get Many', 'getAll', 'Get many documents'],
		['Download', 'download', 'Download a document'],
		['Retry Processing', 'retry', 'Retry document processing'],
	]),
	textField('Document ID', 'documentId', show('get', 'download', 'retry')),
	textField('Title', 'title', show('upload')),
	{
		...textField('Input Binary Field', 'binaryPropertyName', show('upload'), 'data'),
		hint: 'The name of the input binary field containing the file to upload',
	},
	{
		...textField('Put Output File in Field', 'outputBinaryPropertyName', show('download'), 'data'),
		hint: 'The name of the output binary field to put the file in',
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show('upload') },
		options: [
			{ displayName: 'Date', name: 'datum', type: 'dateTime', default: '' },
			{ displayName: 'Language', name: 'language', type: 'string', default: 'de' },
			{
				displayName: 'Thema IDs',
				name: 'topicIds',
				type: 'string',
				default: '',
				description: 'Comma-separated Thema IDs',
			},
		],
	},
	...listProperties(show('getAll')),
	filters(show('getAll'), ['search', 'status']),
	...jobProperties(show('upload', 'retry')),
];
export async function runDocument(ctx: IExecuteFunctions) {
	return forEachItem(ctx, async (i) => {
		const language = ctx.getNodeParameter('language', i, 'de') as string;
		const op = ctx.getNodeParameter('operation', i) as string;
		if (op === 'getAll')
			return pmPaginate(
				ctx,
				'/documents/',
				{ language, ...(ctx.getNodeParameter('filters', i, {}) as IDataObject) },
				readLimit(ctx, i),
			);
		const id =
			op === 'upload' ? '' : encodeURIComponent(ctx.getNodeParameter('documentId', i) as string);
		const path = `/documents/${id}/`;
		if (op === 'get')
			return (await pmRequest(ctx, 'GET', path, { qs: { language } })) as IDataObject;
		if (op === 'download') {
			const response = (await pmRequest(ctx, 'GET', `${path}file/`, {
				encoding: 'arraybuffer',
				returnFullResponse: true,
			})) as { body: ArrayBuffer; headers: IDataObject };
			const disposition = String(response.headers['content-disposition'] ?? '');
			const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
			const name = encoded
				? decodeURIComponent(encoded[1])
				: /filename="?([^";]+)"?/i.exec(disposition)?.[1];
			const binary = await ctx.helpers.prepareBinaryData(
				Buffer.from(response.body),
				name,
				response.headers['content-type'] as string,
			);
			return {
				json: { id },
				binary: { [ctx.getNodeParameter('outputBinaryPropertyName', i) as string]: binary },
			};
		}
		if (op === 'retry') {
			const { job, waited } = await submitJob(ctx, i, 'POST', `${path}retry/`, undefined, id);
			return waited
				? ((await pmRequest(ctx, 'GET', path, { qs: { language } })) as IDataObject)
				: job;
		}
		const field = ctx.getNodeParameter('binaryPropertyName', i) as string;
		const binary = ctx.helpers.assertBinaryData(i, field);
		const buffer = await ctx.helpers.getBinaryDataBuffer(i, field);
		const metadata = ctx.getNodeParameter('metadata', i, {}) as IDataObject;
		const fields: IDataObject = { titel: ctx.getNodeParameter('title', i) as string };
		if (metadata.language) fields.language = metadata.language;
		if (metadata.datum) fields.datum = String(metadata.datum).slice(0, 10);
		if (metadata.topicIds) fields.themen = parseIds(metadata.topicIds as string);
		const form = new FormData();
		for (const [key, value] of Object.entries(fields))
			for (const entry of Array.isArray(value) ? value : [value]) form.append(key, String(entry));
		const filename = binary.fileName ?? 'upload.bin';
		form.append('file', new Blob([new Uint8Array(buffer)], { type: binary.mimeType }), filename);
		const { job, waited } = await submitJob(ctx, i, 'POST', '/documents/', form, {
			...fields,
			filename,
			sha256: createHash('sha256').update(buffer).digest('hex'),
		});
		return waited
			? ((await pmRequest(ctx, 'GET', `/documents/${job.document_id}/`, {
					qs: { language },
				})) as IDataObject)
			: job;
	});
}
