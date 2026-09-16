import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { customDescription } from './resources/custom';

export class RaiseNow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RaiseNow',
		name: 'raiseNow',
		icon: { light: 'file:../../icons/raisenow.svg', dark: 'file:../../icons/raisenow.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with donations, donors and campaigns in RaiseNow',
		defaults: {
			name: 'RaiseNow',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'raiseNowApi',
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
					// TODO: add typed resources (Transaction, Donor, Campaign, Recurring Donation).
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
