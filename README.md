# n8n-nodes-digital-organizing

n8n community nodes for the tools [Digital Organizing](https://digitalorganizing.ch) works with, bundled
in one installable package instead of one package per tool.

| Node                 | Status                                 | Credential                       |
| -------------------- | -------------------------------------- | -------------------------------- |
| **Do Counter**       | Implemented (counter, campaign, entry) | `Do Counter API`                 |
| **Payrexx**          | Scaffold + custom API call             | `Payrexx API`                    |
| **RaiseNow**         | Scaffold + custom API call             | `RaiseNow API`                   |
| **Cura Fundraising** | Scaffold + custom API call             | `Cura Fundraising API`           |
| **LibraCore**        | Campaign submissions + custom API call | `LibraCore Service Platform API` |

The scaffolded nodes already authenticate and can call any endpoint through their
**Custom API Call** resource. Typed resources get added on top of that, one at a
time — see [Adding a node](#adding-a-node).

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
  DoCounter/
    DoCounter.node.ts           node description: resources, credentials, requestDefaults
    shared/descriptions.ts      properties reused across resources of this node
    resources/<resource>/       one folder per resource, exporting its operations
  Payrexx/  RaiseNow/  Cura/    same shape
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

- **Payrexx**: request signing (HMAC-SHA256 → `ApiSignature`) is implemented in the
  credential but not yet verified against the live API; nested parameters
  (`key[sub]=value`) are not serialised yet.
- **RaiseNow**: auth scheme and base URL are assumed (bearer token) — confirm against
  the RaiseNow docs.
- **Cura**: API surface unknown; base URL and key are per instance.
- **LibraCore**: only the campaign submission endpoint is modelled — that is all our
  Django integration used. Tenants may name the contact fields differently; the
  `Custom Fields` JSON parameter covers the difference until we model more.
- **Do Counter**: the standalone `n8n-nodes-do-counter` package is superseded by this
  one and should be deprecated on npm once instances have migrated.

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
