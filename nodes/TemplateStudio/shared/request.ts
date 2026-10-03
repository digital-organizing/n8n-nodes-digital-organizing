import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

type Context = IExecuteFunctions | ILoadOptionsFunctions;

/** One replaceable text or image of a template, as `/api/templates/` describes it. */
export interface TemplateField extends IDataObject {
	key: string;
	type: 'text' | 'image';
	label: string;
	description: string;
	required: boolean;
	max_length?: number | null;
	truncate?: boolean;
	recommended_width?: number | null;
	recommended_height?: number | null;
	fit?: string;
	face_crop?: boolean;
	remove_bg?: boolean;
}

export interface TemplateDescriptor extends IDataObject {
	slug: string;
	name: string;
	description: string;
	width: number;
	height: number;
	fields: TemplateField[];
}

export async function templateStudioRequest(
	ctx: Context,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject | FormData,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await ctx.getCredentials('templateStudioApi');
	const baseUrl = (credentials.baseUrl as string).trim().replace(/\/+$/, '');

	return (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'templateStudioApi', {
		method,
		url: `${baseUrl}${path}`,
		body,
		qs,
		json: true,
	})) as IDataObject;
}

export async function listTemplates(ctx: Context): Promise<TemplateDescriptor[]> {
	const response = await templateStudioRequest(ctx, 'GET', '/api/templates/');
	return (response.templates ?? []) as TemplateDescriptor[];
}

/** n8n wraps the original HTTP error, so the status sits on the error or on a cause. */
function statusOf(error: unknown): number | undefined {
	const seen = new Set<unknown>();
	while (typeof error === 'object' && error !== null && !seen.has(error)) {
		seen.add(error);
		const current = error as {
			httpCode?: unknown;
			status?: unknown;
			response?: { status?: unknown };
			cause?: unknown;
		};
		const status = Number(current.response?.status ?? current.httpCode ?? current.status);
		if (Number.isInteger(status) && status > 0) return status;
		error = current.cause;
	}
	return undefined;
}

/** An unknown slug answers with an HTML 404, which says nothing about the template. */
export async function getTemplate(
	ctx: Context,
	slug: string,
	itemIndex?: number,
): Promise<TemplateDescriptor> {
	const path = `/api/templates/${encodeURIComponent(slug)}/`;
	try {
		return (await templateStudioRequest(ctx, 'GET', path)) as TemplateDescriptor;
	} catch (error) {
		if (statusOf(error) !== 404) throw toNodeApiError(ctx, error, itemIndex ?? 0);
		throw new NodeOperationError(
			ctx.getNode(),
			`Template "${slug}" does not exist or this API key may not use it`,
			{ itemIndex, description: 'Get Many lists the templates the key may render.' },
		);
	}
}

/** n8n wraps the original HTTP error in NodeApiError.cause. */
function apiErrorBody(error: unknown): IDataObject | undefined {
	const seen = new Set<unknown>();
	while (typeof error === 'object' && error !== null && !seen.has(error)) {
		seen.add(error);
		const current = error as { response?: { data?: unknown; body?: unknown }; cause?: unknown };
		const data = current.response?.data ?? current.response?.body;
		if (typeof data === 'object' && data !== null && 'error' in data) return data as IDataObject;
		error = current.cause;
	}
	return undefined;
}

/**
 * Wraps a failure in a NodeApiError that shows the API's own `{error, fields}`:
 * a rejected render names the field at fault, which the bare status code does not.
 */
export function toNodeApiError(ctx: Context, error: unknown, itemIndex: number): NodeApiError {
	const wrapped =
		error instanceof NodeApiError
			? error
			: new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex });
	wrapped.context.itemIndex = itemIndex;

	const body = apiErrorBody(error);
	if (body === undefined) return wrapped;

	wrapped.message = String(body.error);
	const fields = (body.fields ?? {}) as IDataObject;
	const details = Object.entries(fields).map(([key, message]) => `${key}: ${String(message)}`);
	if (details.length > 0) wrapped.description = details.join(' · ');
	return wrapped;
}
