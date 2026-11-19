import { createServerFn } from "@tanstack/react-start";
import {
  analyzeRules,
  mergeAnalysis,
  redactSensitive,
  type Analysis,
} from "./engine";

type AskInput = {
  text?: string;
  imageDataUrl?: string;
};

type AskResult =
  | { ok: true; analysis: Analysis; extracted: string }
  | { ok: false; error: string };

const MAX_IMAGE = 1_800_000;

function asAnalysis(value: unknown): Partial<Analysis> | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const verdict = row.verdict;
  if (verdict !== "podvod" && verdict !== "podozrive" && verdict !== "v-poriadku") return null;
  const list = (input: unknown) =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
  return {
    score: typeof row.score === "number" ? row.score : Number(row.score),
    verdict,
    type: typeof row.type === "string" ? row.type : "",
    reasons: list(row.reasons),
    steps: list(row.steps),
    compromised: list(row.compromised),
  };
}

function parseModelJson(raw: string): { analysis: Partial<Analysis> | null; extracted: string } {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return { analysis: null, extracted: "" };
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return {
      analysis: asAnalysis(json),
      extracted: typeof json.extracted === "string" ? json.extracted : "",
    };
  } catch {
    return { analysis: null, extracted: "" };
  }
}

async function callModel(apiKey: string, text: string, imageDataUrl?: string): Promise<string> {
  const instruction = [
    "Si Štít, slovenský kontrolór podvodných správ pre bežných ľudí a seniorov.",
    "Posúď jednu správu. Pri neistote daj verdikt podozrive, nie v-poriadku.",
    "Falošná doména, žiadosť o heslo, PIN, kód, kartu alebo peniaze je podvod.",
    "Oficiálna zásielková správa bez platby a bez cudzej domény môže byť v poriadku.",
    "Odpovedaj LEN JSON bez markdownu:",
    '{"score":0,"verdict":"podvod","type":"krátky typ","reasons":["","",""],"steps":["","",""],"compromised":["",""],"extracted":"text z obrázka alebo prázdne"}',
    "score 0-100. verdict len: podvod, podozrive, v-poriadku.",
    "reasons presne 3, steps presne 3. Jednoduchá slovenčina, tykanie, krátke vety.",
    "compromised: čo robiť, ak už klikol alebo zadal údaje. Pri v-poriadku prázdne pole.",
  ].join("\n");

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: `${instruction}\n\nSpráva:\n${text || "(text je len na obrázku)"}` },
  ];
  if (imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(18_000),
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 700,
      messages: [{ role: "user", content: content.length === 1 ? content[0]?.text : content }],
    }),
  });
  if (!response.ok) throw new Error(`ai-${response.status}`);
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return body.choices?.[0]?.message?.content ?? "";
}

export const checkMessage = createServerFn({ method: "POST" })
  .validator((input: AskInput) => {
    const text = typeof input?.text === "string" ? input.text.slice(0, 8000) : "";
    const imageDataUrl =
      typeof input?.imageDataUrl === "string" && input.imageDataUrl.startsWith("data:image/")
        ? input.imageDataUrl
        : "";
    if (!text.trim() && !imageDataUrl) throw new Error("Chýba správa.");
    if (imageDataUrl.length > MAX_IMAGE) throw new Error("Obrázok je príliš veľký.");
    return { text, imageDataUrl };
  })
  .handler(async ({ data }): Promise<AskResult> => {
    const redacted = redactSensitive(data.text);
    const note = redacted.notes.length ? ` Citlivé údaje sú skryté (${redacted.notes.join(", ")}).` : "";
    const rules = analyzeRules(redacted.text || data.text);

    if (data.imageDataUrl && !process.env.XAI_API_KEY) {
      return {
        ok: false,
        error: "Obrázok viem prečítať len cez AI a tá teraz nie je dostupná. Prepíš text zo screenshotu.",
      };
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: true, analysis: rules, extracted: redacted.text };

    try {
      const raw = await callModel(apiKey, `${redacted.text}${note}`, data.imageDataUrl || undefined);
      const parsed = parseModelJson(raw);
      const extracted = redactSensitive(parsed.extracted || redacted.text).text;
      const base = extracted.trim() ? analyzeRules(extracted) : rules;
      return { ok: true, analysis: mergeAnalysis(base, parsed.analysis), extracted };
    } catch {
      if (data.imageDataUrl && !redacted.text.trim()) {
        return {
          ok: false,
          error: "Obrázok sa nepodarilo prečítať. Skús ostrejší screenshot alebo vlož text.",
        };
      }
      return { ok: true, analysis: rules, extracted: redacted.text };
    }
  });
