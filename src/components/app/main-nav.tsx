"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  if (items.length < 2) return null;

  return (
    <nav
      aria-label="Principal"
      className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t border-border px-4 py-2 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 md:order-none md:mx-0 md:w-auto md:flex-1 md:overflow-visible md:border-0 md:p-0"
    >
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4 ${
                  current ? "bg-primary-soft text-primary" : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
