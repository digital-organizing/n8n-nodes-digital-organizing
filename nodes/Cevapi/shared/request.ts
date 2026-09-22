import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

export interface CevapiAnswer {
	type: 'bool' | 'choice' | 'score';
	value: boolean | string | number;
	confidence: number;
	scores?: IDataObject;
	margin?: number;
	expected?: number;
}

export interface CevapiDecideResponse {
	answers: Record<string, CevapiAnswer>;
	ms: number;
	backend_ms: number;
	n_criteria: number;
}

export async function cevapiRequest(
	ctx: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await ctx.getCredentials('cevapiApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

	return (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'cevapiApi', {
		method,
		url: `${baseUrl}${path}`,
		body,
		json: true,
	})) as IDataObject;
}

/**
 * The State field is a string in the UI, but workflows usually fill it with an
 * expression that produces JSON. Send objects as objects so the server can
 * label each field, and anything else as plain text.
 */
export function parseState(raw: unknown): IDataObject | IDataObject[] | string {
	if (typeof raw !== 'string') return raw as IDataObject | IDataObject[];

	const trimmed = raw.trim();
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			return JSON.parse(trimmed) as IDataObject | IDataObject[];
		} catch {
			// Not JSON after all — fall through and send it as text.
		}
	}
	return raw;
}

/** Scores are one probability per criterion and are noisy in the UI, so they are opt-in. */
export function stripScores(answer: CevapiAnswer): IDataObject {
	const copy = { ...answer } as unknown as IDataObject;
	delete copy.scores;
	return copy;
}
