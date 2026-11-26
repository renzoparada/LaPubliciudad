import type { Answers, RepeaterItem } from "../brief/types";

export type DimensionId = "estrategia" | "marca" | "digital" | "contenido" | "comercial" | "datos";

export interface Dimension {
  id: DimensionId;
  name: string;
  score: number; // 0-100
  level: "Inicial" | "En desarrollo" | "Consolidado" | "Avanzado";
  findings: string[];
}

export interface Diagnosis {
  overall: number;
  level: Dimension["level"];
  dimensions: Dimension[];
  quickWins: string[];
  risks: string[];
}

// --- helpers para leer respuestas de forma segura ---
export const str = (a: Answers, k: string) => (typeof a[k] === "string" ? (a[k] as string).trim() : "");
export const arr = (a: Answers, k: string) => (Array.isArray(a[k]) ? (a[k] as unknown[]).filter((x) => typeof x === "string") as string[] : []);
export const num = (a: Answers, k: string) => {
  const v = a[k];
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};
export const items = (a: Answers, k: string) => (Array.isArray(a[k]) ? (a[k] as unknown[]).filter((x) => x && typeof x === "object") as RepeaterItem[] : []);
const filled = (a: Answers, k: string) => str(a, k).length >= 15;
const scale = (a: Answers, k: string) => num(a, k); // 1..5

const levelOf = (s: number): Dimension["level"] => (s < 35 ? "Inicial" : s < 55 ? "En desarrollo" : s < 75 ? "Consolidado" : "Avanzado");

/** Acumula puntos sobre un máximo y devuelve 0-100. */
class Score {
  pts = 0;
  max = 0;
  findings: string[] = [];
  add(weight: number, ok: number | boolean, finding?: string) {
    const v = typeof ok === "boolean" ? (ok ? 1 : 0) : Math.max(0, Math.min(1, ok));
    this.pts += weight * v;
    this.max += weight;
    if (finding && v < 0.5) this.findings.push(finding);
  }
  get value() {
    return this.max ? Math.round((this.pts / this.max) * 100) : 0;
  }
}

export function diagnose(a: Answers): Diagnosis {
  const quickWins: string[] = [];
  const risks: string[] = [];
  const activos = items(a, "activos_digitales");
  const plataformas = new Set(activos.map((x) => String(x.plataforma ?? "")));
  const web = arr(a, "web_estado");
  const medicion = arr(a, "medicion").filter((x) => x !== "nose");

  // 1. Estrategia y objetivos
  const e = new Score();
  e.add(2, arr(a, "objetivos").length > 0, "No hay objetivos de marketing priorizados.");
  e.add(2, filled(a, "metas") && /\d/.test(str(a, "metas")), "Faltan metas cuantificables (números, plazos): sin ellas no se puede medir el retorno.");
  e.add(1, str(a, "horizonte") !== "", "No está definido el horizonte del plan.");
  e.add(1.5, !["", "p0"].includes(str(a, "presupuesto")), "El presupuesto de marketing no está definido.");
  e.add(1.5, filled(a, "propuesta_valor"), "La propuesta de valor no está formulada con claridad.");
  e.add(2, ((scale(a, "auto_estrategia") ?? 1) - 1) / 4, "La propia empresa percibe que su marketing se improvisa.");
  const estrategia = e;

  // 2. Marca
  const m = new Score();
  const manual = str(a, "manual_marca");
  m.add(2, manual === "si" ? 1 : manual === "parcial" ? 0.5 : 0, "No hay un manual de marca vigente: la identidad visual puede ser inconsistente.");
  m.add(1, str(a, "logo_editable") === "si", "No hay logos en formato editable.");
  m.add(1.5, str(a, "atributos").length > 3, "No están definidos los atributos de marca.");
  m.add(1, arr(a, "tono").length > 0, "No hay un tono de comunicación definido.");
  m.add(1.5, filled(a, "percepcion_deseada"), "No está claro el posicionamiento deseado.");
  m.add(2, ((scale(a, "reconocimiento") ?? 1) - 1) / 4, "El reconocimiento de marca es bajo.");
  if (filled(a, "percepciones_negativas")) {
    m.add(1, false, "Existen percepciones negativas que deben gestionarse.");
    risks.push("Hay percepciones negativas declaradas: conviene un plan de reputación y escucha social antes de escalar la pauta.");
  }
  if (a.es_holding === true) {
    const unidades = items(a, "unidades");
    const sinRelacion = unidades.filter((u) => !u.relacion_marca).length;
    m.add(1, unidades.length > 0 && sinRelacion === 0, "La arquitectura de marca del grupo (relación holding ↔ unidades) no está definida.");
  }
  const marca = m;
  if (manual !== "si") quickWins.push("Ordenar la identidad: manual de marca básico y kit de logos editables para todo el equipo.");

  // 3. Presencia digital
  const d = new Score();
  const tieneWeb = !web.includes("sin_web") && (plataformas.has("sitio_web") || str(a, "empresa_web") !== "");
  d.add(2, tieneWeb, "No tienen sitio web propio: dependen 100% de plataformas de terceros.");
  d.add(1, web.includes("movil"), "El sitio web no está optimizado para celulares.");
  d.add(1, web.includes("formularios"), "El sitio web no tiene formularios ni botón de WhatsApp para captar consultas.");
  d.add(0.5, !web.includes("desactualizado"), "El sitio web está desactualizado.");
  d.add(1, plataformas.has("google_business_profile"), "No tienen perfil de Google Business.");
  d.add(1, plataformas.has("whatsapp_business"), "No usan WhatsApp Business.");
  const redes = ["instagram", "facebook", "tiktok", "linkedin", "youtube"].filter((p) => plataformas.has(p)).length;
  d.add(1.5, Math.min(1, redes / 3), "La presencia en redes sociales es limitada.");
  const abandonados = activos.filter((x) => x.activo === "abandonado").length;
  d.add(1, abandonados === 0, `Hay ${abandonados} canal(es) digital(es) abandonado(s), lo que daña la imagen.`);
  d.add(1.5, ((scale(a, "auto_digital") ?? 1) - 1) / 4);
  const digital = d;
  if (!plataformas.has("google_business_profile")) quickWins.push("Crear y optimizar el perfil de Google Business (gratis, impacto inmediato en búsquedas locales y Maps).");
  if (tieneWeb && !web.includes("formularios")) quickWins.push("Agregar botón de WhatsApp y formulario de cotización en el sitio web.");
  if (!tieneWeb) quickWins.push("Publicar una landing page de captación con propuesta de valor, portafolio y formulario.");
  if (abandonados > 0) quickWins.push("Cerrar o reactivar los canales digitales abandonados.");
  if (a.es_holding === true && redes > 0) quickWins.push("Unificar biografías y enlaces de todas las redes para mostrar la pertenencia al grupo.");

  // 4. Contenido
  const c = new Score();
  const freq = str(a, "frecuencia_publicacion");
  c.add(2, { nunca: 0, mensual: 0.35, semanal: 0.8, diaria: 1 }[freq] ?? 0, "La frecuencia de publicación es baja para sostener visibilidad.");
  c.add(2, ((scale(a, "material_disponible") ?? 1) - 1) / 4, "Hay poco material fotográfico y audiovisual propio.");
  c.add(1, a.testimoniales === true, "No hay clientes identificados para testimoniales.");
  c.add(1, a.voceros_si === true, "No hay voceros internos identificados.");
  c.add(1, filled(a, "casos_exito"), "No hay casos de éxito documentados.");
  c.add(1, filled(a, "locaciones"));
  const contenido = c;
  if (a.testimoniales === true) quickWins.push("Grabar 3 testimoniales de clientes satisfechos: es el contenido con más credibilidad.");
  if (filled(a, "casos_exito")) quickWins.push("Convertir los proyectos mencionados en casos de éxito (post, PDF comercial y video corto).");

  // 5. Comercial y CRM
  const k = new Score();
  const crm = str(a, "crm");
  k.add(2, { ninguno: 0, excel: 0.35, otro: 0.7, hubspot: 1, salesforce: 1, zoho: 1, pipedrive: 1 }[crm] ?? 0, "No hay un CRM: se pierden oportunidades y no se puede medir el embudo.");
  const tr = str(a, "tiempo_respuesta");
  k.add(2, { minutos: 1, horas: 0.7, dia: 0.3, mas: 0 }[tr] ?? 0.3, "El tiempo de respuesta a nuevas consultas es lento (lo ideal es menos de 1 hora).");
  const cierre = num(a, "tasa_cierre");
  if (cierre !== undefined) k.add(1.5, Math.min(1, cierre / 4), "La tasa de cierre es baja: hay que trabajar calificación de leads y argumentario comercial.");
  k.add(1.5, ((scale(a, "material_ventas") ?? 1) - 1) / 4, "El equipo comercial no cuenta con el material de marketing que necesita.");
  k.add(1, filled(a, "postventa"), "No hay acciones de postventa o fidelización.");
  k.add(1, arr(a, "canales_captacion").length >= 3, "Dependen de pocos canales de captación.");
  const comercial = k;
  if (["ninguno", "excel", ""].includes(crm)) quickWins.push("Implementar un CRM gratuito o de entrada (HubSpot Free, Zoho, Pipedrive) y registrar cada consulta desde el día 1.");
  if (["dia", "mas"].includes(tr)) quickWins.push("Configurar respuestas automáticas y catálogo en WhatsApp Business para responder en minutos.");
  if ((scale(a, "material_ventas") ?? 3) <= 2) quickWins.push("Diseñar un kit comercial: presentación, brochure y fichas de producto prioritarios.");

  // 6. Datos y medición
  const t = new Score();
  t.add(2, medicion.includes("ga4"), "No tienen Google Analytics 4 instalado.");
  t.add(1, medicion.includes("gtm"));
  t.add(1.5, medicion.includes("pixel"), "No tienen Meta Pixel / API de conversiones: la pauta en Meta no se puede optimizar.");
  t.add(1, medicion.includes("search_console"));
  t.add(1.5, medicion.includes("dashboard"), "No hay un tablero de resultados para tomar decisiones.");
  t.add(1, str(a, "kpis_actuales").length > 3, "No hay indicadores de marketing definidos.");
  const datos = t;
  if (!medicion.includes("ga4") || !medicion.includes("pixel")) quickWins.push("Instalar la base de medición (GA4 + Google Tag Manager + Meta Pixel) antes de invertir en pauta.");

  if (["", "p0", "p1"].includes(str(a, "presupuesto")) && arr(a, "objetivos").length >= 3)
    risks.push("Hay muchos objetivos para el presupuesto disponible: se recomienda priorizar por etapas.");
  if (str(a, "ciclo_compra") === "largo") risks.push("El ciclo de compra es largo: los resultados en ventas se verán en meses; medir también indicadores intermedios.");
  if (filled(a, "restricciones_marca")) risks.push("Existen restricciones de marca o contratos de representación: validar cada pieza con los lineamientos correspondientes.");
  if (filled(a, "restricciones_filmacion")) risks.push("Hay restricciones de filmación o seguridad: planificar permisos y protocolos para las producciones.");

  const dims: Dimension[] = [
    { id: "estrategia", name: "Estrategia y objetivos", s: estrategia },
    { id: "marca", name: "Marca y posicionamiento", s: marca },
    { id: "digital", name: "Presencia digital", s: digital },
    { id: "contenido", name: "Contenido", s: contenido },
    { id: "comercial", name: "Proceso comercial y CRM", s: comercial },
    { id: "datos", name: "Datos y medición", s: datos },
  ].map(({ id, name, s }) => ({ id: id as DimensionId, name, score: s.value, level: levelOf(s.value), findings: s.findings }));

  const overall = Math.round(dims.reduce((acc, x) => acc + x.score, 0) / dims.length);
  return { overall, level: levelOf(overall), dimensions: dims, quickWins: quickWins.slice(0, 8), risks };
}
