import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { customDescription } from './resources/custom';

export class Payrexx implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Payrexx',
		name: 'payrexx',
		icon: { light: 'file:../../icons/payrexx.svg', dark: 'file:../../icons/payrexx.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with payments, gateways and subscriptions in Payrexx',
		defaults: {
			name: 'Payrexx',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'payrexxApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					// TODO: add typed resources (Gateway, Transaction, Invoice, Subscription, Payment Link).
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
