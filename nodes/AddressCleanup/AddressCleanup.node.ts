import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { customDescription, runCustom } from './resources/custom';
import { matchDescription, runMatch } from './resources/match';
import { runStatus, statusDescription } from './resources/status';

/**
 * chaddr matches a manually typed Swiss address against the federal building and
 * dwelling register and gives back the canonical spelling, the stable EGID/EGAID
 * and coordinates — or a verdict saying why it would not commit.
 *
 * Programmatic rather than declarative: a run of many items is sent as a few
 * batch requests instead of one request per item, which routing cannot express.
 */
export class AddressCleanup implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Address Cleanup',
		name: 'addressCleanup',
		icon: {
			light: 'file:../../icons/addresscleanup.svg',
			dark: 'file:../../icons/addresscleanup.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Validate and correct Swiss addresses against the federal register',
		defaults: {
			name: 'Address Cleanup',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'addressCleanupApi',
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
						name: 'Address',
						value: 'address',
					},
					{
						name: 'Custom API Call',
						value: 'custom',
					},
					{
						name: 'Index',
						value: 'index',
					},
				],
				default: 'address',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['address'] } },
				options: [
					{
						name: 'Match',
						value: 'match',
						action: 'Match an address against the register',
						description:
							'Correct one address, or every address in the run, and write the result into the item',
					},
				],
				default: 'match',
			},
			...matchDescription,
			...statusDescription,
			...customDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		if (resource === 'custom') return [await runCustom(this)];
		if (resource === 'index') return [await runStatus(this)];

		return [await runMatch(this)];
	}
}
