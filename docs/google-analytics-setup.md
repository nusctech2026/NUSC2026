# Google Analytics 4 setup

The public club website (`apps/web`) and store (`apps/store`) load Google Analytics only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` contains a valid GA4 web stream ID such as `G-ABC1234567`. The Admin app is not instrumented.

## Create a GA4 web stream

1. Open [Google Analytics](https://analytics.google.com/) and select or create the NUSC GA4 property.
2. In **Admin → Data streams**, add a **Web** stream for the site's production domain.
3. Copy the stream's Measurement ID. You need Editor access to the property to manage its Google tag.
4. If the website and store should report to one stream, use that same ID in both app deployments. If you create separate web streams, set each app's environment variable to its own stream ID.

## Configure the apps

For local development, set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...` in the app's local environment file. For production, add the variable to the deployment environment for both the website and store, then rebuild and deploy each app. The value is public and is embedded in the browser bundle; it is not a secret.

The integration sends one `page_view` per eligible App Router path change. It omits query strings and hashes, uses a sanitized referrer, and skips account, checkout, login, dashboard, and application-form routes. The tag is not loaded on a direct visit to those routes. Advertising signals are disabled. No commerce or form-submission events are configured.

Because page views are sent by the app, open the web stream's **Enhanced measurement** settings and turn off **Page changes based on browser history events** to avoid duplicate page views. Review the other enhanced measurement toggles too; disable form interactions if you do not want those events collected.

## Confirm data arrives

After deploying with the ID set, open the site in a fresh browser session and check the property's **Realtime** report. Navigate between a few public pages; each path should appear once. The Measurement ID must match the selected web stream.

Before enabling production collection, review both apps' privacy disclosures. The main site's current policy mentions general analytics and cookies but does not name Google, and the store policy does not yet describe analytics. This code does not provide a cookie-consent interface.
