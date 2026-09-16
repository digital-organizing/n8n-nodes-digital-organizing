# Changelog

All notable changes to this package are documented here. The changelog below this
line is maintained by `release-it` as part of `npm run release`.

## 0.1.0

- Initial package, bundling all Digital Organizing n8n nodes:
  - **Do Counter** — ported from the standalone `n8n-nodes-do-counter` package.
  - **Flyertool** — API-key authentication plus contacts, cluster assignments
    and building-register address lookup, and a static webhook trigger for
    campaign signups.
  - **LibraCore** — Auth0 client-credentials authentication and the campaign
    submission endpoint, ported from the mv-mietzinsrechner Django integration.
  - **RaiseNow** — OAuth2 client-credentials authentication plus payments,
    supporters, subscriptions, subscription plans and search, a webhook endpoint
    resource, and a trigger node that manages webhook endpoints together with
    their event subscriptions.
  - **Cura Fundraising** — token authentication and the inbox endpoint, which
    is the whole documented inbound interface.
  - **Payrexx** — X-API-KEY authentication plus transactions, subscriptions, QR
    codes, paylinks and invoices, and a static webhook trigger node.
