import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { addressDescription } from './resources/address';
import { assignmentDescription } from './resources/assignment';
import { contactDescription } from './resources/contact';
import { customDescription } from './resources/custom';

export class Flyertool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Flyertool',
		name: 'flyertool',
		icon: { light: 'file:../../icons/flyertool.svg', dark: 'file:../../icons/flyertool.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Flyertool contacts, cluster assignments and addresses',
		defaults: {
			name: 'Flyertool',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'flyertoolApi',
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
						name: 'Address',
						value: 'address',
					},
					{
						name: 'Assignment',
						value: 'assignment',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Custom API Call',
						value: 'custom',
					},
				],
				default: 'contact',
			},
			...contactDescription,
			...assignmentDescription,
			...addressDescription,
			...customDescription,
		],
	};
}
