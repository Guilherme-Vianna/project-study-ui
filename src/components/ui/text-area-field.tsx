import { useId, type TextareaHTMLAttributes } from "react";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  maxLength: number;
  value: string;
};

export function TextAreaField({ label, optional = false, hint, error, maxLength, value, className = "", ...props }: TextAreaFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const remaining = maxLength - value.length;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (opcional)</span>}
      </label>
      <textarea
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined}
        className={`min-h-28 w-full resize-y rounded-2xl border bg-surface px-5 py-3 text-base text-ink placeholder:text-muted transition-colors focus:outline-2 focus:outline-offset-0 disabled:bg-canvas disabled:text-muted ${
          error
            ? "border-danger focus:outline-danger"
            : "border-border-strong hover:border-ink focus:border-primary focus:outline-primary"
        }`}
        {...props}
      />
      <div className="flex justify-between gap-4 px-1 text-sm">
        {error ? (
          <p id={errorId} className="text-danger">
            {error}
          </p>
        ) : (
          <p id={hintId} className="text-muted">
            {hint}
          </p>
        )}
        <span className={`shrink-0 tabular-nums ${remaining < 0 ? "text-danger" : "text-muted"}`} aria-hidden="true">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
