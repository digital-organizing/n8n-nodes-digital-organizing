import type { INodeProperties } from 'n8n-workflow';

export const slugProperty: INodeProperties = {
	displayName: 'Slug',
	name: 'slug',
	type: 'string',
	default: '',
	required: true,
	description: 'The slug of the resource',
};

export const keyProperty: INodeProperties = {
	displayName: 'Key',
	name: 'key',
	type: 'string',
	default: '',
	required: true,
	description: 'The secret key for the resource',
};
