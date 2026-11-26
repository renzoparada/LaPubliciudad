# La Publiciudad · Brief de clientes

Web app donde los clientes potenciales completan el **brief de marketing y comunicación** y la agencia obtiene, a partir de las respuestas:

- **Diagnóstico de madurez** en 6 dimensiones (estrategia, marca, presencia digital, contenido, proceso comercial, datos) con hallazgos, acciones rápidas y riesgos.
- **Estrategia**: resumen ejecutivo, posicionamiento, pilares, marcos de trabajo de las grandes agencias (Golden Circle, See-Think-Do-Care, 60/40, 95-5, Hero-Hub-Help, arquitectura de marca, OKR), embudo con tácticas y KPIs, mezcla de canales, plan de contenidos y hoja de ruta de 90 días.
- **Stack de herramientas** recomendado según el presupuesto (CRM, pauta, diseño, redes, SEO, medición, IA).
- **Alcance y cotización**: módulos sugeridos (lo que pidió el cliente + lo que recomienda el diagnóstico) con horas editables y tarifa.
- **Propuesta estratégica con IA** (Claude): un borrador completo de la propuesta en Markdown, listo para la presentación.

El cliente, al terminar, solo ve un mensaje de agradecimiento: el diagnóstico, la estrategia y la cotización quedan únicamente en el panel de la agencia.

Los cambios respecto al brief original están en [docs/brief-mejorado.md](docs/brief-mejorado.md).

## Rutas

| Ruta | Para quién |
|---|---|
| `/#/` | Portada para el cliente |
| `/#/brief` | Formulario por pasos (se guarda solo en el navegador del cliente) |
| `/#/gracias` | Mensaje de agradecimiento al cliente |
| `/#/agencia` | Panel de la agencia (no está enlazado desde las páginas del cliente; entra con la dirección directa): importar briefs (.json), ver diagnóstico, estrategia, herramientas, cotización y generar la propuesta con IA |

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completa las variables
npm run dev                  # http://localhost:5173 (incluye las funciones /api)
npm test                     # pruebas del motor de diagnóstico y estrategia
npm run build
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Necesaria para “Propuesta con IA”. Solo se usa en el servidor. |
| `AGENCY_ACCESS_KEY` | Recomendada: clave que pide el panel para generar propuestas con IA (evita que terceros usen tu cuota). |
| `BRIEF_WEBHOOK_URL` | URL que recibe cada brief enviado (Make, Zapier, n8n, Google Apps Script). Desde ahí puedes mandarlo a tu email, a Google Sheets o a tu CRM. Sin ella, el cliente ve un aviso y descarga su copia para enviarla por email. |

## Publicación (Vercel)

1. Importa el repositorio en Vercel (detecta Vite automáticamente).
2. Configura las variables de entorno de arriba.
3. Publica. Las funciones de `api/` quedan en `/api/submit` y `/api/strategy`.

### Enlace para clientes sin nombres personales

- Nombra el proyecto de Vercel con un nombre neutro (por ejemplo `brief-lapubliciudad`): la dirección de producción será `brief-lapubliciudad.vercel.app`.
- Comparte con los clientes **solo** la dirección de producción o un dominio propio (por ejemplo `brief.lapubliciudad.com`, en Vercel → Settings → Domains).
- No compartas las direcciones de vista previa de Vercel (las que terminan en `-<cuenta>-projects.vercel.app`): incluyen el nombre de la cuenta.
- Si la cuenta de Vercel lleva tu nombre, puedes crear un equipo (team) con el nombre de la agencia y publicar el proyecto ahí.

## Estructura

```
src/brief/schema.ts      Preguntas del brief (editar aquí para cambiar preguntas)
src/engine/diagnosis.ts  Reglas del diagnóstico
src/engine/strategy.ts   Reglas de estrategia, herramientas y alcance
src/pages/               Formulario, página de gracias y panel de agencia
api/submit.ts            Recibe el brief y lo reenvía al webhook
api/strategy.ts          Genera la propuesta con Claude (streaming)
```
