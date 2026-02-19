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
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  const pageWidth = doc.page.width - 40;
  const pageHeight = doc.page.height - 40;
  const cardWidth = (pageWidth - 20) / config.gridCols;
  const cardHeight = (pageHeight - 20) / config.gridRows;
  const cardSpacing = 10;
  const qrSize = Math.min(
    cardWidth * config.qrWidthRatio,
    cardHeight * config.qrHeightRatio,
  );
  const cardsPerPage = config.gridCols * config.gridRows;

  let currentPage = 0;
  let qrIndex = 0;

  while (qrIndex < qrCodes.length) {
    if (currentPage > 0) {
      doc.addPage();
    }

    doc.strokeColor("#CCCCCC");
    doc.lineWidth(0.5);
    doc.dash(3, { space: 3 });

    for (let col = 1; col < config.gridCols; col++) {
      const x = 20 + col * cardWidth;
      doc.moveTo(x, 20).lineTo(x, pageHeight + 20).stroke();
    }

    for (let row = 1; row < config.gridRows; row++) {
      const y = 20 + row * cardHeight;
      doc.moveTo(20, y).lineTo(pageWidth + 20, y).stroke();
    }

    doc.undash();

    for (let row = 0; row < config.gridRows && qrIndex < qrCodes.length; row++) {
      for (let col = 0; col < config.gridCols && qrIndex < qrCodes.length; col++) {
        const qrCode = qrCodes[qrIndex];
        const cardX = 20 + col * cardWidth + cardSpacing / 2;
        const cardY = 20 + row * cardHeight + cardSpacing / 2;
        const cardContentWidth = cardWidth - cardSpacing;
        const cardContentHeight = cardHeight - cardSpacing;

        doc.strokeColor("#F0F0F0");
        doc.lineWidth(0.5);
        doc.rect(cardX, cardY, cardContentWidth, cardContentHeight).stroke();

        let currentY = cardY + config.cardTopPadding;

        if (config.eventName) {
          doc.fontSize(8).fillColor("#333333").text(config.eventName, cardX, currentY, {
            width: cardContentWidth,
            align: "center",
          });
          currentY += 10;
        }

        if (config.eventDate) {
          doc.fontSize(7).fillColor("#666666").text(config.eventDate, cardX, currentY, {
            width: cardContentWidth,
            align: "center",
          });
          currentY += 9;
        }

        if (logoResult.buffer && logoResult.width > 0 && logoResult.height > 0) {
          const logoWidth = Math.min(100, cardContentWidth * 0.82);
          const logoHeight = logoWidth / (logoResult.width / logoResult.height);
          const logoX = cardX + (cardContentWidth - logoWidth) / 2;
          doc.image(logoResult.buffer, logoX, currentY, {
            width: logoWidth,
            height: logoHeight,
          });
          currentY += logoHeight + config.logoSpacing;
        } else {
          currentY += 5;
        }

        const qrX = cardX + (cardContentWidth - qrSize) / 2;
        const qrY = currentY;
        const base64Data = qrCode.dataURL.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        doc.image(imageBuffer, qrX, qrY, { width: qrSize, height: qrSize });

        const numberY = qrY + qrSize + config.numberSpacing;
        doc.fontSize(config.labelFontSize).fillColor("#000000").text(
          formatCardLabel(qrCode.codeNumber, config),
          cardX,
          numberY,
          { width: cardContentWidth, align: "center" },
        );

        if (config.urlDisplayStyle === "full") {
          const split = splitURL(qrCode.url);
          const urlLine1Y = numberY + 16;
          doc.fontSize(7.5).fillColor("#444444").text(split.line1, cardX, urlLine1Y, {
            width: cardContentWidth,
            align: "center",
          });
          if (split.line2) {
            const urlLine2Y = urlLine1Y + 10;
            doc
              .fontSize(8.5)
              .fillColor("#000000")
              .font("Helvetica-Bold")
              .text(split.line2, cardX, urlLine2Y, {
                width: cardContentWidth,
                align: "center",
              });
            doc.font("Helvetica");
          }
        } else if (config.urlDisplayStyle === "truncated") {
          const urlY = numberY + 18;
          doc.fontSize(7).fillColor("#666666").text(truncateURL(qrCode.url), cardX, urlY, {
            width: cardContentWidth,
            align: "center",
            lineGap: 2,
          });
        }

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
