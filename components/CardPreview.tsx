"use client";

import type { GeneratorConfig } from "@/lib/presets";
import { splitURL, truncateURL } from "@/lib/parse-links";

interface CardPreviewProps {
  config: Partial<GeneratorConfig>;
  sampleUrl: string;
}

export default function CardPreview({ config, sampleUrl }: CardPreviewProps) {
  const mode = config.urlDisplayStyle ?? "truncated";
  const split = splitURL(sampleUrl);

  return (
    <section className="rounded-lg border border-cursor-border bg-cursor-bg-dark p-5">
      <h2 className="text-sm font-semibold text-cursor-text">Card preview</h2>
      <div className="mt-4 flex justify-center">
        <div className="w-full max-w-xs rounded-md border border-cursor-border-emphasis bg-white p-4 text-center text-black">
          {config.eventName ? <p className="text-[10px]">{config.eventName}</p> : null}
          {config.eventDate ? <p className="text-[10px] text-neutral-500">{config.eventDate}</p> : null}
          <img
            src="/cursor-logo.png"
            alt="Cursor"
            className="mx-auto mt-2 h-6 w-auto object-contain"
          />
          <div className="mx-auto mt-3 h-32 w-32 rounded bg-neutral-200 text-xs text-neutral-600 grid place-items-center">
            QR
          </div>
          <p className="mt-2 text-sm font-bold">
            {(config.labelPrefix ?? "#")}
            {String(config.startNumber ?? 1).padStart(3, "0")}
          </p>
          {mode === "truncated" ? (
            <p className="text-[10px] text-neutral-500">{truncateURL(sampleUrl)}</p>
          ) : null}
          {mode === "full" ? (
            <div className="text-[10px]">
              <p className="text-neutral-500">{split.line1}</p>
              <p className="font-bold">{split.line2}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
