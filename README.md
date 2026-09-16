# n8n-nodes-digital-organizing

n8n community nodes for the tools [Digital Organizing](https://digitalorganizing.ch) works with, bundled
in one installable package instead of one package per tool.

| Node                  | Status                                                                     | Credential                       |
| --------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| **Do Counter**        | Implemented (counter, campaign, entry)                                     | `Do Counter API`                 |
| **Flyertool**         | Implemented (contacts, assignments, addresses)                             | `Flyertool API`                  |
| **Flyertool Trigger** | Implemented (static webhook)                                               | –                                |
| **Link Shortener**    | Implemented (links, domains, groups, identity)                             | `Link Shortener API`             |
| **Payrexx**           | Implemented (transactions, subscriptions, QR codes, paylinks, invoices)    | `Payrexx API`                    |
| **Payrexx Trigger**   | Implemented (static webhook)                                               | –                                |
| **RaiseNow**          | Implemented (payments, supporters, subscriptions, plans, search, webhooks) | `RaiseNow API`                   |
| **RaiseNow Trigger**  | Implemented (webhook endpoint + event subscriptions)                       | `RaiseNow API`                   |
| **Cura Fundraising**  | Implemented (inbox contact submissions)                                    | `Cura Fundraising API`           |
| **LibraCore**         | Campaign submissions + custom API call                                     | `LibraCore Service Platform API` |

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
nodes/
  shared/customApiCall.ts       generic "Custom API Call" resource used by every node
  shared/mergeJsonBody.ts       preSend factory folding a JSON parameter into the body
  DoCounter/
    DoCounter.node.ts           node description: resources, credentials, requestDefaults
    shared/descriptions.ts      properties reused across resources of this node
    resources/<resource>/       one folder per resource, exporting its operations
  Payrexx/  RaiseNow/  Cura/    same shape
  shared/pagination.ts          limit/offset paging over an items or results envelope
  RaiseNowTrigger/              programmatic trigger: webhook lifecycle in webhookMethods
  PayrexxTrigger/               static webhook trigger: no lifecycle, URL pasted by hand
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

## License

[MIT](LICENSE.md)
