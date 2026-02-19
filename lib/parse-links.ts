const URL_RE = /https?:\/\/[^\s,]+/;

export function parseLinksFromText(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const urls: string[] = [];
  for (const line of lines) {
    const match = line.match(URL_RE);
    if (match) {
      urls.push(match[0]);
    }
  }

  return urls;
}

export function truncateURL(url: string): string {
  try {
    if (url.includes("cursor.com/referral")) {
      const match = url.match(/code=([^&]+)/);
      if (match) {
        const codePreview = match[1].substring(0, 4);
        return `cursor.com/referral?code=${codePreview}...`;
      }
    }
    const parsed = new URL(url);
    const compact = `${parsed.hostname}${parsed.pathname}`;
    return compact.length > 40 ? `${compact.substring(0, 37)}...` : compact;
  } catch {
    return url.length > 40 ? `${url.substring(0, 37)}...` : url;
  }
}

export function splitURL(url: string): { line1: string; line2: string } {
  try {
    if (url.includes("cursor.com/referral")) {
      const match = url.match(/code=([^&]+)/);
      if (match) {
        return {
          line1: "cursor.com/referral?code=",
          line2: match[1],
        };
      }
    }
    return { line1: url, line2: "" };
  } catch {
    return { line1: url, line2: "" };
  }
}
