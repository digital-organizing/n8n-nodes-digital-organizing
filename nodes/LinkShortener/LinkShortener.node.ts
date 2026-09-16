import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { customDescription } from './resources/custom';
import { domainDescription } from './resources/domain';
import { groupDescription } from './resources/group';
import { identityDescription } from './resources/identity';
import { linkDescription } from './resources/link';

export class LinkShortener implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Link Shortener',
		name: 'linkShortener',
		icon: {
			light: 'file:../../icons/linkshortener.svg',
			dark: 'file:../../icons/linkshortener.dark.svg',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and manage short links, their open graph metadata and their view counts',
		defaults: {
			name: 'Link Shortener',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'linkShortenerApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Custom API Call',
						value: 'custom',
					},
					{
						name: 'Domain',
						value: 'domain',
					},
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'Identity',
						value: 'identity',
					},
					{
						name: 'Link',
						value: 'link',
					},
				],
				default: 'link',
			},
			...linkDescription,
			...domainDescription,
			...groupDescription,
			...identityDescription,
			...customDescription,
		],
	};
}
