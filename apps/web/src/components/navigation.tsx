"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { club, navigation } from "@/content/site";

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = [
      document.querySelector("main"),
      document.querySelector("footer"),
      document.querySelector(".skip-link"),
    ].filter((el): el is HTMLElement => el instanceof HTMLElement);
    background.forEach((el) => (el.inert = true));
    drawer.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggle.current?.focus();
      }
      if (event.key !== "Tab") return;
      const links = Array.from(
        drawer.current?.querySelectorAll<HTMLAnchorElement>("a") || [],
      );
      const first = links[0];
      const last = links.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        toggle.current?.focus();
      } else if (event.shiftKey && document.activeElement === toggle.current) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        toggle.current?.focus();
      } else if (!event.shiftKey && document.activeElement === toggle.current) {
        event.preventDefault();
        first?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 1181px)");
    const closeOnWide = () => {
      if (wide.matches) setOpen(false);
    };
    const closeOnHistory = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", closeOnHistory);
    wide.addEventListener("change", closeOnWide);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((el) => (el.inert = false));
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", closeOnHistory);
      wide.removeEventListener("change", closeOnWide);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  return (
    <>
      <nav
        className={`nav${scrolled || pathname !== "/" || open ? " scrolled" : ""}`}
        aria-label="Primary"
      >
        <div className="wrap nav-in">
          <Link
            className="brand"
            href="/"
            aria-label={`${club.name} home`}
            tabIndex={open ? -1 : undefined}
            onClick={close}
          >
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-txt">
              <b>Nagaland United</b>
              <span>Sports Club</span>
            </span>
          </Link>
          <div className="nav-links">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "active" : undefined}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            className={`burger${open ? " open" : ""}`}
            ref={toggle}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            <span />
          </button>
        </div>
      </nav>
      <div
        ref={drawer}
        className={`drawer${open ? " open" : ""}`}
        id="mobile-navigation"
        inert={!open}
        aria-hidden={!open}
      >
        <div className="burst faint" aria-hidden="true" />
        <nav aria-label="Mobile">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={close}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <a
          className="btn btn-red"
          href={club.instagram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
        >
          Follow NUSC <span aria-hidden="true">↗</span>
        </a>
      </div>
    </>
  );
}
