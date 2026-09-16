import type { INodeProperties } from 'n8n-workflow';
import { idProperty } from '../../shared/descriptions';

const resource = 'qrCode';
const show = { resource: [resource] };

/**
 * QR codes — https://developers.payrexx.com/reference/create-a-qr-code
 *
 * A QR code points at a webshop URL and is addressed by UUID, not by a numeric
 * ID like the rest of the API. Creating one returns the PNG as a data URI.
 */
export const qrCodeDescription: INodeProperties[] = [
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
				action: 'Create a QR code',
				routing: { request: { method: 'POST', url: '/QrCode/' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a QR code',
				routing: {
					request: { method: 'DELETE', url: '=/QrCode/{{$parameter.qrCodeUuid}}' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a QR code',
				routing: {
					request: { method: 'GET', url: '=/QrCode/{{$parameter.qrCodeUuid}}' },
				},
			},
		],
		default: 'create',
	},

	idProperty(
		'QR Code UUID',
		'qrCodeUuid',
		resource,
		['get', 'delete'],
		'The UUIDv4 of the QR code',
		'string',
	),

	{
		displayName: 'Webshop URL',
		name: 'webshopUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.payrexx.com/shop',
		description: 'Where a customer is sent after scanning the code',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'webshopUrl' } },
	},
];
