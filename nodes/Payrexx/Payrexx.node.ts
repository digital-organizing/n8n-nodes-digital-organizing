import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { customDescription } from './resources/custom';
import { invoiceDescription } from './resources/invoice';
import { paylinkDescription } from './resources/paylink';
import { qrCodeDescription } from './resources/qrCode';
import { subscriptionDescription } from './resources/subscription';
import { transactionDescription } from './resources/transaction';

export class Payrexx implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Payrexx',
		name: 'payrexx',
		icon: { light: 'file:../../icons/payrexx.svg', dark: 'file:../../icons/payrexx.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with transactions, subscriptions, paylinks and invoices in Payrexx',
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
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Paylink',
						value: 'paylink',
					},
					{
						name: 'QR Code',
						value: 'qrCode',
					},
					{
						name: 'Subscription',
						value: 'subscription',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
				],
				default: 'transaction',
			},
			...transactionDescription,
			...subscriptionDescription,
			...qrCodeDescription,
			...paylinkDescription,
			...invoiceDescription,
			...customDescription,
		],
	};
}
