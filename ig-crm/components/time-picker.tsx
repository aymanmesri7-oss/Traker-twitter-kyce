"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MIN, fromParisInputValue, toParisInputValue } from "@/lib/time";

const PRESETS = [
  { label: "Maintenant", min: 0 },
  { label: "15min", min: 15 },
  { label: "30min", min: 30 },
  { label: "1h", min: 60 },
  { label: "2h", min: 120 },
  { label: "3h", min: 180 },
  { label: "5h", min: 300 },
];

export type TimeChoice = { preset: number } | { custom: string };

export function resolveTime(c: TimeChoice): Date | null {
  if ("preset" in c) return new Date(Date.now() - c.preset * MIN);
  return fromParisInputValue(c.custom);
}

/** Saisie relative : "il y a 2h" ou date/heure de Paris personnalisée. */
export function TimePicker({ value, onChange, label = "Quand ?" }: { value: TimeChoice; onChange: (v: TimeChoice) => void; label?: string }) {
  const [customOpen, setCustomOpen] = useState("custom" in value);

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = !customOpen && "preset" in value && value.preset === p.min;
          return (
            <button
              key={p.min}
              type="button"
              onClick={() => {
                setCustomOpen(false);
                onChange({ preset: p.min });
              }}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-medium ring-1 ring-inset transition-all",
                active ? "bg-accent text-white ring-accent" : "bg-surface-2 text-muted ring-line hover:text-white hover:ring-line-strong"
              )}
            >
              {p.min === 0 ? p.label : `il y a ${p.label}`}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustomOpen(true);
            onChange({ custom: toParisInputValue(new Date()) });
          }}
          className={cn(
            "h-8 rounded-lg px-3 text-xs font-medium ring-1 ring-inset transition-all",
            customOpen ? "bg-accent text-white ring-accent" : "bg-surface-2 text-muted ring-line hover:text-white hover:ring-line-strong"
          )}
        >
          Autre…
        </button>
      </div>
      {customOpen && "custom" in value && (
        <div className="mt-2 animate-fade-in">
          <input type="datetime-local" className="field" value={value.custom} onChange={(e) => onChange({ custom: e.target.value })} />
          <p className="mt-1 text-[11px] text-muted">Heure de Paris</p>
        </div>
      )}
    </div>
  );
}
