import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserMessage } from "./_lib/prompt.js";

export const config = { maxDuration: 300 };

const MAX_BODY = 400_000;

/**
 * POST /api/strategy
 * Body: { answers, strategy }. Devuelve la propuesta en Markdown como texto en streaming.
 * Requiere ANTHROPIC_API_KEY. Si AGENCY_ACCESS_KEY está definida, exige el header x-agency-key.
 */
export async function POST(request: Request): Promise<Response> {
  const required = process.env.AGENCY_ACCESS_KEY;
  if (required && request.headers.get("x-agency-key") !== required) {
    return new Response("Clave de agencia incorrecta.", { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("Falta configurar ANTHROPIC_API_KEY en el servidor.", { status: 500 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response("El brief es demasiado grande.", { status: 413 });
  let body: { answers?: unknown; strategy?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }
  if (!body.answers || typeof body.answers !== "object") return new Response("Falta el brief.", { status: 400 });

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 32000,
    output_config: { effort: "high" },
    // Si el modelo declina la solicitud, la API la reintenta con el modelo de respaldo recomendado.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(body.answers, body.strategy) }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n> No fue posible generar la propuesta para este brief. Revisa el contenido e inténtalo de nuevo."));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n> La propuesta se cortó por longitud. Vuelve a generarla o pide secciones específicas."));
        }
      } catch (err) {
        const msg =
          err instanceof Anthropic.AuthenticationError
            ? "La clave de Anthropic no es válida."
            : err instanceof Anthropic.RateLimitError
              ? "Límite de uso alcanzado; intenta en unos minutos."
              : err instanceof Anthropic.APIError
                ? `Error de la API (${err.status}).`
                : "Error inesperado al generar la propuesta.";
        console.error("strategy error", err);
        controller.enqueue(encoder.encode(`\n\n> ${msg}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" },
  });
}
