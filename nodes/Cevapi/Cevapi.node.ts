import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { customDescription, runCustom } from './resources/custom';
import { decideDescription, runDecide } from './resources/decide';
import { configuredOutputs, routeDescription, runRoute } from './resources/route';

/**
 * cevAPI answers typed questions about a piece of content — yes/no, one of N,
 * a level — and returns a calibrated confidence with every answer. It generates
 * no text, so a decision costs a few hundred milliseconds instead of an LLM call.
 *
 * Route gives the node one output per option, which saves the usual
 * decide-then-Switch pair, and can send doubtful items down their own branch.
 */
export class Cevapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'cevAPI',
		name: 'cevapi',
		icon: {
			light: 'file:../../icons/cevapi.svg',
			dark: 'file:../../icons/cevapi.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Classify and route content with fast, calibrated decisions',
		defaults: {
			name: 'cevAPI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		credentials: [
			{
				name: 'cevapiApi',
				required: true,
			},
		],
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
						name: 'Decision',
						value: 'decision',
					},
				],
				default: 'decision',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['decision'] } },
				options: [
					{
						name: 'Ask',
						value: 'decide',
						action: 'Ask questions about the content',
						description: 'Answer one or more questions and write the answers into the item',
					},
					{
						name: 'Route',
						value: 'route',
						action: 'Route the content to an output',
						description: 'Send the item to the output whose option fits best',
					},
				],
				default: 'decide',
			},
			...decideDescription,
			...routeDescription,
			...customDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		if (resource === 'custom') {
			return [await runCustom(this)];
		}

		const operation = this.getNodeParameter('operation', 0) as string;
		if (operation === 'route') {
			return await runRoute(this);
		}

		return [await runDecide(this)];
	}
}
