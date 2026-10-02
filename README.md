# Nicole Raithel Styles client portal

A styling workspace for clients and administrators. The application uses React/Vinext, Cloudflare Workers, D1 for durable records, and R2 for private wardrobe photos.

## Included workflows

- Invitation-only email/password accounts, reset links, verified email changes, and secure sessions.
- One master administrator; additional administrators can be invited and deactivated.
- Client profiles with contact details, sizing, fit preferences, and styling notes.
- Separate draft/shared/completed styling sessions, including edits, item removal, archival, and update notifications.
- Product URL import for J.Crew and Nordstrom, with editable name, image, price, brand, category, recommended size/color, and notes.
- Client purchase choices with a dynamic Purchase Now total. Buying happens at the retailer.
- Session closeout requires an outcome for every item. Only confirmed purchased-and-kept items enter the wardrobe. Completion is idempotent.
- Wardrobe editing, removal, mobile multi-photo upload, and separate records for each existing item.
- Two-way client/stylist conversations and in-app notifications.
- Email outbox for invitations, sessions, updates, messages, resets, and email verification. Delivery monitoring and retry are available to administrators.
- Client access checks apply to every data route and photo request. Administrator invitations and deactivation require the master role.
- Explicit sample preview at `/preview`. Sample records never enter the real database; preview changes are temporary and no emails are sent.

## Local setup

Requires Node 22.13+ and npm.

```sh
npm ci
cp .env.example .dev.vars
# Replace MASTER_SETUP_TOKEN with a securely generated random code.
# Apply each generated migration to the local database only:
npx wrangler d1 execute DB --config wrangler.local.json --local --file drizzle/0000_loud_overlord.sql
npm run dev
```

Open the printed local address. The first account setup requires MASTER_SETUP_TOKEN and initializes ADMIN_EMAIL as the master account. Choose your own password. Remove MASTER_SETUP_TOKEN after setup; the account itself is the durable authority. The setup endpoint refuses to create another master account once one exists.

For production, configure logical `DB` and `BUCKET` bindings as declared in `.openai/hosting.json`; migrations are generated with Drizzle and applied by Sites. Runtime secrets are stored through Sites, never in the manifest or source repository. The starter's deployment Worker has a callable default `fetch` export.

The repository remains independently usable: the app's own invitation and cookie authentication does not require clients to have ChatGPT accounts. The initial Sites deployment is private to the owner while it is reviewed. Client launch requires the hosting access policy to allow external visitors while application-level authentication remains enforced.

## Launch connections

1. Set production MASTER_SETUP_TOKEN as a secret and ADMIN_EMAIL to the initial administrator address. Complete initial setup and remove the secret.
2. Configure RESEND_API_KEY and EMAIL_FROM from a verified sending domain. Without them, emails remain queued and the UI reports delivery as unconfigured. No placeholder emails are sent. Retry the queue after connecting the provider. The current version flushes bounded batches during notification actions and via an admin retry button; production can add a scheduled flush for unattended retries.
3. Set APP_ORIGIN to the canonical address before sending invitations. After the subdomain is verified, use that origin for newly generated links. Existing links retain their original hostname.
4. Configure SCRAPINGBEE_API_KEY if retailer anti-bot protection blocks direct importing. Requests are limited to J.Crew/Nordstrom; other retailer products may be entered manually. A rendering service can still be blocked, so the UI always allows correction. Product extraction is not guaranteed for every retailer or future page change.
5. Attach the selected subdomain through hosting and update its DNS in the existing domain provider. The Squarespace marketing website can remain at the root domain.
6. Confirm cookie login, photo access, email delivery, and import behavior on the actual host before inviting clients.

Prices are snapshots of the recommendation, support USD initially, and exclude retailer tax and shipping. Colors are imported when exposed; the stylist confirms the exact size/color. Mobile photos are resized client-side when supported. HEIC support depends on the browser; unsupported files are reported individually and should be exported as JPEG/PNG. Server uploads accept JPEG/PNG/WebP up to 10 MB. Wardrobe photos are served only after account authorization.

## Validation

```sh
npx tsc --noEmit
npm run build
```

`tests/flows.mjs` exercises disposable local accounts through the running app: invitation reuse, login, role permissions, private drafts, cross-client isolation, item choices, completion idempotency, wardrobe edits/removals, messages, import fallback, CSRF, private photo access, and queued email. Run it only against a pristine disposable local database. `tests/cleanup.sql` clears ALL local app data and is intended only for test fixtures; never apply it to a client database.

```sh
node tests/flows.mjs
```

`tests/product-parser.mjs` tests extraction against captured/synthetic product HTML without making retailer requests. Live retailer requests can be blocked independently of parser correctness.

## Security and operation

Passwords are salted with PBKDF2-SHA256 (100,000 iterations, Cloudflare Web Crypto limit) and protected by account/IP attempt limits. Login cookies are HttpOnly, SameSite=Lax, and Secure on HTTPS. Mutation routes enforce same-origin requests. One-time invitations/reset/verification tokens and sessions are stored hashed, expire, and are invalidated as appropriate. Product import follows only supported HTTPS retailer redirects to avoid arbitrary internal requests. Uploaded file signatures and ownership are checked server-side. Photo metadata lives in D1 and bytes in R2.

Account records and recommendation history are durable; removal/archive actions preserve history. Object retention and account erasure policies should be defined before collecting long-term client data. This first version does not include checkout, payments, retailer order tracking, or automatic return verification.

### Free rendered imports through Cloudflare
Set `CLOUDFLARE_ACCOUNT_ID` and secret `CLOUDFLARE_BROWSER_TOKEN` in hosted runtime settings. Create a restricted API token with Account → Browser Rendering → Edit for that account. The importer fetches initial HTML first, then uses Cloudflare only when product details are missing. It waits for network activity to settle, an h1, and another two seconds before parsing rendered HTML. When a ScrapingBee key is configured, ScrapingBee takes priority over Cloudflare. The verified configuration uses a premium US proxy, JavaScript rendering, a load-event wait, and another three seconds; each successful request used 25 credits in live tests. Cloudflare remains available when no ScrapingBee key is configured. On usage limits, blocked retailers, or connection errors, existing fields remain available for manual completion. The free daily browser allowance may be exhausted; no subscription is required to test. Live retailer success must be tested after credentials are connected.

### Guided shopping checklist
Clients can choose Make My Purchases within an open session. Purchase Now items are grouped by retailer hostname, with images, recommended sizes/colors, links opening in separate tabs, progress, and next-retailer navigation. Clients explicitly mark or undo Purchased after ordering. Purchase state and timestamps persist on the recommendation record, are visible to the stylist, and survive sign-in on other devices. Opening a retailer link never changes purchase state. Mark as Purchased adds the item to wardrobe immediately. Database uniqueness on the recommendation ID prevents duplicates; undo hides the same record, reconfirming restores it, and Close Session updates it or hides it for returned/not-purchased outcomes. Purchases are made at each retailer; this flow does not create retailer carts or place orders automatically.

### Import timing diagnostics
Admin imports return elapsed milliseconds for the direct fetch (including redirects and body reading), rendered-browser request (including provider queue, page load, JS and wait), extraction, and total server work. The form measures click-to-response time separately, displays an elapsed counter while waiting, and provides Copy timing report. Diagnostics include a request ID, timestamp, retailer hostname, direct HTTP status, provider, and rendering success; no API key or product URL is logged. Both complete and partial/failed renderer results include timings. Structured server diagnostics are emitted as `nrstyles.product_import`; the form report can be copied before closing the dialog. This does not change fetching order or retailer wait settings.
