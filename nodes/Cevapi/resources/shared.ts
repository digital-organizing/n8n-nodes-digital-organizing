import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

/** The content to judge. Shared by every decision operation. */
export function stateProperty(show: IDisplayOptions['show']): INodeProperties {
	return {
		displayName: 'State',
		name: 'state',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '={{ JSON.stringify($json) }}',
		required: true,
		displayOptions: { show },
		description:
			'The content to judge. JSON is sent field by field, anything else as plain text. Content may be in any language; the criteria should be English.',
	};
}

/** A named question set stored on the server, listed by GET /v1/profiles. */
export function profileProperty(show: IDisplayOptions['show']): INodeProperties {
	return {
		displayName: 'Profile Name',
		name: 'profile',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'inbox',
		displayOptions: { show },
		description: 'Name of a question set stored on the server, e.g. a file profiles/inbox.JSON',
	};
}
