import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { customDescription, runCustom } from './resources/custom';
import {
	getTemplateFields,
	runTemplate,
	searchTemplates,
	templateDescription,
} from './resources/template';

/**
 * Template Studio renders personalised images from Canva designs: pick a template,
 * fill its text and image fields, get the image back as a file or as a public link.
 *
 * Programmatic rather than declarative: the fields come from the chosen template,
 * image fields may point at binary data of the item, and the answer becomes binary
 * data again — none of which routing can express.
 */
export class TemplateStudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Template Studio',
		name: 'templateStudio',
		icon: {
			light: 'file:../../icons/templatestudio.svg',
			dark: 'file:../../icons/templatestudio.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Render personalised images from Canva templates',
		defaults: {
			name: 'Template Studio',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'templateStudioApi',
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
						name: 'Template',
						value: 'template',
					},
				],
				default: 'template',
			},
			...templateDescription,
			...customDescription,
		],
	};

	methods = {
		listSearch: { searchTemplates },
		resourceMapping: { getTemplateFields },
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;

		if (resource === 'custom') return [await runCustom(this)];

		return [await runTemplate(this)];
	}
}
