import type { INodeProperties, INodePropertyTypeOptions } from 'n8n-workflow';

/** Every CRM endpoint lives under this prefix; the version is part of the path. */
export const CRM = '/api/v1.0/crmapi';

/**
 * A dropdown filled from one of the CRM reference lists.
 *
 * funtrade stores codes, not labels — `salutation_code`, `language_code`,
 * `address_type` — and which codes exist is per instance. Rather than hardcode a
 * guess, these fields read the instance's own list. The lists are small and have
 * no paging, so one request fills the dropdown.
 */
export function referenceOptions(
	path: string,
	valueKey: string,
	nameKey: string,
): INodePropertyTypeOptions {
	return {
		loadOptions: {
			routing: {
				request: { method: 'GET', url: `${CRM}/${path}` },
				output: {
					postReceive: [
						{
							type: 'setKeyValue',
							properties: {
								name: `={{ $responseItem.${nameKey} || $responseItem.${valueKey} }}`,
								value: `={{ $responseItem.${valueKey} }}`,
							},
						},
						{ type: 'sort', properties: { key: 'name' } },
					],
				},
			},
		},
	};
}

/** The person a record hangs off. Every sub-resource is addressed through it. */
export function personIdProperty(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Person ID',
		name: 'personId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Funtrade person number the record belongs to',
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

/** The ID of a sub-record. These are strings, unlike the numeric person ID. */
export function recordIdProperty(
	name: string,
	displayName: string,
	resource: string,
	operations: string[],
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

/**
 * funtrade runs a concurrent mutation check: a write has to carry the version the
 * record had when it was read, and is rejected if someone else changed it since.
 * So an update is always a read followed by a write — take this value from the
 * record the Get operation returned.
 */
export function versionProperty(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Version',
		name: 'version',
		type: 'number',
		default: 0,
		required: true,
		description:
			'Snapshot version of the record, taken from the record you read before updating. Funtrade rejects the write if the record changed in the meantime.',
		displayOptions: { show: { resource: [resource], operation: operations } },
		routing: { send: { type: 'body', property: 'version' } },
	};
}

type Override = {
	name: string;
	displayName: string;
	description: string;
	valueType?: 'boolean' | 'number' | 'string';
};

/**
 * The `qc_` flags.
 *
 * The API reuses the business logic behind the funtrade user interface, so every
 * data-validity check applies to it too: the ZIP has to exist, the street has to
 * exist at that ZIP, the house number has to exist in that street. A failing check
 * comes back as an error, and the right answer is usually to correct the data.
 *
 * These flags are the escape hatch for the cases where it is not — saving an
 * address that really does look like a duplicate, for instance. Adding one at all
 * means overruling a check, so they only appear in the request when set.
 */
export function qualityOverridesProperty(
	resource: string,
	operations: string[],
	options: Override[],
): INodeProperties {
	return {
		displayName: 'Data Quality Overrides',
		name: 'qualityOverrides',
		type: 'collection',
		placeholder: 'Add Override',
		default: {},
		description:
			'Flags that overrule a funtrade data-validity check for this write. Only add one when the check is wrong about your data.',
		displayOptions: { show: { resource: [resource], operation: operations } },
		options: options.map((o) => ({
			displayName: o.displayName,
			name: o.name,
			type: o.valueType ?? 'boolean',
			default: o.valueType === 'number' ? 0 : o.valueType === 'string' ? '' : true,
			description: o.description,
			routing: { send: { type: 'body', property: o.name } },
		})),
	};
}

/** Escape hatch for schema fields the node does not model, and for explicit nulls. */
export function additionalFieldsProperty(
	resource: string,
	operations: string[],
	description: string,
): INodeProperties {
	return {
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'json',
		default: '{}',
		description,
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}
