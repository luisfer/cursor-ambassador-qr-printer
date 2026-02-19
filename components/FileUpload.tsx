"use client";

import { useRef, useState } from "react";
import { parseLinksFromText } from "@/lib/parse-links";

interface FileUploadProps {
  onFileLoaded: (payload: { file: File; text: string; count: number }) => void;
}

export default function FileUpload({ onFileLoaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const count = parseLinksFromText(text).length;
      if (count === 0) {
        setError("No valid URLs found. Expected one URL per line or CSV URL,Name.");
        return;
      }
      setError("");
      onFileLoaded({ file, text, count });
    } catch {
      setError("Could not read this file.");
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,text/plain,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        className={`w-full rounded-lg border border-dashed p-6 text-left transition ${
          dragging
            ? "border-cursor-border-emphasis bg-cursor-surface-raised"
            : "border-cursor-border bg-cursor-surface hover:border-cursor-border-emphasis"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
      >
        <p className="text-sm text-cursor-text">Upload credits file (.csv or .txt)</p>
        <p className="mt-1 text-xs text-cursor-text-muted">
          Drag and drop, or click to browse.
        </p>
      </button>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
