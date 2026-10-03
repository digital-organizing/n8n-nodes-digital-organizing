const assert = require('node:assert/strict');
const test = require('node:test');
const { TemplateStudio } = require('../dist/nodes/TemplateStudio/TemplateStudio.node');

const node = {
	name: 'Studio',
	type: 'templateStudio',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
const descriptor = {
	slug: 'testimonial',
	name: 'Testimonial',
	width: 1080,
	height: 1350,
	fields: [
		{ key: 'photo', type: 'image', label: 'Photo', required: true, fit: 'cover', face_crop: true },
		{ key: 'quote', type: 'text', label: 'Quote', required: false, max_length: 200 },
	],
};
const rendered = {
	format: 'png',
	mime_type: 'image/png',
	filename: 'testimonial.png',
	url: 'https://studio.example.ch/r/token.png',
	fields: { photo: { found: true, face_found: false }, quote: { found: true, overflow: true } },
	data: Buffer.from('PNG').toString('base64'),
};

/**
 * A node context whose HTTP helper records every request. The template lookup is
 * answered with `descriptor`, the render with `respond`.
 */
function context(params, items, respond) {
	const requests = [];
	const ctx = {
		getNode: () => node,
		getCredentials: async () => ({ baseUrl: 'https://studio.example.ch/' }),
		getInputData: () => items,
		continueOnFail: () => false,
		getNodeParameter: (name, _index, fallback, options) => {
			const value = name in params ? params[name] : fallback;
			return options?.extractValue ? value.value : value;
		},
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				if (options.method === 'GET') return descriptor;
				requests.push(options);
				return respond(options);
			},
			getBinaryDataBuffer: async (index, property) =>
				Buffer.from(items[index].binary[property].data, 'base64'),
			prepareBinaryData: async (buffer, fileName, mimeType) => ({
				data: buffer.toString('base64'),
				fileName,
				mimeType,
			}),
		},
	};
	return { ctx, requests };
}

async function schema() {
	const ctx = {
		getCredentials: async () => ({ baseUrl: 'https://studio.example.ch' }),
		getNodeParameter: () => 'testimonial',
		helpers: { httpRequestWithAuthentication: async () => descriptor },
	};
	const mapped = await new TemplateStudio().methods.resourceMapping.getTemplateFields.call(ctx);
	return mapped.fields;
}

function renderParams(fields, extra = {}) {
	return {
		resource: 'template',
		operation: 'render',
		template: { mode: 'list', value: 'testimonial' },
		output: 'file',
		binaryPropertyName: 'image',
		options: {},
		fields,
		...extra,
	};
}

test('image fields come with their optional settings and what the template does without them', async () => {
	const fields = await schema();
	assert.deepEqual(
		fields.map((field) => [field.id, field.displayName, field.required, field.removed === true]),
		[
			['photo', 'Photo (image)', true, false],
			['photo__remove_bg', 'Photo: Remove Background', false, true],
			['photo__face_crop', 'Photo: Crop Around Face (template: yes)', false, true],
			['photo__fit', 'Photo: Fit (template: cover)', false, true],
			['quote', 'Quote (text, max 200 characters)', false, false],
		],
	);
});

test('a binary field name is sent as the file, unset values are left to the template', async () => {
	const items = [
		{ json: {}, binary: { upload: { data: Buffer.from('JPEG').toString('base64') } } },
	];
	const value = { photo: 'upload', photo__remove_bg: 'true', photo__fit: null, quote: '' };
	const params = renderParams(
		{ mappingMode: 'defineBelow', value },
		{ options: { format: 'jpeg' } },
	);
	const { ctx, requests } = context(params, items, () => rendered);

	const [[result]] = await new TemplateStudio().execute.call(ctx);

	assert.equal(requests[0].url, 'https://studio.example.ch/api/templates/testimonial/render/');
	assert.deepEqual(requests[0].qs, { format: 'jpeg', response: 'json' });
	assert.deepEqual(requests[0].body, {
		photo: Buffer.from('JPEG').toString('base64'),
		photo__remove_bg: 'true',
	});
	assert.deepEqual(result.binary.image, {
		data: rendered.data,
		fileName: 'testimonial.png',
		mimeType: 'image/png',
	});
	assert.equal(result.json.url, rendered.url);
	assert.equal('data' in result.json, false);
});

test('auto-mapped input is cut down to the fields the template has now, without a stored list', async () => {
	const items = [{ json: { photo: 'https://example.ch/a.jpg', quote: 'Hi', email: 'a@b.ch' } }];
	const params = renderParams({ mappingMode: 'autoMapInputData', value: null }, { output: 'url' });
	const { ctx, requests } = context(params, items, () => ({ url: rendered.url }));

	const [[result]] = await new TemplateStudio().execute.call(ctx);

	assert.deepEqual(requests[0].body, { photo: 'https://example.ch/a.jpg', quote: 'Hi' });
	assert.equal(requests[0].qs.response, 'url');
	assert.equal(result.binary, undefined);
});

test('a rejected render names the fields at fault', async () => {
	const params = renderParams({ mappingMode: 'defineBelow', value: {} });
	const { ctx } = context(params, [{ json: {} }], () => {
		const error = new Error('Request failed with status code 400');
		error.response = {
			status: 400,
			data: { error: 'Invalid input.', fields: { photo: 'This field is required.' } },
		};
		throw error;
	});

	await assert.rejects(new TemplateStudio().execute.call(ctx), (error) => {
		assert.equal(error.message, 'Invalid input.');
		assert.equal(error.description, 'photo: This field is required.');
		return true;
	});
});

test('binary fields go up as files in a multipart form when asked to', async () => {
	const items = [
		{
			json: {},
			binary: {
				upload: {
					data: Buffer.from('JPEG').toString('base64'),
					fileName: 'me.jpg',
					mimeType: 'image/jpeg',
				},
			},
		},
	];
	const params = renderParams(
		{ mappingMode: 'defineBelow', value: { photo: 'upload', quote: 'Hi' } },
		{ options: { multipart: true } },
	);
	const { ctx, requests } = context(params, items, () => rendered);

	await new TemplateStudio().execute.call(ctx);

	const form = requests[0].body;
	assert.ok(form instanceof FormData);
	assert.equal(form.get('quote'), 'Hi');
	assert.equal(form.get('photo').name, 'me.jpg');
	assert.equal(form.get('photo').type, 'image/jpeg');
	assert.equal(Buffer.from(await form.get('photo').arrayBuffer()).toString(), 'JPEG');
	assert.deepEqual(requests[0].qs, { response: 'json' });
});

test('a mistyped binary field name is reported before anything is rendered', async () => {
	const items = [{ json: {}, binary: { upload: { data: '' } } }];
	const params = renderParams({ mappingMode: 'defineBelow', value: { photo: 'data' } });
	const { ctx, requests } = context(params, items, () => rendered);

	await assert.rejects(new TemplateStudio().execute.call(ctx), (error) => {
		assert.match(error.message, /no binary field "data"/);
		assert.match(error.description, /upload/);
		return true;
	});
	assert.equal(requests.length, 0);
});

test('a render fails on the problems it was told to fail on, and only on those', async () => {
	const fields = { mappingMode: 'defineBelow', value: { photo: 'https://example.ch/a.jpg' } };
	const run = (options) => {
		const { ctx } = context(renderParams(fields, { options }), [{ json: {} }], () => rendered);
		return new TemplateStudio().execute.call(ctx);
	};

	await assert.rejects(run({ failOnOverflow: true, failOnNoFace: true }), (error) => {
		assert.equal(error.message, 'Text overflows: quote · No face found: photo');
		assert.match(error.description, /token\.png/);
		return true;
	});
	await assert.rejects(run({ failOnNoFace: true }), { message: 'No face found: photo' });
	await assert.doesNotReject(run({ failOnMissing: true }));
});

test('an unknown slug names the template instead of a bare 404', async () => {
	const params = renderParams({ mappingMode: 'defineBelow', value: {} });
	const { ctx } = context(params, [{ json: {} }], () => rendered);
	ctx.helpers.httpRequestWithAuthentication = async () => {
		const error = new Error('Request failed with status code 404');
		error.response = { status: 404, data: '<h1>Not Found</h1>' };
		throw error;
	};

	await assert.rejects(new TemplateStudio().execute.call(ctx), {
		message: 'Template "testimonial" does not exist or this API key may not use it',
	});
});
