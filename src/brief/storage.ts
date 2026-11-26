import type { Answers, BriefSubmission } from "./types";

const DRAFT_KEY = "lp_brief_draft_v1";
const LIBRARY_KEY = "lp_agency_briefs_v1";

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

export function loadDraft(): BriefSubmission | null {
  return safe(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as BriefSubmission) : null;
  }, null);
}

export function saveDraft(s: BriefSubmission) {
  safe(() => localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...s, updatedAt: new Date().toISOString() })), undefined);
}

export function clearDraft() {
  safe(() => localStorage.removeItem(DRAFT_KEY), undefined);
}

export function emptySubmission(answers: Answers = {}): BriefSubmission {
  const now = new Date().toISOString();
  return { id: newId(), version: 1, createdAt: now, updatedAt: now, answers };
}

// --- Biblioteca de briefs del panel de agencia (en este navegador) ---
export function loadLibrary(): BriefSubmission[] {
  return safe(() => JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]") as BriefSubmission[], []);
}

export function saveToLibrary(s: BriefSubmission) {
  const lib = loadLibrary().filter((x) => x.id !== s.id);
  lib.unshift(s);
  safe(() => localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)), undefined);
}

export function removeFromLibrary(id: string) {
  safe(() => localStorage.setItem(LIBRARY_KEY, JSON.stringify(loadLibrary().filter((x) => x.id !== id))), undefined);
}

export function downloadJson(s: BriefSubmission) {
  const name = String(s.answers.empresa_nombre || "brief").replace(/[^\w-]+/g, "_");
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brief_${name}_${s.createdAt.slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseSubmission(text: string): BriefSubmission {
  const data = JSON.parse(text);
  if (!data || typeof data !== "object" || typeof data.answers !== "object") throw new Error("El archivo no es un brief válido.");
  return { ...emptySubmission(), ...data };
}
