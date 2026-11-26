import { get, list } from "@vercel/blob";

/**
 * GET /api/briefs — lista los briefs recibidos (solo para la agencia).
 * Requiere AGENCY_ACCESS_KEY y el header x-agency-key.
 */
export async function GET(request: Request): Promise<Response> {
  const key = process.env.AGENCY_ACCESS_KEY;
  if (!key) return new Response("Configura AGENCY_ACCESS_KEY en el servidor para ver los briefs recibidos.", { status: 503 });
  if (request.headers.get("x-agency-key") !== key) return new Response("Clave de agencia incorrecta.", { status: 401 });
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) return new Response("El almacenamiento de briefs no está conectado.", { status: 503 });

  const blobs = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "briefs/", cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const recent = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)).slice(0, 200);
  const briefs = (
    await Promise.all(
      recent.map(async (b) => {
        try {
          const res = await get(b.pathname, { access: "private" });
          if (!res || res.statusCode !== 200) return null;
          return JSON.parse(await new Response(res.stream).text());
        } catch (err) {
          console.error("No se pudo leer", b.pathname, err);
          return null;
        }
      }),
    )
  ).filter(Boolean);

  return Response.json({ briefs }, { headers: { "Cache-Control": "no-store" } });
}
