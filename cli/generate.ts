import fs from "fs";
import path from "path";
import { generateQRCodePDF } from "@/lib/generate-pdf";
import { UrlDisplayStyle } from "@/lib/presets";

function getFlag(name: string): string | undefined {
  const idx = process.argv.findIndex((arg) => arg === `--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function run(): Promise<void> {
  const linksFile = process.argv[2] ?? "links.txt";
  const outputFile = process.argv[3] ?? "dist/qr-cards.pdf";

  if (!fs.existsSync(linksFile)) {
    console.error(`Error: links file "${linksFile}" not found.`);
    console.log(
      "Usage: node cli/generate.js <links.txt> [output.pdf] [--gridCols N --gridRows N --paperSize A4|LETTER|A3 --urlDisplayStyle truncated|full|hidden --eventName NAME --eventDate DATE]",
    );
    process.exit(1);
  }

  const linksText = fs.readFileSync(linksFile, "utf-8");
  const gridCols = Number(getFlag("gridCols") ?? "3");
  const gridRows = Number(getFlag("gridRows") ?? "3");
  const paperSize = (getFlag("paperSize") ?? "A4") as "A4" | "LETTER" | "A3";
  const urlDisplayStyle = getFlag("urlDisplayStyle") as UrlDisplayStyle | undefined;
  const eventName = getFlag("eventName");
  const eventDate = getFlag("eventDate");

  const outDir = path.dirname(outputFile);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const { pdfBuffer, stats, effectiveConfig } = await generateQRCodePDF({
    linksText,
    config: {
      gridCols,
      gridRows,
      paperSize,
      urlDisplayStyle,
      eventName,
      eventDate,
    },
    onProgress: (percent) => {
      process.stdout.write(`\rGenerating... ${percent}%`);
    },
  });

  fs.writeFileSync(outputFile, pdfBuffer);
  process.stdout.write("\n");
  console.log(`Saved: ${outputFile}`);
  console.log(
    `Cards: ${stats.totalCodes} | Pages: ${stats.totalPages} | Grid: ${effectiveConfig.gridCols}x${effectiveConfig.gridRows} | Paper: ${effectiveConfig.paperSize}`,
  );
}

run().catch((error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
