import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";

interface Attendee {
  number: number;
  name: string;
  email: string;
}

function parseCSV(text: string): Attendee[] {
  const lines = text.split("\n");
  const header = lines[0].split(",").map((h) => h.trim());

  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const createdIdx = header.indexOf("created_at");
  const statusIdx = header.indexOf("approval_status");

  const rows: Array<{ name: string; email: string; created_at: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with quoted fields
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    const status = fields[statusIdx] ?? "";
    if (status !== "approved") continue;

    rows.push({
      name: fields[nameIdx] ?? "",
      email: fields[emailIdx] ?? "",
      created_at: fields[createdIdx] ?? "",
    });
  }

  // Sort by registration time (earliest first)
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at));

  return rows.map((r, i) => ({
    number: i + 1,
    name: r.name,
    email: r.email,
  }));
}

async function run(): Promise<void> {
  const csvFile = process.argv[2];
  const outputFile = process.argv[3] ?? "dist/attendees.pdf";

  if (!csvFile || !fs.existsSync(csvFile)) {
    console.error(`Usage: node cli/generate-attendees.js <guests.csv> [output.pdf]`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvFile, "utf-8");
  const attendees = parseCSV(csvText);
  console.log(`Found ${attendees.length} approved attendees`);

  // Load logo
  const logoPath = path.join(process.cwd(), "public", "cursor-logo.png");
  let logoBuffer: Buffer | null = null;
  let logoAspect = 1;
  if (fs.existsSync(logoPath)) {
    const image = sharp(logoPath);
    const meta = await image.metadata();
    logoBuffer = await image.resize(200, null, { fit: "contain" }).png().toBuffer();
    logoAspect = (meta.width ?? 1) / (meta.height ?? 1);
  }

  // Load CursorGothic fonts
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const fontRegularPath = path.join(fontsDir, "CursorGothic-Regular.otf");
  const fontBoldPath = path.join(fontsDir, "CursorGothic-Bold.otf");

  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
  });

  if (fs.existsSync(fontRegularPath) && fs.existsSync(fontBoldPath)) {
    doc.registerFont("CursorGothic", fontRegularPath);
    doc.registerFont("CursorGothic-Bold", fontBoldPath);
  }

  const fontR = fs.existsSync(fontRegularPath) ? "CursorGothic" : "Helvetica";
  const fontB = fs.existsSync(fontBoldPath) ? "CursorGothic-Bold" : "Helvetica-Bold";

  const outDir = path.dirname(outputFile);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  // Colors — Cursor palette on white
  const textPrimary = "#1a1914";
  const textSecondary = "#6b6961";
  const textMuted = "#9e9b92";
  const lineColor = "#e8e6e1";
  const headerBg = "#1a1914";
  const headerText = "#f7f7f4";
  const accentLine = "#1a1914";

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const marginL = 30;
  const marginR = 30;
  const marginT = 30;
  const contentW = pageW - marginL - marginR;
  const gutter = 16;
  const halfW = (contentW - gutter) / 2;

  const rowH = 15;
  const headerRowH = 18;

  // Per-half column layout helper
  function colLayout(baseX: number, w: number) {
    const numW = 28;
    const creditW = 42;
    const nameW = (w - numW - creditW) * 0.52;
    const emailW = w - numW - nameW - creditW;
    return {
      num: { x: baseX, w: numW },
      name: { x: baseX + numW, w: nameW },
      email: { x: baseX + numW + nameW, w: emailW },
      credit: { x: baseX + numW + nameW + emailW, w: creditW },
    };
  }

  const colLeft = colLayout(marginL, halfW);
  const colRight = colLayout(marginL + halfW + gutter, halfW);

  function drawHeader(startY: number): number {
    let y = startY;

    // Logo + title on same line
    if (logoBuffer) {
      const logoW = 90;
      const logoH = logoW / logoAspect;
      doc.image(logoBuffer, marginL, y, { width: logoW, height: logoH });

      doc
        .font(fontB)
        .fontSize(14)
        .fillColor(textPrimary)
        .text("Cursor Sunday Bangkok", marginL + logoW + 10, y + 2, { width: contentW - logoW - 10 });

      doc
        .font(fontR)
        .fontSize(8)
        .fillColor(textSecondary)
        .text(`29.03.2026  ·  ${attendees.length} attendees`, marginL + logoW + 10, y + 18, { width: contentW - logoW - 10 });

      y += logoH + 6;
    } else {
      doc
        .font(fontB)
        .fontSize(14)
        .fillColor(textPrimary)
        .text("Cursor Sunday Bangkok", marginL, y, { width: contentW });
      y += 20;
      doc
        .font(fontR)
        .fontSize(8)
        .fillColor(textSecondary)
        .text(`29.03.2026  ·  ${attendees.length} attendees`, marginL, y, { width: contentW });
      y += 14;
    }

    // Accent line
    doc
      .strokeColor(accentLine)
      .lineWidth(1.5)
      .moveTo(marginL, y)
      .lineTo(marginL + contentW, y)
      .stroke();
    y += 8;

    return y;
  }

  function drawTableHeader(y: number, cols: ReturnType<typeof colLayout>, w: number): number {
    doc.rect(cols.num.x, y, w, headerRowH).fill(headerBg);

    const textY = y + 5;
    doc.font(fontB).fontSize(6).fillColor(headerText);
    doc.text("#", cols.num.x + 4, textY, { width: cols.num.w - 4 });
    doc.text("NAME", cols.name.x + 4, textY, { width: cols.name.w - 4 });
    doc.text("EMAIL", cols.email.x + 4, textY, { width: cols.email.w - 4 });
    doc.text("CR#", cols.credit.x + 3, textY, { width: cols.credit.w - 3 });

    return y + headerRowH;
  }

  function drawRow(attendee: Attendee, y: number, even: boolean, cols: ReturnType<typeof colLayout>, w: number): number {
    if (even) {
      doc.rect(cols.num.x, y, w, rowH).fill("#fafaf8");
    }

    const textY = y + 4;

    doc.font(fontB).fontSize(6.5).fillColor(textMuted)
      .text(String(attendee.number).padStart(3, "0"), cols.num.x + 4, textY, { width: cols.num.w - 4 });

    doc.font(fontB).fontSize(6.5).fillColor(textPrimary)
      .text(attendee.name, cols.name.x + 4, textY, { width: cols.name.w - 6, ellipsis: true });

    doc.font(fontR).fontSize(6).fillColor(textSecondary)
      .text(attendee.email, cols.email.x + 4, textY, { width: cols.email.w - 6, ellipsis: true });

    // Credit dotted line
    doc.strokeColor(lineColor).lineWidth(0.4).dash(2, { space: 2 })
      .moveTo(cols.credit.x + 4, y + rowH - 3)
      .lineTo(cols.credit.x + cols.credit.w - 3, y + rowH - 3)
      .stroke().undash();

    // Row separator
    doc.strokeColor(lineColor).lineWidth(0.2)
      .moveTo(cols.num.x, y + rowH)
      .lineTo(cols.num.x + w, y + rowH)
      .stroke();

    return y + rowH;
  }

  // --- Render pages (two-column layout) ---
  const maxY = pageH - 35;

  // Calculate rows per column on first page vs continuation pages
  let y = drawHeader(marginT);
  const firstPageStartY = y;

  // Draw both table headers on first page
  drawTableHeader(firstPageStartY, colLeft, halfW);
  drawTableHeader(firstPageStartY, colRight, halfW);
  let leftY = firstPageStartY + headerRowH;
  let rightY = firstPageStartY + headerRowH;

  const rowsPerFirstCol = Math.floor((maxY - firstPageStartY - headerRowH) / rowH);
  const rowsPerContCol = Math.floor((maxY - marginT - headerRowH) / rowH);

  // Split attendees into left column, then right column per page
  let idx = 0;
  let isFirstPage = true;

  while (idx < attendees.length) {
    const rowsPerCol = isFirstPage ? rowsPerFirstCol : rowsPerContCol;
    const startY = isFirstPage ? firstPageStartY + headerRowH : marginT + headerRowH;

    if (!isFirstPage) {
      doc.addPage();
      drawTableHeader(marginT, colLeft, halfW);
      drawTableHeader(marginT, colRight, halfW);
    }

    // Left column
    let rowY = startY;
    for (let r = 0; r < rowsPerCol && idx < attendees.length; r++, idx++) {
      drawRow(attendees[idx], rowY, idx % 2 === 0, colLeft, halfW);
      rowY += rowH;
    }

    // Right column
    rowY = startY;
    for (let r = 0; r < rowsPerCol && idx < attendees.length; r++, idx++) {
      drawRow(attendees[idx], rowY, idx % 2 === 0, colRight, halfW);
      rowY += rowH;
    }

    isFirstPage = false;
  }

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  fs.writeFileSync(outputFile, pdfBuffer);
  console.log(`Saved: ${outputFile}`);
  console.log(`Pages: ${doc.bufferedPageRange().count}`);
}

run().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
