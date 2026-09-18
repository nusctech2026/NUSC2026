# Nagaland United Sports Club

NUSC's monorepo contains the public club website and a separate frontend-only store preview, both built with Next.js App Router and TypeScript. The current work realigns the codebase to the agreed three-app direction without provisioning Supabase, Payload, payments, or deployment.

## Applications

| App | Local role | Target address |
| --- | --- | --- |
| `apps/web` | Public club website | `yourdomain.com` |
| `apps/store` | Frontend-only shop preview | `shop.yourdomain.com` |
| `apps/admin` | Planned Payload staff dashboard | `admin.yourdomain.com` |

`apps/admin` is intentionally not scaffolded yet because Payload/backend work has not been authorized.

## Development

Use Node.js 22 LTS and npm.

```sh
npm ci
npm run dev:web
npm run dev:store
```

Open the web app at http://localhost:3000 and the store app at http://localhost:3001. The root `index.html` is the untouched source reference from before the migration.

```sh
npm run build
npm run start:web
npm run start:store
```

The build prerenders both apps. Fonts are downloaded during the build through `next/font` and then served by the apps. The first build needs access to Google Fonts.

## Routes

The web app keeps the original public club routes:

| URL | Content |
| --- | --- |
| `/` | Hero, achievement ticker, snapshot, page previews, support |
| `/club` | Club story, journey, mission and vision |
| `/honours` | Trophy, awards and district representation |
| `/pathway` | Development stages, player progression and IIS scholars |
| `/community` | Peace Pays and outreach |
| `/partners` | Partner tiers and enquiry |
| `/careers` | Five roles and email application instructions |
| `/contact` | Address, email, Instagram and enquiry routes |

The store landing page is `/` inside `apps/store`, not `/shop` inside `apps/web`.

Old homepage fragments are handled in `apps/web/src/components/page-effects.tsx`; for example, `/#journey` opens `/club#journey`. These require JavaScript because URL fragments are not sent to the server.

## Updating Content

- `apps/web/src/content/site.ts`: club contact details, navigation, careers deadline and email helper.
- `apps/web/src/content/collections.ts`: player records, awards, pathway steps, scholars, partner tiers, jobs, snapshot and achievement ticker.
- `apps/web/src/content/pages.ts`: inner-page introductions, search descriptions and homepage previews.
- `apps/web/src/components/sections/`: the club's longer editorial copy and section layouts.
- `apps/web/public/crest.png`: original club crest.
- `apps/store/src/app/page.tsx`: frontend-only shop landing preview.
- `apps/store/public/shop/`: synthetic test imagery for layout evaluation only.

Store images are not official catalogue assets. Replace them with club-approved product photography before launch.

## Validation

```sh
npm run lint
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Run the build before the tests. Route tests start production servers for `apps/web` on port 3101 and `apps/store` on port 3103. Browser tests use `apps/web` on port 3102 and `apps/store` on port 3103.

To test already running servers, set `TEST_WEB_BASE_URL` and `TEST_STORE_BASE_URL`. Screenshots and failure traces are written to `artifacts/browser/`.

## Scope

This repository currently contains frontend-only app realignment and the shop landing preview. Supabase, Payload, commerce operations, product inventory, payments, delivery, order handling, and deployment remain separate authorized phases.
