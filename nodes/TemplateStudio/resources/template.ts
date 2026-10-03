import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeProperties,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getTemplate,
	listTemplates,
	templateStudioRequest,
	toNodeApiError,
	type TemplateDescriptor,
	type TemplateField,
} from '../shared/request';

const show = { resource: ['template'] };
const showRender = { resource: ['template'], operation: ['render'] };

/** Per-image settings the API takes as `<field>__<option>`; empty keeps the template's own. */
const IMAGE_OPTIONS = ['remove_bg', 'face_crop', 'fit'];
const YES_NO = [
	{ name: 'Yes', value: 'true' },
	{ name: 'No', value: 'false' },
];

export const templateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many templates',
				description: 'List the templates the API key may render, with their fields',
			},
			{
				name: 'Render',
				value: 'render',
				action: 'Render a template',
				description: 'Fill the fields of a template and get the image back',
			},
		],
		default: 'render',
	},
	{
		displayName: 'Template',
		name: 'template',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: showRender },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchTemplates', searchable: true },
			},
			{
				displayName: 'By Slug',
				name: 'slug',
				type: 'string',
				placeholder: 'testimonial',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		displayOptions: { show: showRender },
		typeOptions: {
			loadOptionsDependsOn: ['template.value'],
			resourceMapper: {
				resourceMapperMethod: 'getTemplateFields',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: true,
				noFieldsError: 'This template has no fields yet. Mark them in the visual editor.',
			},
		},
		description:
			'An image field takes a URL, a base64 string or the name of a binary field of the input item, such as "data"',
	},
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showRender },
		options: [
			{
				name: 'Image File',
				value: 'file',
				description: 'The image as binary data, with its public link in the JSON',
			},
			{
				name: 'Link Only',
				value: 'url',
				description: 'Only the public, expiring link, for APIs that want an image URL',
			},
		],
		default: 'file',
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: { show: { ...showRender, output: ['file'] } },
		description: 'Name of the binary field the image is written to',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: showRender },
		options: [
			{
				displayName: 'Fail if Field Not in Design',
				name: 'failOnMissing',
				type: 'boolean',
				default: true,
				description:
					'Whether to fail when a field was sent but its text or image is no longer in the design',
			},
			{
				displayName: 'Fail if No Face Found',
				name: 'failOnNoFace',
				type: 'boolean',
				default: true,
				description:
					'Whether to fail when an image is cropped around the face and no face was found in it',
			},
			{
				displayName: 'Fail on Text Overflow',
				name: 'failOnOverflow',
				type: 'boolean',
				default: true,
				description: 'Whether to fail when a text does not fit its box even at the smallest size',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'JPEG', value: 'jpeg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				default: 'png',
				description: 'Image format. Without it the template decides.',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 90,
				description: 'Compression quality for JPEG and WebP',
			},
			{
				displayName: 'Scale',
				name: 'scale',
				type: 'number',
				typeOptions: { minValue: 0.1, numberPrecision: 1 },
				default: 1,
				description: 'Device scale factor: 2 renders at twice the pixel size of the design',
			},
			{
				displayName: 'Send Files as Multipart Form',
				name: 'multipart',
				type: 'boolean',
				default: true,
				description:
					'Whether to upload binary fields as files instead of base64 in JSON, which is about a third smaller for large photos',
			},
		],
	},
];

export async function searchTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const needle = (filter ?? '').toLowerCase();
	const templates = await listTemplates(this);
	return {
		results: templates
			.filter((t) => `${t.name} ${t.slug}`.toLowerCase().includes(needle))
			.map((t) => ({ name: `${t.name} (${t.width}×${t.height})`, value: t.slug })),
	};
}

/** What the template does when the setting is left out, shown next to its name. */
function templateSetting(value: boolean | string | undefined): string {
	if (value === undefined) return '';
	if (typeof value === 'boolean') return ` (template: ${value ? 'yes' : 'no'})`;
	return ` (template: ${value})`;
}

function mapperFields(field: TemplateField): ResourceMapperField[] {
	const base = { defaultMatch: false, canBeUsedToMatch: false, display: true };
	if (field.type === 'text') {
		const limit = field.max_length ? `, max ${field.max_length} characters` : '';
		return [
			{
				...base,
				id: field.key,
				displayName: `${field.label} (text${limit})`,
				required: field.required,
				type: 'string',
			},
		];
	}

	const size =
		field.recommended_width && field.recommended_height
			? `, ${field.recommended_width}×${field.recommended_height}`
			: '';
	const option = { ...base, required: false, removed: true, type: 'options' as const };
	return [
		{
			...base,
			id: field.key,
			displayName: `${field.label} (image${size})`,
			required: field.required,
			type: 'string',
		},
		{
			...option,
			id: `${field.key}__remove_bg`,
			displayName: `${field.label}: Remove Background${templateSetting(field.remove_bg)}`,
			options: YES_NO,
		},
		{
			...option,
			id: `${field.key}__face_crop`,
			displayName: `${field.label}: Crop Around Face${templateSetting(field.face_crop)}`,
			options: YES_NO,
		},
		{
			...option,
			id: `${field.key}__fit`,
			displayName: `${field.label}: Fit${templateSetting(field.fit)}`,
			options: [
				{ name: 'Cover', value: 'cover' },
				{ name: 'Contain', value: 'contain' },
				{ name: 'Match Original Face', value: 'match_face' },
			],
		},
	];
}

export async function getTemplateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const slug = this.getNodeParameter('template', '', { extractValue: true }) as string;
	if (!slug) return { fields: [] };
	const template = await getTemplate(this, slug);
	return { fields: template.fields.flatMap(mapperFields) };
}

interface MappedFields {
	mappingMode: string;
	value: IDataObject | null;
}

/**
 * An image value that is no binary field of the item goes to the API as a URL or
 * base64. Anything this short that is neither a URL nor a data URL can only be a
 * mistyped field name, and the API would answer "Not a supported image file".
 */
function assertNotBinaryName(
	ctx: IExecuteFunctions,
	itemIndex: number,
	key: string,
	value: string,
): void {
	if (value.length > 64 || /^(https?:\/\/|data:)/i.test(value.trim())) return;
	const available = Object.keys(ctx.getInputData()[itemIndex].binary ?? {});
	throw new NodeOperationError(
		ctx.getNode(),
		`Image field "${key}": the item has no binary field "${value}"`,
		{
			itemIndex,
			description:
				available.length > 0
					? `Binary fields of the item: ${available.join(', ')}`
					: 'The item has no binary data. An image field takes a URL, a base64 string or the name of a binary field.',
		},
	);
}

/**
 * Builds the body of a render request from the template as it is now, not as the
 * node last saw it. The API rejects keys it does not know, so auto-mapped input
 * is cut down to the template's fields. An image value naming a binary field of
 * the item is replaced by that file: as a multipart upload, or base64 in JSON.
 */
async function renderBody(
	ctx: IExecuteFunctions,
	itemIndex: number,
	template: TemplateDescriptor,
	multipart: boolean,
): Promise<IDataObject | FormData> {
	const item = ctx.getInputData()[itemIndex];
	const mapped = ctx.getNodeParameter('fields', itemIndex) as MappedFields;
	const images = new Set(template.fields.filter((f) => f.type === 'image').map((f) => f.key));
	const known = new Set(template.fields.map((f) => f.key));
	for (const key of images) for (const option of IMAGE_OPTIONS) known.add(`${key}__${option}`);
	const values =
		mapped.mappingMode === 'autoMapInputData'
			? Object.fromEntries(Object.entries(item.json).filter(([key]) => known.has(key)))
			: (mapped.value ?? {});

	const body: IDataObject = {};
	const files: Array<{ key: string; name: string; blob: Blob }> = [];
	for (const [key, value] of Object.entries(values)) {
		if (value === null || value === undefined || value === '') continue;
		if (!images.has(key) || typeof value !== 'string') {
			body[key] = value;
			continue;
		}
		const binary = item.binary?.[value];
		if (binary === undefined) {
			assertNotBinaryName(ctx, itemIndex, key, value);
			body[key] = value;
			continue;
		}
		const buffer = await ctx.helpers.getBinaryDataBuffer(itemIndex, value);
		if (multipart) {
			const blob = new Blob([new Uint8Array(buffer)], { type: binary.mimeType });
			files.push({ key, name: binary.fileName ?? key, blob });
		} else {
			body[key] = buffer.toString('base64');
		}
	}
	if (files.length === 0) return body;

	const form = new FormData();
	for (const [key, value] of Object.entries(body)) form.append(key, String(value));
	for (const file of files) form.append(file.key, file.blob, file.name);
	return form;
}

/** What the render reports per field: a text that overflows, a face that is missing. */
function renderProblems(json: IDataObject, options: IDataObject): string[] {
	const report = (json.fields ?? {}) as Record<string, IDataObject>;
	const where = (flag: string, value: boolean) =>
		Object.keys(report).filter((key) => report[key]?.[flag] === value);
	const problems: string[] = [];
	const add = (enabled: unknown, label: string, keys: string[]) => {
		if (enabled === true && keys.length > 0) problems.push(`${label}: ${keys.join(', ')}`);
	};
	add(options.failOnOverflow, 'Text overflows', where('overflow', true));
	add(options.failOnNoFace, 'No face found', where('face_found', false));
	add(options.failOnMissing, 'Not in the design', where('found', false));
	return problems;
}

async function render(
	ctx: IExecuteFunctions,
	itemIndex: number,
	templates: Map<string, Promise<TemplateDescriptor>>,
): Promise<INodeExecutionData> {
	const slug = ctx.getNodeParameter('template', itemIndex, '', { extractValue: true }) as string;
	const output = ctx.getNodeParameter('output', itemIndex, 'file') as string;
	const options = ctx.getNodeParameter('options', itemIndex, {}) as IDataObject;

	// One lookup per template and run: the fields may have changed since the node was set up.
	if (!templates.has(slug)) templates.set(slug, getTemplate(ctx, slug, itemIndex));
	const template = await templates.get(slug)!;

	// `json` carries the image as base64 next to its metadata, so errors stay readable JSON.
	const qs: IDataObject = { response: output === 'url' ? 'url' : 'json' };
	for (const name of ['format', 'quality', 'scale']) {
		if (options[name] !== undefined) qs[name] = options[name];
	}
	const path = `/api/templates/${encodeURIComponent(slug)}/render/`;
	const body = await renderBody(ctx, itemIndex, template, options.multipart === true);
	const { data, ...json } = await templateStudioRequest(ctx, 'POST', path, body, qs);

	const problems = renderProblems(json, options);
	if (problems.length > 0) {
		throw new NodeOperationError(ctx.getNode(), problems.join(' · '), {
			itemIndex,
			description: `The image was rendered all the same: ${String(json.url)}`,
		});
	}

	const result: INodeExecutionData = { json, pairedItem: { item: itemIndex } };
	if (output !== 'url') {
		const property = ctx.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;
		const binary = await ctx.helpers.prepareBinaryData(
			Buffer.from(data as string, 'base64'),
			json.filename as string,
			json.mime_type as string,
		);
		result.binary = { [property]: binary };
	}
	return result;
}

export async function runTemplate(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const operation = ctx.getNodeParameter('operation', 0) as string;

	if (operation === 'getAll') {
		// The list does not depend on the input, so one call covers the whole run.
		try {
			const templates = await listTemplates(ctx);
			return templates.map((template) => ({ json: template, pairedItem: { item: 0 } }));
		} catch (error) {
			if (!ctx.continueOnFail()) throw toNodeApiError(ctx, error, 0);
			return [{ json: { error: (error as Error).message }, pairedItem: { item: 0 } }];
		}
	}

	const out: INodeExecutionData[] = [];
	const templates = new Map<string, Promise<TemplateDescriptor>>();
	for (let i = 0; i < ctx.getInputData().length; i++) {
		try {
			out.push(await render(ctx, i, templates));
		} catch (error) {
			const wrapped = error instanceof NodeOperationError ? error : toNodeApiError(ctx, error, i);
			if (!ctx.continueOnFail()) throw wrapped;
			out.push({
				json: { error: wrapped.message, details: wrapped.description ?? null },
				pairedItem: { item: i },
			});
		}
	}
	return out;
}
