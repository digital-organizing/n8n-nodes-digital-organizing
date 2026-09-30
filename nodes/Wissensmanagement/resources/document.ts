import { createHash } from 'node:crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	jobProperties,
	listProperties,
	readLimit,
	stanceOptions,
	submitJob,
} from '../shared/descriptions';
import { forEachItem, wmPaginate, wmRequest } from '../shared/request';

const resource = ['document'];
const show = (...operation: string[]) => ({ resource, operation });

/** Metadata the API stores next to the file; shared by Create and Update. */
const metadataFields: INodeProperties[] = [
	{
		displayName: 'Author',
		name: 'author',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Document Date',
		name: 'documentDate',
		type: 'dateTime',
		default: '',
		description: 'Date of the document itself, not of the upload',
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		default: '',
		placeholder: 'de',
	},
	{
		displayName: 'Metadata Notes',
		name: 'metadataNotes',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Free-text context about the document, up to 16,000 characters',
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'string',
		default: '',
		placeholder: 'Parliament, press release, …',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		placeholder: 'energy, 2026',
		description: 'Comma-separated, up to 100',
	},
];

export const documentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a document',
				description: 'Upload a file or a text and index it',
			},
			{ name: 'Delete', value: 'delete', action: 'Delete a document' },
			{
				name: 'Download File',
				value: 'downloadFile',
				action: 'Download the file of a document',
			},
			{ name: 'Get', value: 'get', action: 'Get a document' },
			{
				name: 'Get Chunks',
				value: 'getChunks',
				action: 'Get the chunks of a document',
				description: 'The indexed passages the document was split into',
			},
			{
				name: 'Get Comments',
				value: 'getComments',
				action: 'Get the comments of a document',
				description: 'Annotations extracted from the file, e.g. PDF comments',
			},
			{ name: 'Get Many', value: 'getAll', action: 'Get many documents' },
			{
				name: 'Get Text',
				value: 'getText',
				action: 'Get the extracted text of a document',
			},
			{
				name: 'Replace File',
				value: 'replaceFile',
				action: 'Replace the file of a document',
				description: 'Upload a new version of the file and index it again',
			},
			{
				name: 'Reprocess',
				value: 'reprocess',
				action: 'Reprocess a document',
				description: 'Extract and index the current file again',
			},
			{ name: 'Update', value: 'update', action: 'Update a document' },
		],
		default: 'create',
	},

	// ----- Create -----
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: show('create') },
		options: [
			{
				name: 'Binary File',
				value: 'binary',
				description: 'A file from a binary property, e.g. PDF, DOCX or an image',
			},
			{ name: 'Text', value: 'text', description: 'Plain text, stored as document.txt' },
		],
		default: 'binary',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: show('create') },
	},
	{
		displayName: 'Stance',
		name: 'stance',
		type: 'options',
		options: stanceOptions,
		default: 'neutral',
		required: true,
		displayOptions: { show: show('create') },
		description: 'Where the author stands relative to your organisation',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 6 },
		default: '',
		required: true,
		displayOptions: { show: { ...show('create'), inputType: ['text'] } },
		description: 'Up to 1,000,000 characters',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: { show: { ...show('create'), inputType: ['binary'] } },
		hint: 'The name of the input binary field containing the file to upload',
		description:
			'The file extension decides how it is read: PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, HTML or an image. Up to 200 MiB.',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: { show: show('replaceFile') },
		hint: 'The name of the input binary field containing the file to upload',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show('create') },
		options: metadataFields,
	},

	// ----- Operations on one document -----
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: show(
				'delete',
				'downloadFile',
				'get',
				'getChunks',
				'getComments',
				'getText',
				'replaceFile',
				'reprocess',
				'update',
			),
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show('update') },
		options: [
			...metadataFields,
			{
				displayName: 'Stance',
				name: 'stance',
				type: 'options',
				options: stanceOptions,
				default: 'neutral',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Put Output File in Field',
		name: 'outputBinaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: { show: show('downloadFile') },
		hint: 'The name of the output binary field to put the file in',
	},
	...jobProperties(show('create', 'replaceFile', 'reprocess')),

	// ----- Get Many -----
	...listProperties(show('getAll', 'getChunks', 'getComments')),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: show('getAll') },
		options: [
			{
				displayName: 'Created After',
				name: 'createdAfter',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Created Before',
				name: 'createdBefore',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'de',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Matches title, author or source',
			},
			{
				displayName: 'Stance',
				name: 'stance',
				type: 'options',
				options: stanceOptions,
				default: 'neutral',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Failed', value: 'failed' },
					{ name: 'Processing', value: 'processing' },
					{ name: 'Ready', value: 'ready' },
					{ name: 'Uploaded', value: 'uploaded' },
				],
				default: 'ready',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'energy, 2026',
				description: 'Comma-separated. A document must have all of them.',
			},
			{
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Updated Before',
				name: 'updatedBefore',
				type: 'dateTime',
				default: '',
			},
		],
	},
];

function splitList(value: unknown): string[] {
	return String(value ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part !== '');
}

/** n8n dateTime values may lack a zone; the API rejects those. */
function toIsoWithZone(value: unknown): string {
	return new Date(String(value)).toISOString();
}

/** Maps the n8n field names to the API's, dropping blanks. */
function metadataBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};
	if (fields.title !== undefined) body.title = fields.title;
	if (fields.stance !== undefined) body.stance = fields.stance;
	if (fields.author !== undefined) body.author = fields.author;
	if (fields.source !== undefined) body.source = fields.source;
	if (fields.language !== undefined) body.language = fields.language;
	if (fields.metadataNotes !== undefined) body.metadata_notes = fields.metadataNotes;
	if (fields.documentDate !== undefined) {
		body.document_date =
			fields.documentDate === '' ? null : String(fields.documentDate).slice(0, 10);
	}
	if (fields.tags !== undefined) body.tags = splitList(fields.tags);
	return body;
}

/**
 * Multipart for a file upload. Tags go in as one `tags` field per value — the
 * API reads a JSON string as a single literal tag.
 */
async function fileForm(
	ctx: IExecuteFunctions,
	itemIndex: number,
	fields: IDataObject,
): Promise<{ form: FormData; fingerprint: IDataObject }> {
	const property = ctx.getNodeParameter('binaryPropertyName', itemIndex) as string;
	const binary = ctx.helpers.assertBinaryData(itemIndex, property);
	const buffer = await ctx.helpers.getBinaryDataBuffer(itemIndex, property);
	const fileName = binary.fileName ?? `upload.${binary.fileExtension ?? 'bin'}`;

	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		if (Array.isArray(value)) {
			for (const entry of value) form.append(key, String(entry));
		} else if (value !== null) {
			form.append(key, String(value));
		}
	}
	form.append('file', new Blob([new Uint8Array(buffer)], { type: binary.mimeType }), fileName);

	return {
		form,
		fingerprint: {
			...fields,
			file: fileName,
			sha256: createHash('sha256').update(buffer).digest('hex'),
		},
	};
}

/** Once processing succeeded, the document itself is more useful than the job. */
async function documentFromJob(
	ctx: IExecuteFunctions,
	job: { job: IDataObject; waited: boolean },
	documentId?: number,
): Promise<IDataObject> {
	if (!job.waited) return job.job;
	const id = documentId ?? (job.job.document_id as number);
	return (await wmRequest(ctx, 'GET', `/documents/${id}/`)) as IDataObject;
}

function fileNameFrom(disposition: unknown): string | undefined {
	if (typeof disposition !== 'string') return undefined;
	const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
	if (encoded) return decodeURIComponent(encoded[1]);
	return /filename="?([^";]+)"?/i.exec(disposition)?.[1];
}

export async function runDocument(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		const operation = ctx.getNodeParameter('operation', i) as string;
		const id =
			operation === 'create' || operation === 'getAll'
				? 0
				: (ctx.getNodeParameter('documentId', i) as number);
		const path = `/documents/${id}/`;

		switch (operation) {
			case 'create': {
				const fields = {
					title: ctx.getNodeParameter('title', i) as string,
					stance: ctx.getNodeParameter('stance', i) as string,
					...metadataBody(ctx.getNodeParameter('additionalFields', i, {}) as IDataObject),
				};

				if (ctx.getNodeParameter('inputType', i) === 'text') {
					const body = { ...fields, text: ctx.getNodeParameter('text', i) as string };
					return await documentFromJob(
						ctx,
						await submitJob(ctx, i, 'POST', '/documents/', body, body),
					);
				}

				const { form, fingerprint } = await fileForm(ctx, i, fields);
				return await documentFromJob(
					ctx,
					await submitJob(ctx, i, 'POST', '/documents/', form, fingerprint),
				);
			}

			case 'replaceFile': {
				const { form, fingerprint } = await fileForm(ctx, i, {});
				return await documentFromJob(
					ctx,
					await submitJob(ctx, i, 'PUT', `${path}file/`, form, fingerprint),
					id,
				);
			}

			case 'reprocess':
				return await documentFromJob(
					ctx,
					await submitJob(ctx, i, 'POST', `${path}reprocess/`, undefined, id),
					id,
				);

			case 'get':
				return (await wmRequest(ctx, 'GET', path)) as IDataObject;

			case 'getText':
				return (await wmRequest(ctx, 'GET', `${path}text/`)) as IDataObject;

			case 'getChunks':
				return await wmPaginate(ctx, `${path}chunks/`, {}, readLimit(ctx, i));

			case 'getComments':
				return await wmPaginate(ctx, `${path}comments/`, {}, readLimit(ctx, i));

			case 'update': {
				const body = metadataBody(ctx.getNodeParameter('updateFields', i, {}) as IDataObject);
				return (await wmRequest(ctx, 'PATCH', path, { body })) as IDataObject;
			}

			case 'delete':
				await wmRequest(ctx, 'DELETE', path);
				return { deleted: true, id };

			case 'downloadFile': {
				const response = (await wmRequest(ctx, 'GET', `${path}file/`, {
					encoding: 'arraybuffer',
					returnFullResponse: true,
				})) as { body: ArrayBuffer; headers: IDataObject };
				const headers = response.headers;
				// The API serves every file as octet-stream; without a MIME type, n8n
				// reads it from the file name, so a PDF shows up as a PDF.
				const contentType = headers['content-type'] as string | undefined;
				const binary = await ctx.helpers.prepareBinaryData(
					Buffer.from(response.body),
					fileNameFrom(headers['content-disposition']),
					contentType?.startsWith('application/octet-stream') ? undefined : contentType,
				);
				const field = ctx.getNodeParameter('outputBinaryPropertyName', i) as string;
				return { json: { id }, binary: { [field]: binary } };
			}

			default: {
				// getAll
				const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;
				const qs: IDataObject = {};
				if (filters.search) qs.search = filters.search;
				if (filters.status) qs.status = filters.status;
				if (filters.stance) qs.stance = filters.stance;
				if (filters.language) qs.language = filters.language;
				if (filters.tags) qs.tags = splitList(filters.tags);
				if (filters.createdAfter) qs.created_after = toIsoWithZone(filters.createdAfter);
				if (filters.createdBefore) qs.created_before = toIsoWithZone(filters.createdBefore);
				if (filters.updatedAfter) qs.updated_after = toIsoWithZone(filters.updatedAfter);
				if (filters.updatedBefore) qs.updated_before = toIsoWithZone(filters.updatedBefore);
				return await wmPaginate(ctx, '/documents/', qs, readLimit(ctx, i));
			}
		}
	});
}
