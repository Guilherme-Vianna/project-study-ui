import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
};

export function PageHeader({ title, eyebrow, description, back, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          href={back.href}
          className="mb-6 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="text-sm font-medium text-primary">{eyebrow}</p>}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="shrink-0 whitespace-nowrap">{actions}</div>}
      </div>
    </div>
  );
}
