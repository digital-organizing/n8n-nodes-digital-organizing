import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { customDescription } from './resources/custom';
import { paymentDescription } from './resources/payment';
import { searchDescription } from './resources/search';
import { subscriptionDescription } from './resources/subscription';
import { subscriptionPlanDescription } from './resources/subscriptionPlan';
import { supporterDescription } from './resources/supporter';
import { webhookDescription } from './resources/webhook';

export class RaiseNow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RaiseNow',
		name: 'raiseNow',
		icon: { light: 'file:../../icons/raisenow.svg', dark: 'file:../../icons/raisenow.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with payments, supporters and subscriptions in the RaiseNow EPayment API',
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
					{
						name: 'Custom API Call',
						value: 'custom',
					},
					{
						name: 'Payment',
						value: 'payment',
					},
					{
						name: 'Search',
						value: 'search',
					},
					{
						name: 'Subscription',
						value: 'subscription',
					},
					{
						name: 'Subscription Plan',
						value: 'subscriptionPlan',
					},
					{
						name: 'Supporter',
						value: 'supporter',
					},
					{
						name: 'Webhook',
						value: 'webhook',
					},
				],
				default: 'payment',
			},
			...paymentDescription,
			...supporterDescription,
			...subscriptionDescription,
			...subscriptionPlanDescription,
			...searchDescription,
			...webhookDescription,
			...customDescription,
		],
	};
}
