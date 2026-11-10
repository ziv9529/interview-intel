export const CAPTURE_KINDS = ["text", "url", "image"] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

/** A Capture before it is saved: raw material exactly as received. */
export type NewCapture = {
  kind: CaptureKind;
  rawText: string | null;
  sourceUrl: string | null;
  contentHash: string;
};

/** Turns an incoming text message into a Capture. A message that is only a link becomes a url Capture. */
export async function captureFromText(text: string): Promise<NewCapture> {
  const trimmed = text.trim();
  const url = asUrl(trimmed);
  return url
    ? { kind: "url", rawText: null, sourceUrl: url, contentHash: await sha256(url) }
    : { kind: "text", rawText: text, sourceUrl: null, contentHash: await sha256(trimmed.normalize("NFC")) };
}

function asUrl(text: string): string | null {
  if (/\s/.test(text) || !/^https?:\/\//i.test(text)) return null;
  try {
    return new URL(text).toString();
  } catch {
    return null;
  }
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
