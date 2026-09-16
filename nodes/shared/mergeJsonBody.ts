import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type PreSendAction,
} from 'n8n-workflow';

/**
 * Builds a preSend action that folds a JSON node parameter into the request body.
 *
 * Several of these APIs accept arbitrary keys next to their documented ones —
 * campaign-specific fields, informational extras. Those are better typed as one
 * JSON parameter than as a list of node parameters we would have to keep in sync.
 */
export function mergeJsonBody(parameterName: string, displayName: string): PreSendAction {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const raw = (this.getNodeParameter(parameterName, '{}') as string) || '{}';

		let parsed: IDataObject;
		try {
			parsed = JSON.parse(raw) as IDataObject;
		} catch {
			throw new NodeOperationError(this.getNode(), `${displayName} is not valid JSON`, {
				description: `Could not parse: ${raw}`,
			});
		}

		requestOptions.body = {
			...((requestOptions.body ?? {}) as IDataObject),
			...parsed,
		};

		return requestOptions;
	};
}
