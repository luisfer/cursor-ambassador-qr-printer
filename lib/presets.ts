export type UrlDisplayStyle = "truncated" | "full" | "hidden";
export type PaperSize = "A4" | "LETTER" | "A3";

export interface GeneratorConfig {
  startNumber: number;
  labelPrefix: string;
  labelFontSize: number;
  urlDisplayStyle: UrlDisplayStyle;
  qrWidthRatio: number;
  qrHeightRatio: number;
  cardTopPadding: number;
  logoSpacing: number;
  numberSpacing: number;
  gridCols: number;
  gridRows: number;
  paperSize: PaperSize;
  eventName?: string;
  eventDate?: string;
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  startNumber: 1,
  labelPrefix: "#",
  labelFontSize: 14,
  urlDisplayStyle: "truncated",
  qrWidthRatio: 0.65,
  qrHeightRatio: 0.55,
  cardTopPadding: 15,
  logoSpacing: 8,
  numberSpacing: 8,
  gridCols: 3,
  gridRows: 3,
  paperSize: "A4",
  eventName: "",
  eventDate: "",
};

export function resolveConfig(
  raw: Partial<GeneratorConfig> = {},
): GeneratorConfig {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    gridCols: Math.max(1, raw.gridCols ?? DEFAULT_CONFIG.gridCols),
    gridRows: Math.max(1, raw.gridRows ?? DEFAULT_CONFIG.gridRows),
  };
}

export function formatCardLabel(codeNumber: string, config: GeneratorConfig): string {
  return `${config.labelPrefix}${codeNumber}`;
}
