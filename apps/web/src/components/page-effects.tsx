"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { legacyLinks } from "@/content/site";

export function PageEffects() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const migrateHash = () => {
      if (pathname !== "/") return;
      const destination = legacyLinks[window.location.hash];
      if (destination && destination !== "/") router.replace(destination);
    };
    migrateHash();
    window.addEventListener("hashchange", migrateHash);
    return () => window.removeEventListener("hashchange", migrateHash);
  }, [pathname, router]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 },
    );
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    nodes.forEach((node) => {
      if (
        motion.matches ||
        node.getBoundingClientRect().top < window.innerHeight
      )
        node.classList.add("in");
      else {
        node.classList.add("reveal-ready");
        observer.observe(node);
      }
    });
    const onMotion = () => {
      if (motion.matches) {
        nodes.forEach((node) => node.classList.add("in"));
        observer.disconnect();
      }
    };
    motion.addEventListener("change", onMotion);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotion);
      nodes.forEach((node) => node.classList.remove("reveal-ready"));
    };
  }, [pathname]);
  return null;
}
