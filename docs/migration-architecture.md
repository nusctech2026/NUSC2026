# Decision: migrate NUSC to Next.js

Status: accepted in the migration interview.

## Context

The existing site is one HTML file with inline CSS and JavaScript. NUSC needs separate responsive pages while retaining its identity and existing information. Content is maintained in the repository, hosting is Vercel, and a merchandise shop is planned for a later phase.

## Decision

Use Next.js App Router, React and TypeScript. Prerender the eight content pages at build time. Share a root layout, navigation, footer, page header, design styles and section components. Keep collections in typed content files and use server components for content. Limit client components to navigation, legacy fragment handling and reveal animation.

Keep the original HTML file unchanged as a migration reference. It is not part of the public Next.js site. Extract the embedded crest into `public/crest.png`. Self-host the same fonts using `next/font`. Preserve the CSS design vocabulary, while fixing responsive overflow and providing a compact inner-page header.

## Alternatives

- Vite with client-side routing would support separate URLs, but would need an additional prerendering approach for HTML content per route. Next.js supplies this and fits the chosen host.
- A CMS adds content permissions, an external service and publishing workflows that are not required while maintainers edit project files.
- A pure static export is viable today. Standard Next.js deployment on Vercel retains statically generated pages and avoids an export-only constraint when commerce requirements arrive.

## Boundaries and compatibility

The content files and editorial components are the source of truth. Phase one stores no visitor data and submits no forms to a backend; enquiries and applications retain email links. Commerce has no placeholder cart or payment integration in this release.

Header navigation identifies the active route. Old homepage hashes map to their new pages on the client; `#journey` targets the Club timeline. Navigation closes the mobile drawer and restores scrolling. Escape and a keyboard focus loop are supported. Reveal content is visible without JavaScript and motion settings are respected.

## Verification and revisit conditions

Check server-rendered routes, source-copy preservation, email links and 404 responses; also inspect responsive layouts and browser interactions. Revisit the content architecture when nontechnical staff require independent publishing. Revisit rendering and data boundaries when the shop’s catalogue, stock ownership, checkout and order lifecycle are defined. Deployment uses Vercel previews and normal rollback facilities after the project is connected.
