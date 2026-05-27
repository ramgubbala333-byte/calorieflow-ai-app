/**
 * Food + AI API surface.
 *
 * Real integrations:
 *   - Barcode lookup: Open Food Facts (no key required)
 *   - Food search: Open Food Facts /cgi/search.pl (no key required)
 *
 * AI features (vision / voice) run through `createServerFn` server functions
 * backed by Lovable AI Gateway (`process.env.LOVABLE_API_KEY`). They are
 * called via `useServerFn` in components — never embed the key on the client.
 */

export type SearchFood = {
  name: string;
  serving: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  brand?: string;
  barcode?: string;
};

// ---------- Open Food Facts ----------

const OFF_BASE = "https://world.openfoodfacts.org";

type OFFProduct = {
  product_name?: string;
  brands?: string;
  code?: string;
  serving_size?: string;
  nutriments?: {
    "energy-kcal_serving"?: number;
    "energy-kcal_100g"?: number;
    proteins_serving?: number;
    proteins_100g?: number;
    carbohydrates_serving?: number;
    carbohydrates_100g?: number;
    fat_serving?: number;
    fat_100g?: number;
  };
};

function mapOFF(p: OFFProduct): SearchFood {
  const n = p.nutriments ?? {};
  const useServing = n["energy-kcal_serving"] != null;
  return {
    name: p.product_name?.trim() || "Unnamed product",
    brand: p.brands?.split(",")[0]?.trim(),
    barcode: p.code,
    serving: p.serving_size?.trim() || (useServing ? "1 serving" : "100 g"),
    kcal: Math.round(useServing ? n["energy-kcal_serving"]! : (n["energy-kcal_100g"] ?? 0)),
    p: Number((useServing ? n.proteins_serving ?? 0 : n.proteins_100g ?? 0).toFixed(1)),
    c: Number((useServing ? n.carbohydrates_serving ?? 0 : n.carbohydrates_100g ?? 0).toFixed(1)),
    f: Number((useServing ? n.fat_serving ?? 0 : n.fat_100g ?? 0).toFixed(1)),
  };
}

export async function searchFoods(q: string): Promise<SearchFood[]> {
  const query = q.trim();
  if (!query) return [];
  try {
    const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OFF search ${res.status}`);
    const data = (await res.json()) as { products?: OFFProduct[] };
    return (data.products ?? []).filter((p) => p.product_name && p.nutriments?.["energy-kcal_100g"]).map(mapOFF);
  } catch (e) {
    console.error("[api.searchFoods]", e);
    throw new Error("Search failed. Check your connection and try again.");
  }
}

export async function lookupBarcode(code: string): Promise<SearchFood> {
  try {
    const res = await fetch(`${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json`);
    if (!res.ok) throw new Error(`OFF barcode ${res.status}`);
    const data = (await res.json()) as { status?: number; product?: OFFProduct };
    if (data.status !== 1 || !data.product) throw new Error("Product not found");
    return mapOFF(data.product);
  } catch (e) {
    console.error("[api.lookupBarcode]", e);
    throw e instanceof Error ? e : new Error("Lookup failed");
  }
}

// ---------- AI (calls server functions; see src/lib/ai.functions.ts) ----------

import { analyzeFoodImage as _analyzeFoodImage, transcribeVoice as _transcribeVoice } from "./ai.functions";

export async function analyzeFoodImage(imageDataUrl?: string): Promise<{ items: SearchFood[]; confidence: number }> {
  const data = await _analyzeFoodImage({ data: { imageDataUrl: imageDataUrl ?? "" } });
  return { items: data.items, confidence: data.confidence };
}

export async function transcribeVoice(audioBase64?: string): Promise<{ transcript: string; items: SearchFood[] }> {
  const data = await _transcribeVoice({ data: { audioBase64: audioBase64 ?? "" } });
  return { transcript: data.transcript, items: data.items };
}
