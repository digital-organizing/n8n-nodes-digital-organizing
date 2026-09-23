import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

/** One candidate building from the register, as `/v1/match` returns it. */
export interface AddressCandidate extends IDataObject {
	score: number;
	verdict: string;
	street: string;
	houseNumber: string | null;
	zip: string;
	locality: string;
	canton: string | null;
	municipality: string | null;
	municipalityNumber: number | null;
	egid: number | null;
	edid: number | null;
	egaid: number | null;
	lat: number | null;
	lon: number | null;
	components: IDataObject;
}

export interface AddressMatchResponse extends IDataObject {
	verdict: 'exact' | 'match' | 'candidate' | 'no_match' | 'po_box';
	parsed: IDataObject;
	results: AddressCandidate[];
}

export interface AddressBatchResponse extends IDataObject {
	count: number;
	results: AddressMatchResponse[];
}

export async function addressCleanupRequest(
	ctx: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await ctx.getCredentials('addressCleanupApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

	return (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'addressCleanupApi', {
		method,
		url: `${baseUrl}${path}`,
		body,
		json: true,
	})) as IDataObject;
}
