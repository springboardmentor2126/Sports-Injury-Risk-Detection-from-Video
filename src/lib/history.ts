import type { AnalysisResult } from "./analyze.functions";

export type SavedAnalysis = {
  id: string;
  label: string;
  sport: string;
  fileName: string;
  createdAt: number;
  thumbnail: string; // data URL of first frame
  durationSec: number;
  frameTimes: number[];
  result: AnalysisResult;
};

const KEY = "kinetiq.history.v1";
const MAX_ITEMS = 12;
// localStorage hard caps at ~5MB; keep stored payload small.
const MAX_THUMB_BYTES = 120_000;

export function loadHistory(): SavedAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedAnalysis[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(entry: SavedAnalysis) {
  const safe = {
    ...entry,
    thumbnail: entry.thumbnail.length > MAX_THUMB_BYTES ? "" : entry.thumbnail,
  };
  const prev = loadHistory();
  const next = [safe, ...prev].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota exceeded — try without thumbnails
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(next.map((n) => ({ ...n, thumbnail: "" }))),
      );
    } catch {
      /* give up */
    }
  }
  return next;
}

export function deleteAnalysis(id: string) {
  const next = loadHistory().filter((h) => h.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export async function shrinkDataUrl(
  src: string,
  maxWidth = 240,
  quality = 0.6,
): Promise<string> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(img.width, maxWidth);
      const h = Math.round((img.height / img.width) * w);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(src);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
