import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * En desarrollo, ejecuta las funciones de /api (las mismas que usa Vercel en producción)
 * dentro del servidor de Vite, para que `npm run dev` funcione completo.
 */
function apiDevServer(): Plugin {
  return {
    name: "api-dev-server",
    configureServer(server: ViteDevServer) {
      Object.assign(process.env, loadEnv("development", process.cwd(), ""));
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const m = req.url?.match(/^\/api\/([a-z-]+)/);
        if (!m) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`);
          const handler = mod[req.method ?? "GET"];
          if (typeof handler !== "function") {
            res.statusCode = 405;
            return res.end("Method not allowed");
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: ["GET", "HEAD"].includes(req.method ?? "") ? undefined : Buffer.concat(chunks),
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) {
            const reader = response.body.getReader();
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.end("Error en la función /api");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevServer()],
});
