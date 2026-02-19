"use client";

import { useMemo, useState } from "react";
import type { GeneratorConfig } from "@/lib/presets";

interface ExportButtonProps {
  file: File | null;
  linksCount: number;
  config: Partial<GeneratorConfig>;
}

export default function ExportButton({ file, linksCount, config }: ExportButtonProps) {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const label = useMemo(() => {
    if (!busy) return "Export PDF";
    return progress < 100 ? `Generating... ${progress}%` : "Downloading...";
  }, [busy, progress]);

  const exportPdf = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setProgress(2);

    const estimate = Math.max(2000, linksCount * 100 + 500);
    const start = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.min(90, Math.floor((elapsed / estimate) * 90));
      setProgress((prev) => (percent > prev ? percent : prev));
    }, 120);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("config", JSON.stringify(config));
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Export failed");
      }

      setProgress(100);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qr-cards.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      window.clearInterval(timer);
      setTimeout(() => {
        setBusy(false);
        setProgress(0);
      }, 400);
    }
  };

  return (
    <section className="rounded-lg border border-cursor-border bg-cursor-bg-dark p-5">
      <button
        type="button"
        onClick={exportPdf}
        disabled={!file || busy}
        className="w-full rounded-md bg-cursor-text px-4 py-2 text-sm font-semibold text-cursor-bg transition disabled:opacity-50"
      >
        {label}
      </button>
      {busy ? (
        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-cursor-surface">
          <div
            className="h-full bg-cursor-accent-green transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </section>
  );
}
