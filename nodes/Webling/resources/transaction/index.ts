import type { INodeProperties } from 'n8n-workflow';

const resource = 'transaction';
const show = { resource: [resource] };

/**
 * Transactions — `/transaction`, several writes applied as one.
 *
 * Three reasons to reach for it. It is atomic: the first failure rolls the whole
 * thing back, so nothing is left half applied. It lets one request use the
 * result of an earlier one, which is the only way to create objects that
 * reference each other — write `{{name}}` where you need the ID a named POST
 * returned. And it counts as a single call against the rate limit, which turns
 * a five-hundred-member import from an afternoon of throttling into one request.
 *
 * Watch the status code rather than the body: the call answers with the status
 * of the *failed* request, so only a transaction that returns 200 was applied
 * in full. GET is not allowed inside one, and a file has to be base64 in the
 * body rather than multipart.
 */
export const transactionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Run',
				value: 'run',
				action: 'Run a transaction',
				routing: {
					request: {
						method: 'POST',
						url: '/api/1/transaction',
						body: '={{ JSON.parse($parameter.requests || "[]") }}',
					},
				},
			},
		],
		default: 'run',
	},

	{
		displayName: 'Requests',
		name: 'requests',
		type: 'json',
		default: '[]',
		required: true,
		typeOptions: { rows: 10 },
		description:
			'Array of writes, applied in order. Each is {"method": "POST" | "PUT" | "DELETE", "URL": "member" or "member/504", "body": {…}} plus an optional "name" to reference its result later as {{name}}.',
		displayOptions: { show },
	},
];
