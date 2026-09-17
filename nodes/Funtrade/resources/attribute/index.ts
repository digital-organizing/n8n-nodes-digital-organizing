import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { clientLimitProperties } from '../../../shared/pagination';
import {
	CRM,
	additionalFieldsProperty,
	personIdProperty,
	recordIdProperty,
	referenceOptions,
	versionProperty,
} from '../../shared/descriptions';

const resource = 'attribute';
const show = { resource: [resource] };

/**
 * Attributes — `/crmapi/people/{id}/attributes`, the "Merkmale" of the funtrade UI.
 *
 * An attribute is a code from the instance's attribute list plus an optional value.
 * Codes with a fixed set of values have that set behind
 * `/crmapi/attributes/{code}/values`, which the Custom API Call resource can read;
 * Attribute Value is a free string here because the allowed values depend on the
 * code picked above it.
 */
const attributeFields: INodeProperties[] = [
	{
		displayName: 'Attribute Name or ID',
		name: 'attribute',
		type: 'options',
		typeOptions: referenceOptions('attributes', 'attribute', 'attribute_description'),
		default: '',
		description:
			'The attribute code. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: { send: { type: 'body', property: 'attribute' } },
	},
	{
		displayName: 'Attribute Value',
		name: 'attribute_value',
		type: 'string',
		default: '',
		description:
			'Value for the attribute. For a code with a fixed selection list this has to be one of its values, readable at /api/v1.0/crmapi/attributes/{code}/values.',
		routing: { send: { type: 'body', property: 'attribute_value' } },
	},
	{
		displayName: 'Valid From',
		name: 'valid_from',
		type: 'string',
		default: '',
		placeholder: '2026-01-01',
		routing: { send: { type: 'body', property: 'valid_from' } },
	},
	{
		displayName: 'Valid To',
		name: 'valid_to',
		type: 'string',
		default: '',
		placeholder: '2026-12-31',
		routing: { send: { type: 'body', property: 'valid_to' } },
	},
];

export const attributeDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an attribute',
				routing: {
					request: { method: 'POST', url: `=${CRM}/people/{{$parameter.personId}}/attributes` },
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an attribute',
				routing: {
					request: {
						method: 'DELETE',
						url: `=${CRM}/people/{{$parameter.personId}}/attributes/{{$parameter.attributeId}}`,
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many attributes',
				routing: {
					request: { method: 'GET', url: `=${CRM}/people/{{$parameter.personId}}/attributes` },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an attribute',
				routing: {
					request: {
						method: 'PATCH',
						url: `=${CRM}/people/{{$parameter.personId}}/attributes/{{$parameter.attributeId}}`,
					},
					send: { preSend: [mergeJsonBody('additionalFields', 'Additional Fields')] },
				},
			},
		],
		default: 'getAll',
	},

	personIdProperty(resource, ['getAll', 'create', 'update', 'delete']),
	recordIdProperty('attributeId', 'Attribute ID', resource, ['update', 'delete']),

	...clientLimitProperties(resource),

	{
		displayName: 'Fields',
		name: 'fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: attributeFields,
	},

	versionProperty(resource, ['update']),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Only the fields you add are sent, and only those change',
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: attributeFields,
	},

	additionalFieldsProperty(
		resource,
		['create', 'update'],
		'Extra keys merged into the request body, for fields of the PersonAttribute schema this node does not model and for sending an explicit null',
	),
];
