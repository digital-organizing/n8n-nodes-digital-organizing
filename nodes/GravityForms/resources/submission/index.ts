import type { INodeProperties } from 'n8n-workflow';
import { mergeJsonBody } from '../../../shared/mergeJsonBody';
import { GF } from '../../shared/descriptions';

const resource = 'submission';
const show = { resource: [resource] };

/**
 * Submissions — `/forms/[FORM_ID]/submissions`.
 *
 * This is the endpoint that runs a value set through the form the way a visitor
 * would: validation, anti-spam checks, the entry, add-on feeds, notifications
 * and the confirmation. Entry → Create writes past all of that.
 *
 * Values are keyed by *input name*, `input_1`, `input_4_3` — the names in the
 * form markup, not the dotted field IDs an entry uses. It is the only endpoint
 * here that needs no Gravity Forms capability.
 *
 * A failed validation is a 200 with `is_valid: false` and `validation_messages`,
 * not an HTTP error, so check that field rather than relying on the node to fail.
 */
export const submissionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Submit',
				value: 'submit',
				action: 'Submit a form',
				routing: {
					request: {
						method: 'POST',
						url: `=${GF}/forms/{{$parameter.formId}}/submissions`,
						// A redirect confirmation answers with a Location header beside the
						// JSON body. Following it would return the landing page instead of
						// the submission result.
						disableFollowRedirect: true,
					},
					send: { preSend: [mergeJsonBody('inputValues', 'Input Values')] },
				},
			},
			{
				name: 'Validate',
				value: 'validate',
				action: 'Validate a form submission',
				routing: {
					request: {
						method: 'POST',
						url: `=${GF}/forms/{{$parameter.formId}}/submissions/validation`,
					},
					send: { preSend: [mergeJsonBody('inputValues', 'Input Values')] },
				},
			},
		],
		default: 'submit',
	},

	{
		displayName: 'Form ID',
		name: 'formId',
		type: 'string',
		default: '',
		required: true,
		description: 'The form to submit to',
		displayOptions: { show },
	},
	{
		displayName: 'Input Values',
		name: 'inputValues',
		type: 'json',
		default: '{}',
		required: true,
		placeholder: '{ "input_1": "value", "input_4_3": "Neil", "input_4_6": "Armstrong" }',
		description:
			'The values to submit, keyed by input name. These are the name attributes of the form markup — input_4_3 where an entry would say 4.3 — and the form preview is the quickest way to read them off.',
		displayOptions: { show },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Field Values',
				name: 'field_values',
				type: 'json',
				default: '{}',
				description:
					'Dynamic population parameters and their values, used by conditional logic to decide which fields are validated',
				routing: {
					send: {
						type: 'body',
						property: 'field_values',
						value: '={{ JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Source Page',
				name: 'source_page',
				type: 'number',
				default: 1,
				description: 'For multi-page forms, the page these values were submitted from',
				routing: { send: { type: 'body', property: 'source_page' } },
			},
			{
				displayName: 'Target Page',
				name: 'target_page',
				type: 'number',
				default: 0,
				description:
					'For multi-page forms, the page to load next. 0 submits the form rather than paging on.',
				routing: { send: { type: 'body', property: 'target_page' } },
			},
		],
	},
];
