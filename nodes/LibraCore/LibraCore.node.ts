import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { campaignDescription } from './resources/campaign';
import { customDescription } from './resources/custom';

export class LibraCore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LibraCore',
		name: 'libraCore',
		icon: { light: 'file:../../icons/libracore.svg', dark: 'file:../../icons/libracore.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send campaign submissions to a LibraCore service platform',
		defaults: {
			name: 'LibraCore',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'libraCoreApi',
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
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Custom API Call',
						value: 'custom',
					},
				],
				default: 'campaign',
			},
			...campaignDescription,
			...customDescription,
		],
	};
}
