import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { accountDescription } from './resources/account';
import { customDescription } from './resources/custom';
import { definitionDescription } from './resources/definition';
import { memberDescription } from './resources/member';
import { recordDescription } from './resources/record';
import { replicationDescription } from './resources/replication';
import { transactionDescription } from './resources/transaction';

/**
 * Webling — membership, accounting and correspondence for Swiss clubs and NGOs.
 *
 * The API is unusually uniform: twenty-five object types, all with the same five
 * endpoints, the same query language and the same `{properties, parents, links}`
 * body. The node follows that shape rather than fighting it — **Member** for the
 * record everybody reaches for, **Record** for the same operations on any other
 * type — which is why six resources cover the whole documented surface.
 *
 * Three things shape every workflow built on it:
 *
 * - **There is no fixed schema.** A member's fields are configured per account
 *   and can be renamed at any time, so writes take a JSON `properties` object
 *   and **Definition** is how a workflow learns what this account calls things.
 * - **Lists answer with IDs**, not objects, until you ask for Full Objects. The
 *   node wraps bare IDs as `{id}` so they are usable items either way, and folds
 *   the ID back into a single Get — a Webling object does not carry its own.
 * - **The rate limit is real**: 500 requests a minute, with a documented
 *   recommendation to stay under 50. **Replication** is the answer for reading
 *   (ask what changed since a revision, not what exists) and **Transaction** for
 *   writing (many writes, one request, all or nothing).
 */
export class Webling implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webling',
		name: 'webling',
		icon: { light: 'file:../../icons/webling.svg', dark: 'file:../../icons/webling.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Webling members, invoices, bookings and documents',
		defaults: {
			name: 'Webling',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'weblingApi',
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
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Custom API Call',
						value: 'custom',
					},
					{
						name: 'Definition',
						value: 'definition',
					},
					{
						name: 'Member',
						value: 'member',
					},
					{
						name: 'Record',
						value: 'record',
					},
					{
						name: 'Replication',
						value: 'replication',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
				],
				default: 'member',
			},
			...memberDescription,
			...recordDescription,
			...definitionDescription,
			...replicationDescription,
			...transactionDescription,
			...accountDescription,
			...customDescription,
		],
	};
}
