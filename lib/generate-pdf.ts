import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { parseLinksFromText, splitURL, truncateURL } from "@/lib/parse-links";
import {
  formatCardLabel,
  GeneratorConfig,
  resolveConfig,
} from "@/lib/presets";

export interface GenerationStats {
  totalCodes: number;
  totalPages: number;
  cardsPerPage: number;
}

export interface GenerateInput {
  linksText: string;
  config?: Partial<GeneratorConfig>;
  onProgress?: (percent: number) => void;
  logoPath?: string;
}

export interface GenerateOutput {
  pdfBuffer: Buffer;
  stats: GenerationStats;
  effectiveConfig: GeneratorConfig;
}

async function loadLogoBuffer(logoPath: string): Promise<{
  buffer: Buffer | null;
  width: number;
  height: number;
}> {
  if (!fs.existsSync(logoPath)) {
    return { buffer: null, width: 0, height: 0 };
  }
  try {
    const image = sharp(logoPath);
    const metadata = await image.metadata();
    const logoBuffer = await image.resize(120, null, { fit: "contain" }).png().toBuffer();
    return {
      buffer: logoBuffer,
      width: metadata.width ?? 1,
      height: metadata.height ?? 1,
    };
  } catch {
    return { buffer: null, width: 0, height: 0 };
  }
}

function registerCursorFonts(doc: PDFKit.PDFDocument): boolean {
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const regularPath = path.join(fontsDir, "CursorGothic-Regular.otf");
  const boldPath = path.join(fontsDir, "CursorGothic-Bold.otf");

  if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
    doc.registerFont("CursorGothic", regularPath);
    doc.registerFont("CursorGothic-Bold", boldPath);
    return true;
  }
  return false;
}

export async function generateQRCodePDF({
  linksText,
  config: rawConfig,
  onProgress,
  logoPath,
}: GenerateInput): Promise<GenerateOutput> {
  const config = resolveConfig(rawConfig);
  const urls = parseLinksFromText(linksText);

  if (urls.length === 0) {
    throw new Error("No URLs found in uploaded file.");
  }

  const logoResult = await loadLogoBuffer(
    logoPath ?? path.join(process.cwd(), "public", "cursor-logo.png"),
  );

  const qrCodes: Array<{
    url: string;
    dataURL: string;
    codeNumber: string;
  }> = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    qrCodes.push({
      url,
      dataURL: qrDataURL,
      codeNumber: String(i + config.startNumber).padStart(3, "0"),
    });
    if (onProgress) {
      const scanProgress = Math.round(((i + 1) / urls.length) * 80);
      onProgress(scanProgress);
    }
  }

  const doc = new PDFDocument({
    size: config.paperSize,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const hasCursorFont = registerCursorFonts(doc);
  const fontRegular = hasCursorFont ? "CursorGothic" : "Helvetica";
  const fontBold = hasCursorFont ? "CursorGothic-Bold" : "Helvetica-Bold";

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const cardWidth = pageWidth / config.gridCols;
  const cardHeight = pageHeight / config.gridRows;
  const cardsPerPage = config.gridCols * config.gridRows;

  // Cursor-inspired colors (white bg friendly)
  const textPrimary = "#1a1914";
  const textSecondary = "#6b6961";
  const textMuted = "#8a877d";
  const cutLineColor = "#d4d2cc";

  let currentPage = 0;
  let qrIndex = 0;

  while (qrIndex < qrCodes.length) {
    if (currentPage > 0) {
      doc.addPage();
    }

    // Dashed cut lines (subtle, Cursor-warm gray)
    doc.strokeColor(cutLineColor);
    doc.lineWidth(0.5);
    doc.dash(4, { space: 4 });

    for (let col = 1; col < config.gridCols; col++) {
      const x = col * cardWidth;
      doc.moveTo(x, 0).lineTo(x, pageHeight).stroke();
    }

    for (let row = 1; row < config.gridRows; row++) {
      const y = row * cardHeight;
      doc.moveTo(0, y).lineTo(pageWidth, y).stroke();
    }

    doc.undash();

    for (let row = 0; row < config.gridRows && qrIndex < qrCodes.length; row++) {
      for (let col = 0; col < config.gridCols && qrIndex < qrCodes.length; col++) {
        const qrCode = qrCodes[qrIndex];
        const cardX = col * cardWidth;
        const cardY = row * cardHeight;

        const padX = 10;
        const contentWidth = cardWidth - padX * 2;

        // --- Measure all element heights first ---
        const eventNameH = config.eventName ? 12 : 0;
        const eventDateH = config.eventDate ? 10 : 0;

        let logoW = 0;
        let logoH = 0;
        if (logoResult.buffer && logoResult.width > 0 && logoResult.height > 0) {
          logoW = Math.min(80, contentWidth * 0.5);
          logoH = logoW / (logoResult.width / logoResult.height);
        }

        const qrSize = Math.min(
          contentWidth * config.qrWidthRatio,
          cardHeight * config.qrHeightRatio,
        );

        const labelH = config.labelFontSize + 2;

        const urlLine1H = config.urlDisplayStyle !== "hidden" ? 9 : 0;
        const urlLine2H =
          config.urlDisplayStyle === "full" &&
          qrCode.url.includes("cursor.com/referral")
            ? 10
            : 0;

        // Total content height and gap distribution
        const totalContentH =
          eventNameH + eventDateH + logoH + qrSize + labelH + urlLine1H + urlLine2H;

        // Count gaps between visible elements
        const elements = [
          eventNameH > 0,
          eventDateH > 0,
          logoH > 0,
          true, // QR always visible
          true, // label always visible
          urlLine1H > 0,
        ].filter(Boolean).length;
        const gapCount = elements - 1 + (urlLine2H > 0 ? 1 : 0);

        const availableSpace = cardHeight - totalContentH;
        const gap = Math.min(availableSpace / (gapCount + 2), 24);
        const topPad = (cardHeight - totalContentH - gap * gapCount) / 2;

        let currentY = cardY + topPad;

        // Event name
        if (config.eventName) {
          doc
            .font(fontBold)
            .fontSize(9)
            .fillColor(textPrimary)
            .text(config.eventName, cardX + padX, currentY, {
              width: contentWidth,
              align: "center",
            });
          currentY += eventNameH + gap;
        }

        // Event date
        if (config.eventDate) {
          doc
            .font(fontRegular)
            .fontSize(7)
            .fillColor(textSecondary)
            .text(config.eventDate, cardX + padX, currentY, {
              width: contentWidth,
              align: "center",
            });
          currentY += eventDateH + gap;
        }

        // Logo
        if (logoH > 0) {
          const logoX = cardX + (cardWidth - logoW) / 2;
          doc.image(logoResult.buffer!, logoX, currentY, {
            width: logoW,
            height: logoH,
          });
          currentY += logoH + gap;
        }

        // QR code
        const qrX = cardX + (cardWidth - qrSize) / 2;
        const base64Data = qrCode.dataURL.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        doc.image(imageBuffer, qrX, currentY, { width: qrSize, height: qrSize });
        currentY += qrSize + gap;

        // Card number label
        doc
          .font(fontBold)
          .fontSize(config.labelFontSize)
          .fillColor(textPrimary)
          .text(
            formatCardLabel(qrCode.codeNumber, config),
            cardX + padX,
            currentY,
            { width: contentWidth, align: "center" },
          );
        currentY += labelH + gap;

        // URL display
        if (config.urlDisplayStyle === "full") {
          const split = splitURL(qrCode.url);
          doc
            .font(fontRegular)
            .fontSize(6.5)
            .fillColor(textMuted)
            .text(split.line1, cardX + padX, currentY, {
              width: contentWidth,
              align: "center",
            });
          if (split.line2) {
            currentY += urlLine1H + (gap * 0.3);
            doc
              .font(fontBold)
              .fontSize(7.5)
              .fillColor(textPrimary)
              .text(split.line2, cardX + padX, currentY, {
                width: contentWidth,
                align: "center",
              });
          }
        } else if (config.urlDisplayStyle === "truncated") {
          doc
            .font(fontRegular)
            .fontSize(6.5)
            .fillColor(textMuted)
            .text(truncateURL(qrCode.url), cardX + padX, currentY, {
              width: contentWidth,
              align: "center",
            });
        }

        doc.font(fontRegular);
        qrIndex++;
      }
    }
    currentPage++;
    if (onProgress) {
      const pageProgress = Math.round((qrIndex / qrCodes.length) * 15);
      onProgress(Math.min(95, 80 + pageProgress));
    }
  }

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  onProgress?.(100);

  return {
    pdfBuffer,
    effectiveConfig: config,
    stats: {
      totalCodes: qrCodes.length,
      totalPages: currentPage,
      cardsPerPage,
    },
  };
}
