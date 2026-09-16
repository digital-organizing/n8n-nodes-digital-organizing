import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
} from 'n8n-workflow';

/**
 * Folds the "Custom Fields" JSON parameter into the request body.
 *
 * Campaign payloads carry project-specific keys next to the common contact and
 * consent fields — the Mietzinsrechner sends `mzr_*`, another campaign will send
 * something else — so those go in as raw JSON rather than as node parameters.
 */
export async function mergeCustomFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const raw = (this.getNodeParameter('customFields', '{}') as string) || '{}';

	let parsed: IDataObject;
	try {
		parsed = JSON.parse(raw) as IDataObject;
	} catch {
		throw new NodeOperationError(this.getNode(), 'Custom Fields is not valid JSON', {
			description: `Could not parse: ${raw}`,
		});
	}

	requestOptions.body = {
		...((requestOptions.body ?? {}) as IDataObject),
		...parsed,
	};

	return requestOptions;
}
