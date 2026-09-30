const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const workflow = require('n8n-workflow');
const { toNodeApiError } = require('../dist/nodes/Wissensmanagement/shared/request');
const { runDocument } = require('../dist/nodes/Wissensmanagement/resources/document');
const {
	WissensmanagementTrigger,
} = require('../dist/nodes/WissensmanagementTrigger/WissensmanagementTrigger.node');

const node = {
	name: 'Wissen',
	type: 'wissensmanagement',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
const errorBody = {
	error: { code: 'validation_error', message: 'Invalid document', fields: { title: ['Required'] } },
	request_id: 'regression-request',
};

function httpError(status, headers = {}, body = errorBody) {
	const error = new Error(`Request failed with status code ${status}`);
	error.response = { status, headers, data: body };
	return error;
}

function context(request) {
	return {
		getNode: () => node,
		getCredentials: async () => ({ baseUrl: 'https://wissen.example.ch' }),
		helpers: { httpRequestWithAuthentication: request },
	};
}

// Execute the built polling code with a virtual clock; no real delays or API calls.
function pollingClock() {
	let now = 0;
	const sleeps = [];
	const filename = path.resolve(__dirname, '../dist/nodes/Wissensmanagement/shared/request.js');
	const localRequire = createRequire(filename);
	const exports = {};
	vm.runInNewContext(
		readFileSync(filename, 'utf8'),
		{
			exports,
			require: (name) =>
				name === 'n8n-workflow'
					? {
							...workflow,
							sleep: async (ms) => {
								sleeps.push(ms);
								now += ms;
							},
						}
					: localRequire(name),
			Date: class extends Date {
				static now() {
					return now;
				}
			},
			URL,
		},
		{ filename },
	);
	return { waitForJob: exports.waitForJob, sleeps };
}

test('polling recovers from a wrapped 429 and honors Retry-After', async () => {
	const { waitForJob, sleeps } = pollingClock();
	let calls = 0;
	const finished = { id: 'job', status: 'succeeded' };
	const ctx = context(async () => {
		if (++calls === 1)
			throw new workflow.NodeApiError(node, httpError(429, { 'retry-after': '12' }));
		return finished;
	});
	assert.equal(await waitForJob(ctx, { id: 'job', status: 'queued' }, 60, 0), finished);
	assert.deepEqual(sleeps, [2000, 12000]);
	assert.equal(calls, 2);
});

test('polling uses the default delay when a raw 429 has no Retry-After', async () => {
	const { waitForJob, sleeps } = pollingClock();
	let calls = 0;
	const ctx = context(async () => {
		if (++calls === 1) throw httpError(429);
		return { id: 'job', status: 'succeeded' };
	});
	await waitForJob(ctx, { id: 'job', status: 'queued' }, 60, 0);
	assert.deepEqual(sleeps, [2000, 30000]);
});

test('polling still fails immediately on errors other than 429', async () => {
	const { waitForJob, sleeps } = pollingClock();
	const ctx = context(async () => {
		throw new workflow.NodeApiError(node, httpError(403));
	});
	await assert.rejects(waitForJob(ctx, { id: 'job', status: 'queued' }, 60, 3), (error) => {
		assert.equal(error.httpCode, '403');
		assert.equal(error.context.itemIndex, 3);
		return true;
	});
	assert.deepEqual(sleeps, [2000]);
});

test('API details survive both raw and n8n-wrapped HTTP errors', () => {
	for (const wrapped of [false, true]) {
		const original = httpError(400);
		const input = wrapped ? new workflow.NodeApiError(node, original) : original;
		const result = toNodeApiError(context(), input, 4);
		assert.equal(result.message, 'Invalid document (validation_error)');
		assert.match(result.description, /"title":\["Required"\]/);
		assert.match(result.description, /Request ID: regression-request/);
		assert.equal(result.context.itemIndex, 4);
		assert.equal(result.httpCode, '400');
		if (wrapped) assert.equal(result, input);
	}
});

test('locally generated errors retain their message and gain an item index', () => {
	const original = new workflow.NodeApiError(node, {}, { message: 'Job failed' });
	const result = toNodeApiError(context(), original, 2);
	assert.equal(result.message, 'Job failed');
	assert.equal(result.context.itemIndex, 2);
});

test('binary uploads distinguish same-size content and keep retries stable', async () => {
	for (const operation of ['create', 'replaceFile']) {
		const keys = [];
		let content = 'AAA';
		const params = {
			operation,
			documentId: 42,
			inputType: 'binary',
			title: 'Same metadata',
			stance: 'neutral',
			additionalFields: {},
			binaryPropertyName: 'data',
			waitForCompletion: false,
		};
		const ctx = {
			...context(async (_, options) => {
				keys.push(options.headers['Idempotency-Key']);
				return { id: 'job', status: 'queued' };
			}),
			getInputData: () => [{ json: {} }],
			getExecutionId: () => 'same-execution',
			getNodeParameter: (name, index, fallback) => params[name] ?? fallback,
			continueOnFail: () => false,
		};
		Object.assign(ctx.helpers, {
			assertBinaryData: () => ({ fileName: 'document.txt', mimeType: 'text/plain' }),
			getBinaryDataBuffer: async () => Buffer.from(content),
		});
		await runDocument(ctx);
		await runDocument(ctx);
		content = 'BBB';
		await runDocument(ctx);
		assert.equal(keys[0], keys[1], `${operation}: retry changed the key`);
		assert.notEqual(keys[0], keys[2], `${operation}: different content reused the key`);
		params['options.idempotencyKey'] = 'explicit-key';
		await runDocument(ctx);
		assert.equal(keys[3], 'explicit-key');
	}
});

function subscriptionContext(overrides = {}) {
	const state = { webhookId: 'old', secret: 'old-secret' };
	const calls = [];
	const subscription = {
		id: 'old',
		url: 'https://n8n.example.ch/webhook',
		events: ['job.succeeded'],
		enabled: true,
		verified_at: '2026-09-30T00:00:00Z',
		...overrides,
	};
	const ctx = {
		...context(async (_, options) => {
			const route = new URL(options.url).pathname;
			calls.push(`${options.method} ${route}`);
			if (options.method === 'GET') return { next: null, results: [subscription] };
			if (options.method === 'DELETE') return undefined;
			if (route === '/api/v1/webhooks/') {
				return {
					...subscription,
					id: 'new',
					secret: 'new-secret',
					enabled: false,
					verified_at: null,
				};
			}
			if (route === '/api/v1/webhooks/new/test/') return { id: 'verification-delivery' };
			throw new Error(`Unexpected request: ${route}`);
		}),
		getWorkflowStaticData: () => state,
		getNodeWebhookUrl: () => subscription.url,
		getNodeParameter: () => ['job.succeeded'],
	};
	return { ctx, calls, state };
}

test('enabled and verified matching webhook subscriptions are reused', async () => {
	const { ctx, calls } = subscriptionContext();
	const methods = new WissensmanagementTrigger().webhookMethods.default;
	assert.equal(await methods.checkExists.call(ctx), true);
	assert.deepEqual(calls, ['GET /api/v1/webhooks/']);
});

test('disabled or unverified webhooks are replaced and verification is requested', async () => {
	for (const flags of [
		{ enabled: false },
		{ verified_at: null },
		{ enabled: false, verified_at: null },
	]) {
		const { ctx, calls, state } = subscriptionContext(flags);
		const methods = new WissensmanagementTrigger().webhookMethods.default;
		assert.equal(await methods.checkExists.call(ctx), false);
		assert.equal(await methods.create.call(ctx), true);
		assert.deepEqual(calls, [
			'GET /api/v1/webhooks/',
			'GET /api/v1/webhooks/',
			'DELETE /api/v1/webhooks/old/',
			'POST /api/v1/webhooks/',
			'POST /api/v1/webhooks/new/test/',
		]);
		assert.deepEqual(state, { webhookId: 'new', secret: 'new-secret' });
	}
});
