"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/catalog", label: "Catalog" },
  { href: "/quotes", label: "Quotes" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  // Hide navbar on shareable quote pages
  if (pathname?.match(/^\/quotes\/[^/]+$/) && !pathname.endsWith("/new")) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] shadow-md">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-secondary)] transition-colors">
              Monetizely
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "text-[var(--text-primary)] bg-[var(--bg-elevated)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/50"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
