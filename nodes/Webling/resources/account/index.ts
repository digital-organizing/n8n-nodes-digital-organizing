import type { INodeProperties } from 'n8n-workflow';
import { API } from '../../shared/descriptions';

const resource = 'account';
const show = { resource: [resource] };

/**
 * The account behind the key — `/currentuser` and `/quota`.
 *
 * **Who Am I** is what Webling documents for checking that a key is still valid
 * and what it is called; the credential test uses the same endpoint.
 *
 * **Get Quota** answers what the subscription allows and how much of it is used.
 * Members, entries, period groups and storage each have a `max` of -1 when
 * unlimited — worth reading before a bulk import, since exceeding a quota
 * answers 403 with the type `QuotaExceeded` rather than a validation error.
 */
export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Quota',
				value: 'quota',
				action: 'Get the account quota',
				routing: { request: { method: 'GET', url: `${API}/quota` } },
			},
			{
				name: 'Who Am I',
				value: 'whoAmI',
				action: 'Get the authenticated user',
				routing: { request: { method: 'GET', url: `${API}/currentuser` } },
			},
		],
		default: 'whoAmI',
	},
];
