import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  labelAction?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function TextField({
  label,
  optional = false,
  hint,
  error,
  labelAction,
  trailing,
  className = "",
  ref,
  ...props
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {optional && <span className="font-normal text-muted"> (opcional)</span>}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-full border bg-surface px-5 text-base text-ink placeholder:text-muted transition-colors focus:outline-2 focus:outline-offset-0 disabled:bg-canvas disabled:text-muted ${
            trailing ? "pr-14" : ""
          } ${
            error
              ? "border-danger focus:outline-danger"
              : "border-border-strong hover:border-ink focus:border-primary focus:outline-primary"
          }`}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="px-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="px-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
