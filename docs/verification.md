# Migration verification

Verified locally on 10 September 2026 using Node.js 22.13.1, Next.js 16.3.4, React 19.3.0 and Chromium through Playwright 1.63.0.

## Results

- `npm run build`: passed; all eight content routes and the not-found route prerendered as static content.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no warnings.
- `git diff --check`: passed.
- `npm test`: five tests passed, covering direct routes, unique metadata, internal links/fragments, preservation of original copy and role requirements, application email links, and the 404 response.
- `npm run test:browser`: four tests passed, covering mobile focus/scroll lock/Escape/history/navigation, legacy fragments, reduced motion, content without JavaScript and responsive layout.

## Rendered inspection

All eight pages were checked at 320, 390, 768 and 1366 CSS-pixel viewport widths with no unintended content overflow. Intentional clipped decorations and the marquee are excluded from overflow assertions. The desktop hero’s action buttons fit within a 1366 × 768 viewport. The same Barlow Condensed and Inter fonts loaded successfully.

The home hero, mobile Careers page and desktop player section were inspected visually. Screenshots from the browser suite are available under `artifacts/browser/site-every-page-fits-phone-03eca-hs-without-content-overflow/` after running it. That generated directory is ignored by Git.

The original HTML was preserved as a reference, including its pre-existing working-tree changes. Existing club information was migrated as supplied, rather than independently fact-checked. External Instagram and email destinations were preserved; tests do not send messages or applications. Testing used Chromium, not physical mobile devices or every browser engine.

## Deployment status

The application is prepared for Vercel using its standard Next.js preset. No Vercel deployment, Git push or production-domain change was performed. Follow the README deployment steps when connecting the repository.
