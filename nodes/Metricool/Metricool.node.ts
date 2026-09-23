import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { analyticsDescription } from './resources/analytics';
import { bestTimeDescription } from './resources/bestTime';
import { brandDescription } from './resources/brand';
import { competitorDescription } from './resources/competitor';
import { customDescription } from './resources/custom';
import { postDescription } from './resources/post';

/**
 * Metricool — social media analytics, scheduling and reporting across the
 * networks a brand publishes on.
 *
 * The API behind it is the whole product's backend, some 540 paths, most of
 * which exist to serve the web app rather than to be called. This node models
 * the part a workflow has a reason to reach for: the planner (Post), the reports
 * (Analytics, Best Time, Competitor) and the brand list every one of them needs
 * an ID from. The rest is reachable through Custom API Call.
 *
 * Two things shape every operation here:
 *
 * - **Everything is scoped to one brand.** Metricool calls it `blogId` on the
 *   wire; the node calls it Brand and fills the dropdown from the account's own
 *   list, since the ID is otherwise only visible in the web app's URL.
 * - **Every answer is wrapped** in `{metadata, page, data}`. The operations
 *   unwrap `data`, so a workflow sees the rows, not the envelope.
 */
export class Metricool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Metricool',
		name: 'metricool',
		icon: { light: 'file:../../icons/metricool.svg', dark: 'file:../../icons/metricool.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule posts and read analytics from Metricool',
		defaults: {
			name: 'Metricool',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'metricoolApi',
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
						name: 'Analytics',
						value: 'analytics',
					},
					{
						name: 'Best Time',
						value: 'bestTime',
					},
					{
						name: 'Brand',
						value: 'brand',
					},
					{
						name: 'Competitor',
						value: 'competitor',
					},
					{
						name: 'Custom API Call',
						value: 'custom',
					},
					{
						name: 'Post',
						value: 'post',
					},
				],
				default: 'post',
			},
			...postDescription,
			...analyticsDescription,
			...bestTimeDescription,
			...brandDescription,
			...competitorDescription,
			...customDescription,
		],
	};
}
