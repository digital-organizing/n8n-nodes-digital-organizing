import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	jobProperties,
	listProperties,
	queryProperties,
	readLimit,
	readQuery,
	submitJob,
} from '../shared/descriptions';
import { forEachItem, wmPaginate, wmRequest } from '../shared/request';

const resource = ['chatSession'];
const show = (...operation: string[]) => ({ resource, operation });

export const chatSessionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a chat session' },
			{ name: 'Delete', value: 'delete', action: 'Delete a chat session' },
			{ name: 'Get', value: 'get', action: 'Get a chat session' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many chat sessions' },
			{
				name: 'Get Messages',
				value: 'getMessages',
				action: 'Get the messages of a chat session',
			},
			{
				name: 'Send Message',
				value: 'sendMessage',
				action: 'Send a message to a chat session',
				description: 'Ask a follow-up question that sees the earlier messages',
			},
			{ name: 'Update', value: 'update', action: 'Update a chat session' },
		],
		default: 'sendMessage',
	},
	{
		displayName: 'Chat Session ID',
		name: 'sessionId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: show('delete', 'get', 'getMessages', 'sendMessage', 'update') },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: { show: show('create', 'update') },
	},
	...queryProperties(show('sendMessage'), true),
	...jobProperties(show('sendMessage')),
	...listProperties(show('getAll', 'getMessages')),
];

export async function runChatSession(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	return await forEachItem(ctx, async (i) => {
		const operation = ctx.getNodeParameter('operation', i) as string;

		if (operation === 'create') {
			const title = ctx.getNodeParameter('title', i) as string;
			const body = title === '' ? {} : { title };
			return (await wmRequest(ctx, 'POST', '/chat-sessions/', { body })) as IDataObject;
		}
		if (operation === 'getAll') {
			return await wmPaginate(ctx, '/chat-sessions/', {}, readLimit(ctx, i));
		}

		const id = ctx.getNodeParameter('sessionId', i) as number;
		const path = `/chat-sessions/${id}/`;

		switch (operation) {
			case 'get':
				return (await wmRequest(ctx, 'GET', path)) as IDataObject;
			case 'update': {
				const body = { title: ctx.getNodeParameter('title', i) as string };
				return (await wmRequest(ctx, 'PATCH', path, { body })) as IDataObject;
			}
			case 'delete':
				await wmRequest(ctx, 'DELETE', path);
				return { deleted: true, id };
			case 'getMessages':
				return await wmPaginate(ctx, `${path}messages/`, {}, readLimit(ctx, i));
			default: {
				// sendMessage
				const body = readQuery(ctx, i);
				const { job, waited } = await submitJob(ctx, i, 'POST', `${path}messages/`, body, body);
				return waited ? (job.result as IDataObject) : job;
			}
		}
	});
}
