"use client";

import { sortWeekdays, WEEKDAYS, type Weekday } from "@/lib/plans/model";

type WeekdayPickerProps = {
  label: string;
  value: Weekday[];
  disabled?: boolean;
  onChange: (days: Weekday[]) => void;
};

export function WeekdayPicker({ label, value, disabled = false, onChange }: WeekdayPickerProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {WEEKDAYS.map((day) => {
        const active = value.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={active}
            aria-label={day.label}
            title={day.label}
            disabled={disabled}
            onClick={() => onChange(active ? value.filter((item) => item !== day.value) : sortWeekdays([...value, day.value]))}
            className={`h-8 min-w-10 cursor-pointer rounded-full border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${
              active ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:border-border-strong hover:text-ink"
            }`}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}
