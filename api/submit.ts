const MAX_BODY = 400_000;

/**
 * POST /api/submit
 * Recibe el brief completado por el cliente. Si BRIEF_WEBHOOK_URL está definida, lo reenvía
 * (Make, Zapier, n8n, Google Apps Script, Slack...) para que la agencia lo reciba por email,
 * en una hoja de cálculo o en su CRM.
 */
export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ ok: false, error: "too_large" }, { status: 413 });
  let data: { answers?: Record<string, unknown> };
  try {
    data = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!data.answers || typeof data.answers !== "object" || !data.answers.empresa_nombre) {
    return Response.json({ ok: false, error: "missing_answers" }, { status: 400 });
  }

  const webhook = process.env.BRIEF_WEBHOOK_URL;
  if (!webhook) {
    console.log("Brief recibido (sin webhook configurado):", data.answers.empresa_nombre);
    return Response.json({ ok: true, forwarded: false });
  }
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "brief.submitted", receivedAt: new Date().toISOString(), brief: data }),
  });
  if (!res.ok) {
    console.error("Webhook respondió", res.status);
    return Response.json({ ok: false, error: "webhook_failed" }, { status: 502 });
  }
  return Response.json({ ok: true, forwarded: true });
}
