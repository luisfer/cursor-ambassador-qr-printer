"use client";

import type { GeneratorConfig, PaperSize, UrlDisplayStyle } from "@/lib/presets";

interface ConfigFormProps {
  config: Partial<GeneratorConfig>;
  onChange: (patch: Partial<GeneratorConfig>) => void;
}

export default function ConfigForm({ config, onChange }: ConfigFormProps) {
  return (
    <section className="rounded-lg border border-cursor-border bg-cursor-bg-dark p-5">
      <h2 className="text-sm font-semibold text-cursor-text">Configuration</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-cursor-text-muted">
          Event name (optional)
          <input
            className="mt-1 w-full rounded-md border border-cursor-border bg-cursor-surface px-3 py-2 text-sm text-cursor-text outline-none focus:border-cursor-border-emphasis"
            value={config.eventName ?? ""}
            onChange={(e) => onChange({ eventName: e.target.value })}
          />
        </label>

        <label className="text-xs text-cursor-text-muted">
          Date (optional)
          <input
            className="mt-1 w-full rounded-md border border-cursor-border bg-cursor-surface px-3 py-2 text-sm text-cursor-text outline-none focus:border-cursor-border-emphasis"
            value={config.eventDate ?? ""}
            onChange={(e) => onChange({ eventDate: e.target.value })}
          />
        </label>

        <label className="text-xs text-cursor-text-muted">
          URL display
          <select
            className="mt-1 w-full rounded-md border border-cursor-border bg-cursor-surface px-3 py-2 text-sm text-cursor-text outline-none"
            value={config.urlDisplayStyle ?? "truncated"}
            onChange={(e) => onChange({ urlDisplayStyle: e.target.value as UrlDisplayStyle })}
          >
            <option value="truncated">Partially hidden (truncated)</option>
            <option value="full">Total (full code)</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>

        <label className="text-xs text-cursor-text-muted">
          Grid columns
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-cursor-border bg-cursor-surface px-3 py-2 text-sm text-cursor-text outline-none"
            value={config.gridCols ?? 3}
            onChange={(e) => onChange({ gridCols: Number(e.target.value) || 1 })}
          />
        </label>

        <label className="text-xs text-cursor-text-muted">
          Grid rows
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-cursor-border bg-cursor-surface px-3 py-2 text-sm text-cursor-text outline-none"
            value={config.gridRows ?? 3}
            onChange={(e) => onChange({ gridRows: Number(e.target.value) || 1 })}
          />
        </label>

        <label className="text-xs text-cursor-text-muted">
          Paper size
          <select
            className="mt-1 w-full rounded-md border border-cursor-border bg-cursor-surface px-3 py-2 text-sm text-cursor-text outline-none"
            value={config.paperSize ?? "A4"}
            onChange={(e) => onChange({ paperSize: e.target.value as PaperSize })}
          >
            <option value="A4">A4</option>
            <option value="LETTER">Letter</option>
            <option value="A3">A3</option>
          </select>
        </label>

        <label className="text-xs text-cursor-text-muted">
          Start number
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-cursor-border bg-cursor-surface px-3 py-2 text-sm text-cursor-text outline-none"
            value={config.startNumber ?? 1}
            onChange={(e) => onChange({ startNumber: Number(e.target.value) || 1 })}
          />
        </label>
      </div>
    </section>
  );
}
