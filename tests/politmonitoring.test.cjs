const assert = require('node:assert/strict');
const test = require('node:test');
const { createHmac } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');
const workflow = require('n8n-workflow');
const { Politmonitoring } = require('../dist/nodes/Politmonitoring/Politmonitoring.node');
const {
	PolitmonitoringTrigger,
} = require('../dist/nodes/PolitmonitoringTrigger/PolitmonitoringTrigger.node');
const { pmRequest, idempotencyKey } = require('../dist/nodes/Politmonitoring/shared/request');
const { runAffair } = require('../dist/nodes/Politmonitoring/resources/affair');
const { runDocument } = require('../dist/nodes/Politmonitoring/resources/document');
const { runTopic } = require('../dist/nodes/Politmonitoring/resources/topic');
const { runReview } = require('../dist/nodes/Politmonitoring/resources/review');
const { runTracking } = require('../dist/nodes/Politmonitoring/resources/tracking');
const { runSearch } = require('../dist/nodes/Politmonitoring/resources/search');
const node = {
	name: 'Politmonitoring',
	type: 'politmonitoring',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
function context(params = {}, request = async () => ({})) {
	return {
		getNode: () => node,
		getExecutionId: () => 'execution',
		getCredentials: async () => ({ baseUrl: 'https://monitor.example/api/v1/' }),
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, i, fallback) => (name in params ? params[name] : fallback),
		continueOnFail: () => false,
		helpers: { httpRequestWithAuthentication: (_credential, options) => request(options) },
	};
}

test('full dossier follows every related page and encodes Geschäft IDs', async () => {
	const calls = [];
	const result = await runAffair(
		context({ operation: 'get', affairId: '2026/123', includeRaw: true }, async (opts) => {
			calls.push(opts);
			if (opts.url.includes('timeline'))
				return { results: [{ id: 1 }], next: 'https://monitor.example/api/v1/events-next/' };
			if (opts.url.includes('events-next')) return { results: [{ id: 2 }], next: null };
			return { id: '2026/123', collections: { events: '/api/v1/affairs/2026%2F123/timeline/' } };
		}),
	);
	assert.match(calls[0].url, /2026%2F123/);
	assert.equal(calls[0].qs.include_raw, true);
	assert.deepEqual(result[0].json.events, [{ id: 1 }, { id: 2 }]);
	assert.deepEqual(result[0].pairedItem, { item: 0 });
});

test('pagination respects limit and does not leak credentials to external links', async () => {
	const result = await runAffair(
		context({ operation: 'getAll', returnAll: false, limit: 1, filters: {} }, async () => ({
			results: [{ id: 1 }, { id: 2 }],
			next: null,
		})),
	);
	assert.equal(result.length, 1);
	for (const target of ['https://attacker.example/api/v1/jobs/1/', '/api/v1/../../admin/']) {
		await assert.rejects(pmRequest(context(), 'GET', target), /configured instance/);
	}
});

test('binary upload uses multipart and content-based idempotency', async () => {
	const keys = [];
	let content = 'AAA';
	const ctx = context(
		{
			operation: 'upload',
			title: 'Memo',
			binaryPropertyName: 'data',
			metadata: { topicIds: '1,2', datum: '2026-10-01T00:00:00Z' },
			waitForCompletion: false,
		},
		async (opts) => {
			assert.ok(opts.body instanceof FormData);
			assert.equal(opts.body.get('titel'), 'Memo');
			assert.deepEqual(opts.body.getAll('themen'), ['1', '2']);
			assert.equal(opts.body.get('file').name, 'memo.txt');
			keys.push(opts.headers['Idempotency-Key']);
			return { id: 'job', status: 'queued', polling_url: '/api/v1/jobs/job/' };
		},
	);
	ctx.helpers.assertBinaryData = () => ({ fileName: 'memo.txt', mimeType: 'text/plain' });
	ctx.helpers.getBinaryDataBuffer = async () => Buffer.from(content);
	await runDocument(ctx);
	await runDocument(ctx);
	content = 'BBB';
	await runDocument(ctx);
	assert.equal(keys[0], keys[1]);
	assert.notEqual(keys[1], keys[2]);
});

test('download produces binary output and preserves pairing', async () => {
	const ctx = context(
		{ operation: 'download', documentId: '4', outputBinaryPropertyName: 'file' },
		async () => ({
			body: Buffer.from('hello'),
			headers: {
				'content-type': 'text/plain',
				'content-disposition': "attachment; filename*=UTF-8''m%C3%A9mo.txt",
			},
		}),
	);
	ctx.helpers.prepareBinaryData = async (buffer, name, mime) => {
		assert.equal(name, 'mémo.txt');
		assert.equal(mime, 'text/plain');
		return { data: buffer.toString('base64'), mimeType: mime };
	};
	const result = await runDocument(ctx);
	assert.ok(result[0].binary.file);
	assert.deepEqual(result[0].pairedItem, { item: 0 });
});

test('topic updates send only selected fields and return job when waiting is off', async () => {
	const result = await runTopic(
		context(
			{
				operation: 'update',
				topicId: '7',
				profileFields: { position_de: 'New', keywords: 'youth, participation' },
				waitForCompletion: false,
			},
			async (opts) => {
				assert.equal(opts.method, 'PATCH');
				assert.deepEqual(opts.body, { position_de: 'New', keywords: ['youth', 'participation'] });
				return { id: 'job', status: 'queued' };
			},
		),
	);
	assert.equal(result[0].json.id, 'job');
});

test('review and tracking operations preserve match and scope semantics', async () => {
	await runReview(
		context({ operation: 'getOpen', returnAll: true }, async (opts) => {
			assert.equal(opts.qs.status, 'pending');
			return { results: [{ id: 1 }, { id: 2 }], next: null };
		}),
	);
	await runReview(
		context({ operation: 'reject', reviewId: '9', note: 'Unrelated' }, async (opts) => {
			assert.deepEqual(opts.body, { status: 'rejected', note: 'Unrelated' });
			return { id: 9 };
		}),
	);
	await runTracking(
		context({ operation: 'remove', affairId: '2026/123', scope: 'personal' }, async (opts) => {
			assert.equal(opts.method, 'DELETE');
			assert.equal(opts.body.scope, 'personal');
			assert.match(opts.url, /2026%2F123/);
			return { tracking: { personal: false, organization: true } };
		}),
	);
});

test('search sends selected corpora, IDs, language and optional answer', async () => {
	await runSearch(
		context(
			{
				operation: 'run',
				text: 'Jugend',
				corpora: ['topics', 'documents'],
				language: 'fr',
				resultLimit: 8,
				generateAnswer: true,
				sourceFilters: { documentIds: '2, 3' },
				waitForCompletion: false,
			},
			async (opts) => {
				assert.deepEqual(opts.body, {
					text: 'Jugend',
					corpora: ['topics', 'documents'],
					language: 'fr',
					limit: 8,
					generate_answer: true,
					document_ids: [2, 3],
				});
				return { id: 'job', status: 'queued' };
			},
		),
	);
});

test('continue on fail retains failing input pairing', async () => {
	const ctx = context({ operation: 'get', documentId: '404' }, async () => {
		throw new Error('Not found');
	});
	ctx.continueOnFail = () => true;
	const result = await runDocument(ctx);
	assert.equal(result[0].json.error, 'Not found');
	assert.deepEqual(result[0].pairedItem, { item: 0 });
});

function virtualPolling() {
	let now = 0;
	const sleeps = [];
	const filename = path.resolve(__dirname, '../dist/nodes/Politmonitoring/shared/request.js');
	const local = createRequire(filename);
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
								now += ms;
								sleeps.push(ms);
							},
						}
					: local(name),
			Date: class extends Date {
				static now() {
					return now;
				}
			},
			URL,
		},
		{ filename },
	);
	return { ...exports, sleeps };
}
test('polling timeout returns resumable job and honors 429', async () => {
	const { waitForJob, sleeps } = virtualPolling();
	let calls = 0;
	const ctx = context({}, async () => {
		if (++calls === 1) {
			const e = new Error('limited');
			e.response = { status: 429, headers: { 'retry-after': '3' } };
			throw e;
		}
		return { id: 'j', status: 'running' };
	});
	const result = await waitForJob(ctx, { id: 'j', status: 'queued' }, 6, 0);
	assert.equal(result.id, 'j');
	assert.equal(result.timed_out, true);
	assert.equal(
		sleeps.reduce((a, b) => a + b, 0),
		6000,
	);
});
test('failed jobs propagate errors', async () => {
	const { waitForJob } = virtualPolling();
	await assert.rejects(
		waitForJob(context(), { id: 'j', status: 'failed', error_code: 'processing_failed' }, 10, 0),
		/processing_failed/,
	);
});

function hookContext(event, changes = {}) {
	const secret = 'test-secret';
	const timestamp = String(Math.floor(Date.now() / 1000));
	const raw = Buffer.from(JSON.stringify(event));
	let status;
	const ctx = {
		getRequestObject: () => ({ rawBody: raw }),
		getResponseObject: () => ({
			status(code) {
				status = code;
				return this;
			},
			send() {
				return this;
			},
			end() {
				return this;
			},
		}),
		getHeaderData: () => ({
			'webhook-id': event.id,
			'webhook-timestamp': timestamp,
			'webhook-signature':
				'v1=' +
				createHmac('sha256', secret)
					.update(timestamp + '.')
					.update(raw)
					.digest('hex'),
			...changes,
		}),
		getBodyData: () => event,
		getWorkflowStaticData: () => ({ secret }),
		getNodeParameter: () => false,
		helpers: { returnJsonArray: (event) => [{ json: event }] },
	};
	return { ctx, status: () => status };
}
test('trigger verifies raw signatures, timestamp, ID and handshake', async () => {
	const trigger = new PolitmonitoringTrigger();
	for (const [changes, ok] of [
		[{}, true],
		[{ 'webhook-signature': 'v1=00' }, false],
		[{ 'webhook-id': 'wrong' }, false],
		[{ 'webhook-timestamp': '1' }, false],
	]) {
		const h = hookContext({ id: 'event', type: 'webhook.test', data: {} }, changes);
		await trigger.webhook.call(h.ctx);
		assert.equal(h.status(), ok ? 200 : 401);
	}
	const h = hookContext({ id: 'event', type: 'review.created', data: { review_id: 2 } });
	const result = await trigger.webhook.call(h.ctx);
	assert.equal(result.workflowData[0][0].json.type, 'review.created');
});

test('trigger registration sends scope and removes subscription on deactivation', async () => {
	const trigger = new PolitmonitoringTrigger();
	const state = {};
	const calls = [];
	const ctx = {
		...context({}, async (opts) => {
			calls.push(opts);
			if (opts.method === 'GET') return { results: [], next: null };
			if (opts.method === 'POST' && opts.url.endsWith('/webhooks/'))
				return { id: 'sub', secret: 'secret' };
			return {};
		}),
		getWorkflowStaticData: () => state,
		getNodeWebhookUrl: () => 'https://n8n.example/hook',
		getNodeParameter: (name) => (name === 'events' ? ['review.created'] : 'personal'),
		logger: { warn: () => {} },
	};
	await trigger.webhookMethods.default.create.call(ctx);
	assert.equal(state.webhookId, 'sub');
	assert.equal(calls[1].body.tracking_scope, 'personal');
	assert.match(calls[2].url, /test\/$/);
	await trigger.webhookMethods.default.delete.call(ctx);
	assert.equal(state.webhookId, undefined);
	assert.equal(calls.at(-1).method, 'DELETE');
});
