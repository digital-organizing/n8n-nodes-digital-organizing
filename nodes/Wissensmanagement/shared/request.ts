import { createHash } from 'node:crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';

export const CREDENTIAL = 'wissensmanagementApi';

const API_PREFIX = '/api/v1';

/** The API caps `page_size` at 200. */
const MAX_PAGE_SIZE = 200;

/** Every call that starts a job answers 202 with one of these. */
export interface Job extends IDataObject {
	id: string;
	kind: string;
	status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
	document_id: number | null;
	session_id: number | null;
	result: IDataObject | null;
	error_code: string;
	polling_url: string;
}

interface Page extends IDataObject {
	next: string | null;
	results: IDataObject[];
}

type Context = IExecuteFunctions | IHookFunctions | IWebhookFunctions;

export interface WmRequestOptions {
	body?: IHttpRequestOptions['body'];
	qs?: IDataObject;
	headers?: IDataObject;
	encoding?: IHttpRequestOptions['encoding'];
	returnFullResponse?: boolean;
}

/**
 * Three shapes of path come back to us: our own `/documents/`, the API's
 * root-relative `polling_url` (`/api/v1/jobs/<id>/`), and DRF's absolute
 * cursor `next` links. The last is rebuilt on the credential's base URL, since
 * behind a proxy the API may render its own links as http://.
 */
/**
 * People paste the instance in every form: with or without https://, with the
 * /api/v1 they saw in the docs, with a trailing slash. All of them mean the root.
 */
export function normalizeBaseUrl(value: string): string {
	const trimmed = value
		.trim()
		.replace(/\/+$/, '')
		.replace(/\/api\/v1$/i, '');
	return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function resolveUrl(baseUrl: string, path: string): string {
	if (/^https?:\/\//i.test(path)) {
		const url = new URL(path);
		return `${baseUrl}${url.pathname}${url.search}`;
	}
	if (path.startsWith(`${API_PREFIX}/`)) return `${baseUrl}${path}`;
	return `${baseUrl}${API_PREFIX}${path}`;
}

export async function wmRequest(
	ctx: Context,
	method: IHttpRequestMethods,
	path: string,
	options: WmRequestOptions = {},
): Promise<unknown> {
	const credentials = await ctx.getCredentials(CREDENTIAL);
	const baseUrl = normalizeBaseUrl(credentials.baseUrl as string);

	const request: IHttpRequestOptions = {
		method,
		url: resolveUrl(baseUrl, path),
		qs: options.qs,
		// Repeated keys (`tags=a&tags=b`) are how the API takes several values.
		arrayFormat: 'repeat',
		headers: options.headers,
		body: options.body,
		json: options.encoding === undefined,
		encoding: options.encoding,
		returnFullResponse: options.returnFullResponse,
	};

	return await (ctx as IExecuteFunctions).helpers.httpRequestWithAuthentication.call(
		ctx as IExecuteFunctions,
		CREDENTIAL,
		request,
	);
}

/**
 * Follows DRF's cursor pagination until `limit` rows are collected, or every
 * row when `limit` is undefined. The `next` link carries the cursor, the page
 * size and the filters, so only the first request sends `qs`.
 */
export async function wmPaginate(
	ctx: Context,
	path: string,
	qs: IDataObject = {},
	limit?: number,
): Promise<IDataObject[]> {
	const rows: IDataObject[] = [];
	const pageSize = limit === undefined ? MAX_PAGE_SIZE : Math.min(limit, MAX_PAGE_SIZE);

	let page = (await wmRequest(ctx, 'GET', path, {
		qs: { ...qs, page_size: pageSize },
	})) as Page;

	for (;;) {
		rows.push(...page.results);
		if (page.next === null || (limit !== undefined && rows.length >= limit)) break;
		page = (await wmRequest(ctx, 'GET', page.next)) as Page;
	}

	return limit === undefined ? rows : rows.slice(0, limit);
}

/**
 * The API remembers an Idempotency-Key for seven days and answers a repeat
 * with the original job — or 409 if the input differs. The generated key is
 * stable across n8n's Retry On Fail inside one execution, so a retried upload
 * does not create a second document. The fingerprint keeps it distinct when the
 * same item index sends different input, e.g. across loop iterations.
 */
export function idempotencyKey(
	ctx: IExecuteFunctions,
	itemIndex: number,
	request: string,
	fingerprint: unknown,
): string {
	const override = (ctx.getNodeParameter('options.idempotencyKey', itemIndex, '') as string).trim();
	if (override !== '') return override;

	return createHash('sha256')
		.update(
			[
				ctx.getExecutionId(),
				ctx.getNode().name,
				itemIndex,
				request,
				JSON.stringify(fingerprint),
			].join('|'),
		)
		.digest('hex');
}

interface HttpErrorResponse {
	status?: number;
	headers?: IDataObject;
	data?: unknown;
	body?: unknown;
}

/** n8n wraps the original HTTP error in NodeApiError.cause. */
function httpErrorResponse(error: unknown): HttpErrorResponse | undefined {
	const seen = new Set<unknown>();
	while (typeof error === 'object' && error !== null && !seen.has(error)) {
		seen.add(error);
		const current = error as { response?: HttpErrorResponse; cause?: unknown };
		if (current.response !== undefined) return current.response;
		error = current.cause;
	}
	return undefined;
}

/** Pulls the API's `{error: {code, message, fields}, request_id}` out of an HTTP error. */
function apiErrorBody(error: unknown): IDataObject | undefined {
	const response = httpErrorResponse(error);
	const data = response?.data ?? response?.body;
	if (typeof data === 'object' && data !== null && 'error' in data) return data as IDataObject;
	return undefined;
}

/** Wraps any failure in a NodeApiError that shows the API's own message. */
export function toNodeApiError(ctx: Context, error: unknown, itemIndex: number): NodeApiError {
	const wrapped =
		error instanceof NodeApiError
			? error
			: new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex });
	wrapped.context.itemIndex = itemIndex;

	const body = apiErrorBody(error);
	if (body === undefined) return wrapped;

	const detail = body.error as IDataObject;
	const fields = detail.fields as IDataObject | undefined;
	const fieldText =
		fields !== undefined && Object.keys(fields).length > 0
			? ` Fields: ${JSON.stringify(fields)}.`
			: '';

	// Enrich the existing wrapper: re-wrapping a NodeApiError returns it unchanged.
	wrapped.message = `${detail.message as string} (${detail.code as string})`;
	wrapped.description = `${fieldText} Request ID: ${body.request_id as string}`.trim();
	return wrapped;
}

function retryAfterSeconds(error: unknown): number | undefined {
	const response = httpErrorResponse(error);
	if (response?.status !== 429) return undefined;
	const value = Number(response.headers?.['retry-after']);
	return Number.isFinite(value) && value >= 0 ? value : 30;
}

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

/**
 * Polls a job until it finishes. The server dispatches every 15 s, so the
 * backoff follows the API docs: 2 s, growing by half each round, capped at 30 s.
 * A failed or cancelled job becomes an error; running out of time does too,
 * with the job ID in the message so the workflow can pick it up via Job → Get.
 */
export async function waitForJob(
	ctx: IExecuteFunctions,
	job: Job,
	timeoutSeconds: number,
	itemIndex: number,
): Promise<Job> {
	const deadline = Date.now() + timeoutSeconds * 1000;
	let delay = 2;
	let current = job;

	while (!TERMINAL.has(current.status)) {
		const remaining = (deadline - Date.now()) / 1000;
		if (remaining <= 0) {
			throw new NodeApiError(ctx.getNode(), current as unknown as JsonObject, {
				itemIndex,
				message: `Job ${current.id} did not finish within ${timeoutSeconds} seconds`,
				description: `It is still ${current.status}. Fetch it later with Job → Get, or raise the timeout.`,
			});
		}

		await sleep(Math.min(delay, remaining) * 1000);
		delay = Math.min(delay * 1.5, 30);

		try {
			current = (await wmRequest(ctx, 'GET', `/jobs/${current.id}/`)) as Job;
		} catch (error) {
			const wait = retryAfterSeconds(error);
			if (wait === undefined) throw toNodeApiError(ctx, error, itemIndex);
			delay = Math.max(delay, wait);
		}
	}

	if (current.status !== 'succeeded') {
		throw new NodeApiError(ctx.getNode(), current as unknown as JsonObject, {
			itemIndex,
			message: `Job ${current.id} ${current.status}${current.error_code ? `: ${current.error_code}` : ''}`,
		});
	}

	return current;
}

/**
 * Runs `operation` once per input item. It returns one object, several (one
 * output item each, e.g. search sources), or ready-made items (binary
 * downloads). Errors respect Continue On Fail.
 */
export async function forEachItem(
	ctx: IExecuteFunctions,
	operation: (itemIndex: number) => Promise<IDataObject | IDataObject[] | INodeExecutionData>,
): Promise<INodeExecutionData[]> {
	const items = ctx.getInputData();
	const out: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const result = await operation(i);
			if (Array.isArray(result)) {
				out.push(...result.map((json) => ({ json, pairedItem: { item: i } })));
			} else if (isExecutionData(result)) {
				out.push({ ...result, pairedItem: { item: i } });
			} else {
				out.push({ json: result, pairedItem: { item: i } });
			}
		} catch (error) {
			if (!ctx.continueOnFail()) throw toNodeApiError(ctx, error, i);
			out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
		}
	}

	return out;
}

function isExecutionData(value: IDataObject | INodeExecutionData): value is INodeExecutionData {
	return typeof value.json === 'object' && value.json !== null && 'binary' in value;
}
