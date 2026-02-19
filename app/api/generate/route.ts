import { generateQRCodePDF } from "@/lib/generate-pdf";
import type { GeneratorConfig } from "@/lib/presets";

export async function POST(req: Request): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const rawConfig = formData.get("config");

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Missing file in request." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const linksText = await file.text();
    let config: Partial<GeneratorConfig> = {};
    if (typeof rawConfig === "string") {
      try {
        config = JSON.parse(rawConfig);
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid config JSON." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const { pdfBuffer } = await generateQRCodePDF({
      linksText,
      config,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="qr-cards.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed.";
    const isClientError =
      message.includes("No URLs found") ||
      message.includes("Content-Type") ||
      message.includes("multipart");
    const friendly = isClientError && message.includes("Content-Type")
      ? "Request must be multipart/form-data with a file field."
      : message;
    return new Response(JSON.stringify({ error: friendly }), {
      status: isClientError ? 400 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
