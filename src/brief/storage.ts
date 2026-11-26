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

// --- Envío con reintentos: si falla, el brief queda en cola en el navegador y se reenvía solo ---
const PENDING_KEY = "lp_pending_briefs_v1";

const loadPending = (): BriefSubmission[] => safe(() => JSON.parse(localStorage.getItem(PENDING_KEY) || "[]") as BriefSubmission[], []);
const savePending = (list: BriefSubmission[]) => safe(() => localStorage.setItem(PENDING_KEY, JSON.stringify(list)), undefined);

async function postOnce(s: BriefSubmission): Promise<boolean> {
  try {
    const res = await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s), keepalive: true });
    return res.ok;
  } catch {
    return false;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envía el brief con hasta 3 intentos. Si no se logra, lo deja en cola para reenviarlo después. */
export async function submitBrief(s: BriefSubmission): Promise<boolean> {
  savePending([...loadPending().filter((x) => x.id !== s.id), s]);
  for (const delay of [0, 1500, 4000]) {
    if (delay) await wait(delay);
    if (await postOnce(s)) {
      savePending(loadPending().filter((x) => x.id !== s.id));
      return true;
    }
  }
  return false;
}

/** Reintenta en segundo plano los briefs que quedaron en cola (se llama al abrir la app). */
export async function flushPending() {
  for (const s of loadPending()) {
    if (await postOnce(s)) savePending(loadPending().filter((x) => x.id !== s.id));
  }
}
