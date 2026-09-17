#!/usr/bin/env node
/**
 * Refreshes openapi/funtrade.json from the live API documentation.
 *
 * funtrade publishes its REST API as a ReDoc page that embeds the OpenAPI document
 * in a `__redoc_state` assignment rather than linking a .json or .yaml next to it.
 * There is no spec URL to curl, so the document is read back out of the page.
 *
 * Run it when funtrade ships an API version and diff the result: the checked-in copy
 * is what nodes/Funtrade was built against, so a change there is the signal that an
 * operation, a field or an enum moved.
 *
 *   node scripts/fetch-funtrade-spec.mjs
 */
import { writeFile } from 'node:fs/promises';

const PAGE = 'https://app.funtrade.ch/api/';
const OUT = new URL('../openapi/funtrade.json', import.meta.url);
const MARKER = '__redoc_state = ';

/** Reads one JSON object out of `source`, starting at the `{` at `from`. */
function readObject(source, from) {
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = from; i < source.length; i++) {
		const char = source[i];

		if (inString) {
			if (escaped) escaped = false;
			else if (char === '\\') escaped = true;
			else if (char === '"') inString = false;
			continue;
		}

		if (char === '"') inString = true;
		else if (char === '{') depth++;
		else if (char === '}' && --depth === 0) return source.slice(from, i + 1);
	}

	throw new Error('Unterminated __redoc_state object');
}

const response = await fetch(PAGE);
if (!response.ok) throw new Error(`${PAGE} answered ${response.status}`);

const html = await response.text();
const marker = html.indexOf(MARKER);
if (marker === -1) throw new Error(`No ${MARKER.trim()} in ${PAGE} — the page layout changed`);

const state = JSON.parse(readObject(html, html.indexOf('{', marker + MARKER.length)));
const spec = state.spec?.data;
if (!spec?.paths) throw new Error('__redoc_state carries no spec.data.paths');

await writeFile(OUT, `${JSON.stringify(spec, null, 2)}\n`);

const operations = Object.values(spec.paths).flatMap((path) =>
	Object.keys(path).filter((key) => ['get', 'post', 'put', 'patch', 'delete'].includes(key)),
);
console.log(
	`Wrote openapi/funtrade.json — ${spec.info.title} ${spec.info.version}, ` +
		`${Object.keys(spec.paths).length} paths, ${operations.length} operations`,
);
