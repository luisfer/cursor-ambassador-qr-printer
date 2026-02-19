# Cursor Ambassador QR Printer

![Banner](public/readme-banner.png)

Generate printable QR code cards for Cursor community events. Upload a list of referral links, configure the card layout, and export a print-ready PDF -- from a web UI or the command line.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project Structure

### App routes

- `app/page.tsx`: single-page web UI (file upload, config form, live preview, export).
- `app/api/generate/route.ts`: POST endpoint that accepts a links file + config JSON and returns a PDF.

### Components

- `components/FileUpload.tsx`: drag-and-drop upload zone. Parses the file client-side and reports link count.
- `components/ConfigForm.tsx`: event name, date, URL display style, preset, grid size, paper size, start number.
- `components/CardPreview.tsx`: live HTML preview of a single card, updates as config changes.
- `components/ExportButton.tsx`: triggers PDF generation with an animated progress bar and auto-download.

### Shared library (`lib/`)

The PDF generation core is shared between the web UI and the CLI.

- `lib/generate-pdf.ts`: main `generateQRCodePDF()` function. Accepts links text + config, returns a PDF buffer. Uses PDFKit, QRCode, and Sharp.
- `lib/parse-links.ts`: `parseLinksFromText()` extracts URLs from plain text or CSV. Also exports `truncateURL()` and `splitURL()` helpers.
- `lib/presets.ts`: `GeneratorConfig` type, `DEFAULT_CONFIG`, `resolveConfig()`, `formatCardLabel()`.

### CLI (`cli/`)

- `cli/generate.js`: Node entry point (runs `generate.ts` via tsx).
- `cli/generate.ts`: reads a links file from disk, calls `generateQRCodePDF()`, writes the PDF.

### Static assets (`public/`)

- `public/cursor-logo.png`: Cursor horizontal lockup embedded in each card.
- `public/fonts/CursorGothic-*.woff2`: CursorGothic font files for the web UI.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `eventName` | string | (empty) | Printed above the logo on each card |
| `eventDate` | string | (empty) | Printed below the event name |
| `urlDisplayStyle` | `truncated`, `full`, `hidden` | `truncated` | How the referral URL appears on the card |
| `startNumber` | number | `1` | First card number (`#001`, `#002`, ...) |
| `gridCols` | number | `3` | Columns per page |
| `gridRows` | number | `3` | Rows per page |
| `paperSize` | `A4`, `LETTER`, `A3` | `A4` | Output paper size |

## Input File Format

The parser scans each line for the first `http://` or `https://` URL. Everything else on the line is ignored -- headers, extra columns, codes, labels. Any line without a URL is silently skipped.

**Plain text** (`.txt`) -- one URL per line:

```
https://cursor.com/referral?code=XXXXX
https://cursor.com/referral?code=YYYYY
```

**CSV with Code,URL columns** -- the format Cursor provides:

```csv
Code,URL
ABC123DEF456,https://cursor.com/referral?code=ABC123DEF456
GHI789JKL012,https://cursor.com/referral?code=GHI789JKL012
```

**CSV with URL first** -- also works:

```csv
https://cursor.com/referral?code=XXXXX,Alice
https://cursor.com/referral?code=YYYYY,Bob
```

**Mixed / messy files** -- the parser extracts what it can:

```
Header row with no URL
ABC123DEF456,https://cursor.com/referral?code=ABC123DEF456
some random text
https://cursor.com/referral?code=YYYYY
```

Result: 2 URLs extracted, other lines ignored.

> Works with `.txt`, `.csv`, or any plain-text file. Windows line endings (CRLF) and UTF-8 BOM are handled automatically.

## CLI Usage

```bash
node cli/generate.js <links.txt> [output.pdf] \
  --gridCols 3 \
  --gridRows 3 \
  --paperSize A4 \
  --urlDisplayStyle truncated \
  --eventName "Cafe Cursor Bangkok" \
  --eventDate "2026-03-15"
```

Or via npm script:

```bash
npm run cli -- ./links.txt ./dist/qr-cards.pdf
```

## Tech Stack

- **Next.js 14** (App Router) for the web UI and API
- **React 18** + **TypeScript**
- **Tailwind CSS** with the Cursor dark theme palette
- **PDFKit** for PDF generation
- **qrcode** for QR code rendering
- **Sharp** for logo image processing

## Deployment

### Vercel

Push to GitHub and import in Vercel. Works with default Next.js settings.

### Other platforms

```bash
npm run build
npm run start
```

## Credits

Designed and implemented by [Luis Fernando Romero Calero](https://lfrc.me) and [Cursor](https://cursor.com).

Part of the [Cursor Ambassador](https://cursor.com/ambassador) open-source toolkit.

See also: [cursor-ambassador-evergreen](https://github.com/luisfer/cursor-ambassador-evergreen) -- reusable community website template.

## License

MIT
