import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { counterDescription } from './resources/counter';
import { campaignDescription } from './resources/campaign';
import { campaignEntryDescription } from './resources/campaignEntry';

export class DoCounter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Do Counter',
		name: 'doCounter',
		icon: { light: 'file:../../icons/counter.svg', dark: 'file:../../icons/counter.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume counters and campaigns from the Do Counter API',
		defaults: {
			name: 'Do Counter',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'doCounterApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.apiUrl}}',
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
						name: 'Campaign Entry',
						value: 'campaignEntry',
					},
					{
						name: 'Counter',
						value: 'counter',
					},
				],
				default: 'counter',
			},
			...counterDescription,
			...campaignDescription,
			...campaignEntryDescription,
		],
	};
}
