"use client";

import { useMemo, useState } from "react";
import CardPreview from "@/components/CardPreview";
import ConfigForm from "@/components/ConfigForm";
import ExportButton from "@/components/ExportButton";
import FileUpload from "@/components/FileUpload";
import { DEFAULT_CONFIG, type GeneratorConfig } from "@/lib/presets";
import { parseLinksFromText } from "@/lib/parse-links";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [linksText, setLinksText] = useState("");
  const [linksCount, setLinksCount] = useState(0);
  const [config, setConfig] = useState<Partial<GeneratorConfig>>(DEFAULT_CONFIG);

  const sampleUrl = useMemo(() => {
    const urls = parseLinksFromText(linksText);
    return urls[0] ?? "https://cursor.com/referral?code=EXAMPLE1234";
  }, [linksText]);

  return (
    <main className="min-h-screen bg-cursor-bg text-cursor-text">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-cursor-text-muted">
              Cursor Community
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              QR Card Generator
            </h1>
          </div>
          <img src="/cursor-logo.png" alt="Cursor" className="h-8 w-auto object-contain" />
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <FileUpload
              onFileLoaded={({ file: loadedFile, text, count }) => {
                setFile(loadedFile);
                setLinksText(text);
                setLinksCount(count);
              }}
            />
            <ConfigForm
              config={config}
              onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
            />
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-cursor-border bg-cursor-bg-dark p-5">
              <h2 className="text-sm font-semibold text-cursor-text">Upload summary</h2>
              <p className="mt-2 text-sm text-cursor-text-muted">
                {file ? `${file.name} loaded` : "No file uploaded yet"}
              </p>
              <p className="mt-1 text-xs text-cursor-text-faint">
                {linksCount} valid referral links detected.
              </p>
            </section>

            <CardPreview config={config} sampleUrl={sampleUrl} />
            <ExportButton file={file} linksCount={linksCount} config={config} />
          </div>
        </div>
      </div>
    </main>
  );
}
