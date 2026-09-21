# n8n-nodes-digital-organizing

n8n community nodes for the tools [Digital Organizing](https://digitalorganizing.ch) works with, bundled
in one installable package instead of one package per tool.

| Node                      | Status                                                                                  | Credential                       |
| ------------------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| **Do Counter**            | Implemented (counter, campaign, entry)                                                  | `Do Counter API`                 |
| **Flyertool**             | Implemented (contacts, assignments, addresses)                                          | `Flyertool API`                  |
| **Flyertool Trigger**     | Implemented (static webhook)                                                            | –                                |
| **Link Shortener**        | Implemented (links, domains, groups, identity)                                          | `Link Shortener API`             |
| **Payrexx**               | Implemented (transactions, subscriptions, QR codes, paylinks, invoices)                 | `Payrexx API`                    |
| **Payrexx Trigger**       | Implemented (static webhook)                                                            | –                                |
| **RaiseNow**              | Implemented (payments, supporters, subscriptions, plans, search, webhooks)              | `RaiseNow API`                   |
| **RaiseNow Trigger**      | Implemented (webhook endpoint + event subscriptions)                                    | `RaiseNow API`                   |
| **Cura Fundraising**      | Implemented (inbox contact submissions)                                                 | `Cura Fundraising API`           |
| **LibraCore**             | Campaign submissions + custom API call                                                  | `LibraCore Service Platform API` |
| **Funtrade**              | Implemented (people, addresses, attributes, interactions, pledges, publications, tasks) | `Funtrade API`                   |
| **Gravity Forms**         | Implemented (forms, entries, submissions)                                               | `Gravity Forms API`              |
| **Gravity Forms Trigger** | Implemented (polls for new entries)                                                     | `Gravity Forms API`              |

Every node also keeps a **Custom API Call** resource, for the long tail of endpoints
not worth modelling — see
[Adding a resource to an existing node](#adding-a-resource-to-an-existing-node).

## Installation

On a self-hosted n8n instance: **Settings → Community nodes → Install**, then enter

```
n8n-nodes-digital-organizing
```

Or install it into the n8n user folder directly:

```bash
cd ~/.n8n
npm install n8n-nodes-digital-organizing
```

## Development

Requires Node.js >= 20.15.

```bash
npm install
npm run dev     # starts a local n8n with this package linked, hot reloads on change
npm run lint    # n8n node linter + eslint
npm run build   # compiles to dist/
```

`npm run dev` boots an n8n instance at http://localhost:5678 with the nodes from
this repo already installed, so changes are visible after a save.

## Repository layout

```
credentials/                    one <Service>Api.credentials.ts per service
icons/                          <service>.svg + <service>.dark.svg, 24x24, currentColor
openapi/                        vendored API specs, for services that serve none
scripts/                        maintenance scripts, e.g. refreshing a vendored spec
nodes/
  shared/customApiCall.ts       generic "Custom API Call" resource used by every node
  shared/mergeJsonBody.ts       preSend factory folding a JSON parameter into the body
  DoCounter/
    DoCounter.node.ts           node description: resources, credentials, requestDefaults
    shared/descriptions.ts      properties reused across resources of this node
    resources/<resource>/       one folder per resource, exporting its operations
  Payrexx/  RaiseNow/  Cura/    same shape
  shared/pagination.ts          limit/offset paging over an items or results envelope,
                                plus a client-side limit for APIs with no paging at all
  RaiseNowTrigger/              programmatic trigger: webhook lifecycle in webhookMethods
  PayrexxTrigger/               static webhook trigger: no lifecycle, URL pasted by hand
  GravityFormsTrigger/          polling trigger: poll() asks for the newest entries
  LibraCore/                    shared/mergeCustomFields.ts is a preSend action
```

Nodes are written in n8n's **declarative style**: operations describe their HTTP
request via `routing` instead of implementing `execute()`. Reach for a programmatic
node only when routing genuinely cannot express the call.

## Adding a node

1. `mkdir -p nodes/MyTool/resources/custom` and copy the `Cura` node as a starting point.
2. Add `credentials/MyToolApi.credentials.ts`.
3. Add `icons/mytool.svg` and `icons/mytool.dark.svg` (24x24 viewBox; light uses
   `fill="currentColor"`, dark uses `fill="rgba(255,255,255,1)"`).
4. Register both files in the `n8n.nodes` and `n8n.credentials` arrays in `package.json`
   — a node that is not listed there is silently not loaded.
5. `npm run lint && npm run build`.

## Adding a resource to an existing node

1. Create `nodes/<Node>/resources/<resource>/index.ts` exporting a
   `INodeProperties[]` — an `Operation` options property plus the parameters for
   each operation, each gated with `displayOptions.show`.
2. Spread it into `properties` of the node description and add the resource to the
   `Resource` options list.

`nodes/DoCounter/resources/counter/index.ts` is the reference implementation.

## Releasing

Publishing runs from GitHub Actions with npm provenance, which n8n requires for
community nodes. Locally:

```bash
npm run release
```

This lints, builds, prompts for the version bump, writes the changelog, commits,
tags and pushes. The pushed tag triggers `.github/workflows/publish.yml`, which
publishes to npm.

One-time npm setup is documented at the top of `.github/workflows/publish.yml`
(OIDC trusted publishing is preferred over an `NPM_TOKEN` secret).

## Open items

- **Payrexx**: the operations are built from the reference docs but not yet exercised
  against a live instance. The trigger cannot register itself — see below.
- **Cura**: the API is one inbound endpoint, so there is nothing to read back —
  a workflow cannot look a contact up, only submit one.
- **RaiseNow**: webhook signature verification is not implemented, and the operations
  are built from the spec but not yet exercised against a live account.
- **LibraCore**: only the campaign submission endpoint is modelled — that is all our
  Django integration used. Tenants may name the contact fields differently; the
  `Custom Fields` JSON parameter covers the difference until we model more.
- **Do Counter**: the standalone `n8n-nodes-do-counter` package is superseded by this
  one and should be deprecated on npm once instances have migrated.
- **Funtrade**: the operations are built from the OpenAPI spec, which is marked
  pre-release (0.9.0), and are not yet exercised against a live instance. The Events
  half of the API is not modelled, and there is no trigger node — see below.
- **Gravity Forms**: the operations are built from the REST API v2 reference and are
  not yet exercised against a live site. Feeds and results — the add-on endpoints —
  are not modelled, and file uploads need `multipart/form-data`, which the Submission
  resource does not send.

## Link Shortener notes

Built against the DRF API of `link-shortener`, which serves Swagger at
`/api/v1/docs/`, Redoc at `/api/v1/redoc/` and an OpenAPI schema at
`/api/v1/schema/` on your own instance.

The credential takes the **root URL**, without `/api`, and sends the admin-issued
key as `Authorization: Api-Key <key>`.

- **A key carries its owner's groups.** It only sees links filed under groups the
  owner belongs to, and can only create links on domains those groups may use.
  Naming a domain or group outside that set is a validation error, not a 403.
  Keys can be given an expiry, after which every request answers 401.
- **Domain and group are referenced by name**, not by ID — `example.com` and the
  group's name. Use the Domain and Group resources to discover what a key may use.
- **Links are read-write, domains and groups are read-only** over the API.
- **Slug and domain together must be unique.** A clash answers 400 with the message
  on the slug field. Leaving the slug empty generates a random one; slugs are
  lowercased before saving.
- **Create scrapes the target by default.** _Fetch Metadata_ fills in any open graph
  field you did not set yourself, and only applies when _Custom Tags_ is on. On
  update the flag is ignored — use **Refresh Metadata** instead, which re-scrapes and
  overwrites. It answers 502 when the target yields nothing.
- **`og_image` and `og_video` file uploads are not exposed.** They are multipart
  fields on the Django side; set `og_image_url` and `og_video_url` instead.
- **Lists are paginated** with `limit`/`offset` and answer a DRF
  `{"count": n, "results": [...]}` envelope. The node unwraps `results`, and
  _Return All_ follows the pages.
- **Identity → Who Am I** answers with the username, superuser flag, groups and
  domains behind the key. The API documents it as its own smoke test, and the
  credential test uses it.

There is no trigger node: the app has no webhooks.

## Flyertool notes

Built against the django-ninja API of `flyertool-web`, which serves interactive docs
at `/api/docs` and an OpenAPI schema at `/api/openapi.json` on your own instance.

The credential takes the **root URL**, without `/api`, because the node talks to two
routers: `/api/flyertool` for contacts and assignments, `/api/egwr` for addresses.

- **A key carries a user's visibility.** Keys are created in the Django admin under
  _API-Schlüssel_ and belong to a user; a key of a non-superuser only ever sees
  contacts and assignments of campaigns that user owns. Anything outside them answers
  404, so an empty result can mean the key is scoped too narrowly rather than that
  nothing matched. Untick _Aktiv_ to revoke a key.
- **Contacts have no create operation.** They come from the public signup form. The
  API reads, updates and deletes them.
- **Contacts are addressed by UUID**, the identifier the webhook, the export and the
  success redirect already use. Assignments are addressed by their numeric ID.
- **Updates are partial** — only the fields you add to _Update Fields_ are sent, and
  only those change. _Form Fields_ and _UTM Parameters_ are the exception: they
  replace the whole JSON object rather than merging into it.
- **Resetting a delivery address** means sending an explicit `null`, which a
  collection field cannot express. Put `{"delivery_address_id": null}` in _Additional
  Fields_; the contact then falls back to its own address.
- **Addresses are EGIDs** from the Swiss building register. Address → Search is how
  you find one for a contact update, and it can take a campaign ID to apply that
  campaign's address filters. Both address endpoints are public on the Flyertool side;
  the node sends the key anyway, which does no harm.
- **Lists are paginated** with `limit`/`offset` and answer `{"items": [...], "count": n}`.
  The node unwraps `items`, and _Return All_ follows the pages.
- Invalid payloads answer 422, and moving an assignment onto a cluster that is already
  taken answers 409.

### The trigger node

A campaign notifies one URL when someone signs up — its **Webhook URL** field in the
Flyertool admin. There is no API for setting that field, so the trigger registers
nothing: paste its Production URL into the campaign.

Things to know:

- **One event only**, a completed signup, fired from both the standalone and the
  embedded form. Nothing fires on update or delete.
- **The URL is the only protection.** Flyertool sends no secret and no signature, so
  treat the webhook URL as a credential.
- **Deliveries are fire and forget.** Flyertool posts with a five second timeout and
  swallows failures without retrying, so a missed delivery is simply lost. The node
  therefore acknowledges every request, including ones its campaign filter rejects.
- **The payload is flat and partial**: `uuid`, `first_name`, `last_name`, `email`,
  `order`, `campaign` (the name, not the slug or ID), `address_id` (EGID), the address
  parts, `fields` and `utm`. It carries no delivery address and no assignments —
  follow the trigger with **Flyertool → Contact → Get** on the `uuid` for the full
  record.
- The **Campaigns** filter matches the `campaign` name. Usually you can leave it
  empty, since each campaign has its own webhook URL; it earns its keep only when you
  point several campaigns at the same workflow.

## Payrexx notes

Built from <https://developers.payrexx.com/reference>, against API v1.16 — the
version is part of the base URL and the credential lets you change it.

Authentication uses the `X-API-KEY` header, which Payrexx recommends over its older
`ApiSignature` HMAC scheme. Same secret, no signing. The instance name is a query
parameter on every call, so the credential attaches it rather than every operation
repeating it.

Two naming traps in the API itself, kept as-is so requests match the docs:

- A **paylink** is `/Invoice/`.
- An **invoice** is `/Bill/`.

Other things worth knowing:

- **Amounts are in cents** everywhere.
- **Intervals** — subscription payment interval, period, cancellation interval — are
  PHP `DateInterval` strings: `P1M` monthly, `P1Y` yearly.
- **Get Many transactions**: Payrexx documents its filters as a request body on a
  `GET`. They are sent as query parameters, since a GET body is not reliably
  forwarded and the query string is what Payrexx's own SDK builds.
- **Invoice create** has a large nested payload. The common fields are modelled;
  discounts, cash discounts, reminders, bank information and attachments go through
  the _Additional Fields_ JSON parameter. The same applies to a paylink's contact
  `fields` list.

### The trigger node

Payrexx has **no API for managing webhooks** — no create, no list, no delete. So the
trigger registers nothing: it exposes a URL and you paste it into the Payrexx admin
under Settings → Integrations → Webhooks. That also means n8n cannot tell Payrexx
which events to send, so the _Transaction Statuses_ filter runs on this side, after
delivery, and an unmatched delivery is acknowledged without starting the workflow.

Status values are free text rather than a dropdown: the reference documents the
webhook payload only by example, so a hardcoded list would be a guess.

## RaiseNow notes

Built against the OpenAPI spec behind <https://docs.raisenow.com/api>
(`https://assets.raisenow.io/specs/api-public.json`). Authentication is an OAuth2
client-credentials grant against `/oauth2/token`; the credential exchanges client ID
and secret for a JWT and n8n refreshes it when a request comes back unauthorised.

Things worth knowing before wiring up a workflow:

- **Amounts are in minor units.** `1000` means 10.00. Payment amounts are strings,
  subscription amounts are integers — that is the API's own inconsistency, not ours.
- **Payment → Initialize** is the entry point of a payment flow. For redirect-based
  methods leave _Payment Information_ empty and follow the action returned in the
  response; fill it in only when passing an instrument directly.
- **Subscriptions need a payment source**, which you get from a payment run with
  _Create Payment Source_ enabled.
- **Recurring intervals** use a three-field day-of-month / month / weekday syntax:
  `1 * *` is monthly on the 1st, `15 3,6,9,12 *` is quarterly on the 15th.
- **Search** covers payment agreements, the one index the public API exposes. The
  query object is passed through as-is in RaiseNow's own DSL.
- **Get Many** operations page with `from` / `size`; _Return All_ follows the pages.

### The trigger node

RaiseNow delivers events in two steps, and the trigger manages both:

1. a **webhook endpoint** (`/webhooks`) — just the URL registration, which on its own
   receives nothing, and
2. one **event subscription** per event (`/event-subscriptions`) pointing at that
   endpoint.

Activating the node looks for an endpoint already registered for this workflow's URL
and reuses it, otherwise creates one, then creates any missing event subscriptions.
Deactivating removes the subscriptions it created, and the endpoint too unless it was
one it found rather than created.

Event names are free text (`rnw.event.payment_gateway.payment.succeeded` and friends)
rather than a dropdown — the list lives at <https://docs.raisenow.com/events> and
would go stale if it were hardcoded here.

The endpoint can carry an HMAC key so RaiseNow signs deliveries. The node stores the
key on the endpoint but does **not** verify incoming signatures — the algorithm is not
in the public spec. Treat the webhook URL as the secret until that is implemented.

## Cura notes

Cura's interface is deliberately small: one inbound endpoint,
`POST /api/latest/inbox/receiver/`, which drops a JSON payload into the Cura inbox
("Postfach"). Cura then creates a contact from it, or extends an existing one it
matches — on membership number first, then on a person match. Authentication is a
static token issued by Cura support, sent as `Authorization: token <ID>`.

- **Nothing is required.** Every documented key is optional, so the node has no
  required fields on _Contact → Send_. Send what you have.
- **Unknown keys are kept, not rejected.** They show up in the inbox but do not
  affect processing unless Cura support has built a rule for them. That is what
  _Additional Payload_ is for.
- **Create Donation Letter** sets `create_invoice` and needs a _Campaign ID_. It only
  works if the campaign has both "QR-Rechnung automatisch erstellen…" and
  "Angedrucktes Datum darf automatisch verändert werden" enabled in Cura.
- **Account → Who Am I** is the identification echo Cura documents; the credential
  test uses the same endpoint, which is why the credential holds the organisation
  slug.

There is no read API — a workflow can submit to Cura but cannot query it. Cura also
offers an _outgoing_ interface, but its scope and endpoints are defined per
organisation and would need to be built as a separate integration.

## LibraCore notes

The LibraCore service platform authenticates through Auth0 with a client-credentials
grant: the credential exchanges client ID and secret for a bearer token scoped to an
audience, and n8n refreshes it automatically when a request comes back unauthorised.
This mirrors `mv-mietzinsrechner/mv_api/services.py`, which is where the integration
came from.

Base URL, audience and Auth0 domain are per customer and per environment. They take
this shape — the real values for each tenant live in that project's credentials, not
here:

| Setting      | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| Base URL     | `https://services-api-staging.example.ch/api/v1/yourtenant`   |
| Audience     | same as the base URL (leave the field empty to default to it) |
| Auth0 domain | `example.eu.auth0.com`                                        |

The credential test hits Auth0 rather than the service API, because the platform has
no read-only endpoint to probe without writing data — so a green test proves the
client credentials and audience are right, not that the base URL is.

The **Campaign → Create** operation posts to `{base URL}/campaign` (the endpoint path
is editable) with the contact and consent fields the platform accepts:
`email`, `first_name`, `last_name`, `anrede`, `zip_code`, `quelle`, `nl_abo`,
`einwilligung_timestamp`, `einwilligung_ip`, `einwilligung_url`. Campaign-specific
keys — the `mzr_*` fields of the Mietzinsrechner, for instance — go into the
**Custom Fields** JSON parameter and are merged into the body as-is.

## Funtrade notes

[funtrade](https://www.funtrade.ch) is the CRM, fundraising and accounting system by
Arenae Consulting, used by Swiss NGOs for membership and donor management. The
end-user handbook is at `https://docs.funtrade.ch/<version>/`; the REST API has its
own ReDoc page at [app.funtrade.ch/api/](https://app.funtrade.ch/api/), which is
where the operations here come from.

That page embeds its OpenAPI document in a `__redoc_state` assignment rather than
linking one, so there is no spec URL to fetch. The document is checked in at
`openapi/funtrade.json` instead — it is what `nodes/Funtrade` was built against, and
having it in the tree is what makes a field name or an enum verifiable without
re-reading a 1 MB page. Refresh it with:

```bash
node scripts/fetch-funtrade-spec.mjs
```

and diff the result: a change there is the signal that an operation, a field or an
enum moved. The spec is marked pre-release (`0.9.0`) and the copy here was generated
by funtrade on 2026-01-05, so expect it to.

API keys are not self-service: they are requested from the assigned funtrade support
contact. The key goes in the `apikey` header (the API also accepts it as a query
parameter; the credential uses the header so it stays out of logs).

The node covers the CRM half of the API — a person and everything hanging off it:

| Resource        | Operations                                                |
| --------------- | --------------------------------------------------------- |
| **Person**      | Create, Delete, Get, Search, Update                       |
| **Address**     | Create, Delete, Get Many, Update                          |
| **Attribute**   | Create, Delete, Get Many, Update                          |
| **Interaction** | Create, Delete, Get Many, Record Refusal, Record Response |
| **Pledge**      | Create, Delete, Exit, Get Many, Update                    |
| **Publication** | Get Many, Update                                          |
| **Task**        | Create, Get Many, Update                                  |

The Events half (`/api/v1.0/eventsapi/`) is not modelled and is reachable through
Custom API Call.

### Two things shape every write

**Data quality checks.** The API reuses the business logic behind the funtrade user
interface, so its data-validity checks apply here too: the ZIP has to exist, the
street has to exist at that ZIP, the house number in that street. A failing check
comes back as a `400` with a `validationErrors` list naming the field. Usually the
right answer is to correct the data; where it is not, each resource has a **Data
Quality Overrides** collection holding that endpoint's `qc_` flags, which overrule a
single check for a single write.

**Concurrent mutation check.** Every update has to carry the `version` the record
had when it was read, and funtrade rejects the write if someone changed the record
in the meantime. So an update is always read-then-write: take **Version** from the
record the Get operation returned. The one exception is Publication → Update, whose
schema has no version field.

### Other things worth knowing

- **Nothing pages.** Search and every Get Many answer with the full list. Return All
  is therefore on by default, and Limit trims the response after it arrives rather
  than asking the API for less.
- **Codes come from the instance.** Salutations, titles, languages, address types,
  channels, attributes, task types and the rest are configured per instance, so
  those fields are dropdowns filled from the reference endpoints under `/crmapi/`
  rather than hardcoded lists.
- **Pledge is wide.** `PersonPledge` has around seventy fields, most of them
  maintained by funtrade itself. The node models the ones a workflow sets when it
  books a pledge; the rest go through **Additional Fields**, including the credit
  card fields, which are deliberately left out of the typed UI.
- **Ending a pledge**: Delete removes the record, **Exit** keeps it and records that
  the person left. Exit is almost always the one you want. Its `action` codes
  (`ACTION_S`, `ACTION_L`) are documented by the API without saying what each means —
  worth confirming with funtrade support before wiring into a live workflow.
- **Task field names differ between create and update** — `emai_list` vs `emailList`,
  `time_unit` vs `unit`, `description` vs `text`. Those are the API's spellings; each
  operation sends the one its own endpoint expects.

### No trigger node

funtrade webhooks are generic inbound receivers: you define one in funtrade, it
generates an endpoint under `/webhooks/v1.0/data/...`, and anything posted there is
queued for asynchronous processing. They deliver _into_ funtrade rather than out of
it, and there is no API to register one — so there is nothing for a trigger node to
subscribe to, the way the Payrexx and RaiseNow triggers do.

## Gravity Forms notes

Built against [REST API v2](https://docs.gravityforms.com/rest-api-v2/), which is part
of Gravity Forms core since 2.4 and has to be switched on under _Forms → Settings →
REST API_. There is no official n8n node and the one community package
(`@jezweb/n8n-nodes-gravity-forms`) has a deleted repository, so this is our own.

The credential takes the **site URL**, without `/wp-json`, and authenticates with HTTP
Basic. The two halves of a Gravity Forms key pair (`ck_…` / `cs_…`) go into _Consumer
Key_ and _Consumer Secret_ — or put a WordPress username there and an application
password from that user's profile page. Basic Auth only works over https.

- **Capabilities decide what a key may do**, because a request runs as the WordPress
  user behind it. Reading forms needs `gravityforms_edit_forms`, reading entries
  `gravityforms_view_entries`, writing them `gravityforms_edit_entries` — a key that
  may read entries but not forms answers 401 on Form → Get Many.
- **Entries are flat**, entry properties and submitted values in one object. Values are
  keyed by field ID: `"3"` for a simple field, `"1.3"` and `"1.6"` for the first and
  last name of a name field. Switch _Include Labels_ on to get a `_labels` map back, or
  read the field IDs off Form → Get.
- **Entry → Create writes straight to the database**: no validation, no notifications,
  no add-on feeds, no confirmation. **Submission → Submit** runs the values through the
  form the way a visitor would, and that is usually the one you want. Its values are
  keyed by _input name_ — `input_1`, `input_4_3` — not by field ID.
- **A failed validation is a 200.** Submission answers `is_valid: false` with
  `validation_messages` rather than an HTTP error, so branch on that field instead of
  expecting the node to fail. Submission → Validate runs the checks alone, without
  storing an entry.
- **Entry → Update replaces the whole entry.** Values you leave out are blanked out, so
  send the entry as Get returned it, changed. The same holds for Form → Update.
- **Delete trashes by default.** _Permanently Delete_ sets `force=1`; without it a
  second delete of an already trashed entry answers 410.
- **Searching is one `search` parameter**, a JSON object the node assembles from the
  _Filters_ collection. _Field Filters_ take a field ID or an entry property as the key
  — `date_created`, `payment_status` — and Form → Get Field Filters lists what a given
  form accepts. _Start Date_ and _End Date_ bound `date_created`; they are not in the
  REST reference but are part of the search criteria the endpoint passes down.
- **Lists page with `paging[page_size]` and `paging[offset]`** and answer
  `{"total_count": n, "entries": [...]}`. The node unwraps `entries`, and _Return All_
  follows the pages.
- **`GET /forms` answers with an object keyed by form ID**, not a list, and without
  _Form IDs_ it carries only ID, title and entry count. The node splits that object into
  one item per form; name the forms under _Form IDs_ to get their full definition.
- **File uploads are not modelled.** They need `multipart/form-data` on the submissions
  endpoint; use an HTTP Request node for those.

### The trigger node

Gravity Forms core has no webhooks — the Webhooks add-on is an Elite licence feature,
and even there the URL is registered per form in the WordPress admin rather than over
the API. So the trigger **polls**: every tick asks for the newest entries, sorted
descending, and emits the ones it has not seen.

- It compares against the **timestamp of the newest entry of the previous tick**, read
  from the API itself rather than from the n8n clock, so a WordPress server whose time
  is off does not cost entries.
- The first tick after activation only sets that mark. Entries that already existed are
  not replayed.
- _Entry Created or Updated_ watches `date_updated` instead, and fires again every time
  an entry is edited.
- One tick drains at most 1000 entries, ten pages of 100. A larger backlog is picked up
  by the ticks after it.
- If the site does run the Webhooks add-on, point it at a plain Webhook node instead —
  that delivers on submission rather than on the next tick.

## License

[MIT](LICENSE.md)
