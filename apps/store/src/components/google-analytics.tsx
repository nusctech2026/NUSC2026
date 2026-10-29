"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const isValidMeasurementId = Boolean(
  measurementId && /^G-[A-Z0-9]+$/i.test(measurementId),
);

const untrackedRoutePrefixes = [
  "/account",
  "/api",
  "/checkout",
  "/forgot-password",
  "/login",
  "/orders",
  "/register",
  "/reset-password",
  "/search",
  "/test-loader",
];

function isTrackablePath(pathname: string) {
  return !untrackedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getSafeReferrer(previousPathname: string | null) {
  if (previousPathname) {
    return `${window.location.origin}${previousPathname}`;
  }

  if (!document.referrer) {
    return undefined;
  }

  try {
    return new URL(document.referrer).origin;
  } catch {
    return undefined;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const lastTrackedPathname = useRef<string | null>(null);
  const initialized = useRef(false);
  const [shouldLoadTag, setShouldLoadTag] = useState(false);

  useEffect(() => {
    if (!isValidMeasurementId || !measurementId || !pathname) {
      return;
    }

    if (!isTrackablePath(pathname)) {
      lastTrackedPathname.current = null;
      window.gtag?.("config", measurementId, {
        send_page_view: false,
        page_location: window.location.origin,
        page_title: "Private page",
      });
      setShouldLoadTag(false);
      return;
    }

    if (lastTrackedPathname.current === pathname) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));

    const pageLocation = `${window.location.origin}${pathname}`;
    const pageTitle = document.title;
    const pageReferrer = getSafeReferrer(lastTrackedPathname.current);
    const pageDetails = {
      page_path: pathname,
      page_location: pageLocation,
      page_title: pageTitle,
      ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
    };

    if (!initialized.current) {
      window.gtag("js", new Date());
      initialized.current = true;
    }

    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ...pageDetails,
    });
    window.gtag("event", "page_view", pageDetails);
    lastTrackedPathname.current = pathname;
    setShouldLoadTag(true);
  }, [pathname]);

  if (
    !shouldLoadTag ||
    !isValidMeasurementId ||
    !measurementId ||
    !pathname ||
    !isTrackablePath(pathname)
  ) {
    return null;
  }

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
}
