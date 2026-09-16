import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { customDescription } from './resources/custom';

export class Cura implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cura Fundraising',
		name: 'cura',
		icon: { light: 'file:../../icons/cura.svg', dark: 'file:../../icons/cura.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with contacts, donations and mailings in Cura Fundraising',
		defaults: {
			name: 'Cura Fundraising',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'curaApi',
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
					// TODO: add typed resources (Contact, Donation, Mailing).
					{
						name: 'Custom API Call',
						value: 'custom',
					},
				],
				default: 'custom',
			},
			...customDescription,
		],
	};
}
