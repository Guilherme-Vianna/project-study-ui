import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "danger" | "link";

const variants: Record<Variant, string> = {
  primary:
    "h-12 w-full rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover disabled:bg-primary/60",
  danger:
    "h-12 w-full rounded-full bg-danger px-6 font-medium text-white hover:bg-danger/90 disabled:bg-danger/60",
  secondary:
    "h-12 rounded-full border border-border bg-surface px-6 font-medium text-ink hover:border-border-strong hover:bg-canvas disabled:text-muted",
  link: "rounded-sm font-medium text-primary underline-offset-4 hover:underline disabled:text-muted",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel,
  icon,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex cursor-pointer items-center justify-center gap-3 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}
