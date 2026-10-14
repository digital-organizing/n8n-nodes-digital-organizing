# Politmonitoring

Two nodes connect to a single organisation's Politmonitoring instance:

- **Politmonitoring** retrieves full Geschäft dossiers, manages Themen/documents, searches knowledge, reviews matches, and manages tracking and webhooks.
- **Politmonitoring Trigger** receives signed review, tracked-affair, document, and job events.

## Credentials

Enable the backend integration API first. An organisation administrator creates an API key in Django admin, selecting its owner, scopes, and expiry. Paste the instance root URL and the one-time `pm_…` key into **Politmonitoring API** credentials. The connection test calls `/api/v1/me/`. Never use a browser password or session cookie.

Members can own keys for reads, searches, review decisions and personal tracking. Shared Thema/document writes and organisation-wide tracking require an admin owner, even if the corresponding scope was originally selected. Revocation, expiry, deactivation and role changes take effect on subsequent requests and queued work.

## Operations

| Resource | Operations | Scopes |
| --- | --- | --- |
| Account | Get identity/capabilities | Any valid key |
| Geschäft | Get full dossier, list/filter, timeline, event history | `affairs:read` |
| Thema | List/get, related Geschäfte/documents, create/update | `topics:read`, `topics:write`; document relations also need `documents:read` |
| Document | Upload, list/get status/content, download, retry processing | `documents:create`, `documents:read`, `documents:process` |
| Search | Free-text ranked matches and optional cited answer | `search:run` |
| Review | Get Open, list/get, accept/reject with note | `reviews:read`, `reviews:write` |
| Tracking | List/get, add/remove | `tracking:read`, `tracking:write` |
| Job | Get status/result | The submitting operation's scope; same owner |
| Webhook | Create/list/get/update/delete, test, rotate secret, deliveries/retry | `webhooks:read`, `webhooks:write`, plus event read scopes |

**Get Dossier** fetches every page of the stored timeline, event history, artifacts, matches and caller-owned completed RAG runs, assembling one output item. It never refreshes upstream data. Enter the existing Geschäft ID verbatim, including `/` when present. Raw upstream payloads are opt-in.

**Get Open** returns one item per pending Geschäft–Thema match. A Geschäft can therefore appear more than once. Accepting the same match again is safe; an opposing decision returns a conflict.

**Tracking** requires an explicit personal/organisation scope for changes and supports either scope or their union for reads. Personal means the key owner. Removing personal tracking preserves organisation tracking. Listing the union returns one item per Geschäft with both tracking flags.

**Thema** creation requires a description and title, scope, position, supported measures and opposed measures in at least one of German, French or English. Supply missing translations explicitly or allow the backend to generate them. Update only the fields you want changed. `indexed_revision` and `indexing_error` show indexing readiness. A saved topic can be returned while a failed index rebuild awaits retry.

**Upload** reads an n8n binary property (default `data`), with a title and optional date, language and Thema IDs. Supported formats follow the backend extractor: PDF, DOCX, text/Markdown/HTML and supported images. The default upload limit is 50 MiB. **Download** writes the original file into a configurable binary output property.

**Search** takes up to 16,000 characters; defaults to both corpora, German and 10 results. Source filters take comma-separated IDs. Results contain source IDs, revision references, excerpts, scores and citations. Multiple topic passages are grouped into one Thema result. Answer generation is off by default. Search never writes review suggestions or changes relationships/tracking. Check `warnings` for incomplete indexing.

## Background work and retries

Uploads, Thema writes and searches return jobs. **Wait for Completion** defaults to on. The node polls for up to 300 seconds by default, then returns the job with `timed_out: true`, its ID and polling URL. Resume with **Job → Get**. A failed job raises a node error; normal n8n continue-on-failure behavior is supported.

Generated idempotency keys are stable within one execution and input item, including file contents. To deduplicate independent workflow executions, supply your own stable **Idempotency Key**. Reuse it only for identical input; the backend retains completed job/idempotency records for seven days.

## Triggers

Choose events and a tracking scope, then activate the workflow. Activation registers a subscription and requests a signed verification event. The backend dispatcher and workers must be running; verification normally follows within a scheduling interval. **Fetch Resource** optionally retrieves the current referenced object. Geschäft events fetch the dossier envelope; use **Get Dossier** to assemble all collections.

Receivers require public HTTPS on port 443 by default. Explicit server configuration can allow private receivers; loopback/metadata addresses remain denied. Deactivation unregisters the subscription. After API-key rotation, reactivate the workflow to authorize a new subscription with the replacement key.

Delivery is **at least once**, without ordering guarantees. Deduplicate the event `id` in durable workflow storage before irreversible side effects. Signatures and five-minute timestamp tolerance are verified before output; verification events never launch workflow executions.

Import the JSON workflows in `examples/politmonitoring`, select your credentials, and replace example IDs/text before execution. Publishing the node package and deploying the backend are separate release steps.
