import { put } from "@vercel/blob";

const MAX_BODY = 400_000;

/**
 * POST /api/submit
 * Recibe el brief completado por el cliente y:
 *  1. Lo guarda de forma privada en Vercel Blob (si BLOB_READ_WRITE_TOKEN está configurado).
 *     El panel de la agencia lo lee desde ahí con /api/briefs.
 *  2. Lo reenvía a BRIEF_WEBHOOK_URL (Make, Zapier, n8n...) si está configurada, para recibir un aviso.
 * Responde 200 si quedó guardado o reenviado; si no, 503 para que el navegador lo reintente.
 */
export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ ok: false, error: "too_large" }, { status: 413 });
  let data: { id?: unknown; answers?: Record<string, unknown> };
  try {
    data = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!data.answers || typeof data.answers !== "object" || !data.answers.empresa_nombre) {
    return Response.json({ ok: false, error: "missing_answers" }, { status: 400 });
  }

  const id = typeof data.id === "string" && /^[\w-]{6,64}$/.test(data.id) ? data.id : crypto.randomUUID();
  const record = { ...data, id, receivedAt: new Date().toISOString() };
  let stored = false;
  let forwarded = false;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // Mismo id => misma ruta: un reintento del navegador no duplica el brief.
      await put(`briefs/${id}.json`, JSON.stringify(record), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      stored = true;
    } catch (err) {
      console.error("No se pudo guardar el brief en Blob", err);
    }
  }

  const webhook = process.env.BRIEF_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "brief.submitted", brief: record }),
      });
      forwarded = res.ok;
      if (!res.ok) console.error("Webhook respondió", res.status);
    } catch (err) {
      console.error("Webhook falló", err);
    }
  }

  if (!stored && !forwarded) return Response.json({ ok: false, error: "not_saved" }, { status: 503 });
  return Response.json({ ok: true, stored, forwarded });
}
