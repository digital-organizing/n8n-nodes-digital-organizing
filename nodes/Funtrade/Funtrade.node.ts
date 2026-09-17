import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { addressDescription } from './resources/address';
import { attributeDescription } from './resources/attribute';
import { customDescription } from './resources/custom';
import { interactionDescription } from './resources/interaction';
import { personDescription } from './resources/person';
import { pledgeDescription } from './resources/pledge';
import { publicationDescription } from './resources/publication';
import { taskDescription } from './resources/task';

/**
 * funtrade — the CRM of Arenae Consulting, used by Swiss NGOs for fundraising,
 * membership and correspondence.
 *
 * This node covers the CRM half of the API: people and the records that hang off
 * them. The Events half of the same API is not modelled and is reachable through
 * Custom API Call.
 *
 * Two things shape every write, both documented on the resources that carry them:
 * funtrade runs the user interface data-quality checks on API writes too, and it
 * runs a concurrent mutation check that wants the record version along with the
 * change. In practice an update is always read-then-write.
 */
export class Funtrade implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Funtrade',
		name: 'funtrade',
		icon: { light: 'file:../../icons/funtrade.svg', dark: 'file:../../icons/funtrade.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with funtrade people, addresses, pledges, interactions and tasks',
		defaults: {
			name: 'Funtrade',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'funtradeApi',
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
						name: 'Attribute',
						value: 'attribute',
					},
					{
						name: 'Custom API Call',
						value: 'custom',
					},
					{
						name: 'Interaction',
						value: 'interaction',
					},
					{
						name: 'Person',
						value: 'person',
					},
					{
						name: 'Pledge',
						value: 'pledge',
					},
					{
						name: 'Publication',
						value: 'publication',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: 'person',
			},
			...personDescription,
			...addressDescription,
			...attributeDescription,
			...interactionDescription,
			...pledgeDescription,
			...publicationDescription,
			...taskDescription,
			...customDescription,
		],
	};
}
