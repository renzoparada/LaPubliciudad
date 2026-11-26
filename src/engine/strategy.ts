import type { Answers } from "../brief/types";
import { OBJETIVOS, SERVICIOS, optionLabel } from "../brief/schema";
import { arr, diagnose, items, str, type Diagnosis } from "./diagnosis";

export interface Framework {
  name: string;
  origin: string;
  why: string;
}
export interface FunnelStage {
  stage: string;
  goal: string;
  tactics: string[];
  channels: string[];
  kpis: string[];
}
export interface Tool {
  name: string;
  use: string;
  tier: "Gratis" | "Básico" | "Pro";
}
export interface ToolCategory {
  category: string;
  tools: Tool[];
}
export interface ScopeModule {
  id: string;
  name: string;
  type: "Proyecto" | "Mensual";
  hours: number;
  deliverables: string[];
  reason: string;
}
export interface Strategy {
  diagnosis: Diagnosis;
  summary: string;
  positioning: string;
  pillars: { name: string; description: string }[];
  frameworks: Framework[];
  funnel: FunnelStage[];
  channelMix: { channel: string; share: number }[];
  brandActivationSplit: { brand: number; activation: number; note: string };
  contentPlan: { format: string; frequency: string; idea: string }[];
  roadmap: { phase: string; weeks: string; actions: string[] }[];
  kpis: string[];
  tools: ToolCategory[];
  scope: ScopeModule[];
}

const budgetTier = (a: Answers): "bajo" | "medio" | "alto" => {
  const p = str(a, "presupuesto");
  if (["p4", "p5"].includes(p)) return "alto";
  if (p === "p3") return "medio";
  return "bajo";
};

export function buildStrategy(a: Answers): Strategy {
  const dx = diagnose(a);
  const objetivos = arr(a, "objetivos");
  const has = (o: string) => objetivos.includes(o);
  const modelo = str(a, "modelo_negocio") || "mixto";
  const b2b = modelo === "b2b" || modelo === "b2g";
  const holding = a.es_holding === true;
  const tier = budgetTier(a);
  const empresa = str(a, "empresa_nombre") || "la empresa";
  const unidades = items(a, "unidades");
  const productos = items(a, "productos");
  const prioritarios = productos.filter((p) => p.prioridad === "alta").map((p) => String(p.nombre || "")).filter(Boolean);
  const score = (id: string) => dx.dimensions.find((d) => d.id === id)?.score ?? 0;
  const weakest = [...dx.dimensions].sort((x, y) => x.score - y.score).slice(0, 2);

  // --- Marcos estratégicos (metodologías usadas por agencias y consultoras globales) ---
  const frameworks: Framework[] = [
    {
      name: "Golden Circle (Por qué → Cómo → Qué)",
      origin: "Simon Sinek",
      why: "Para ordenar el relato de marca desde el propósito y no solo desde el producto.",
    },
    {
      name: "See · Think · Do · Care",
      origin: "Google",
      why: "Para planificar mensajes y canales según la etapa de decisión del cliente.",
    },
  ];
  if (has("posicionar_marca") || has("reputacion") || has("lanzar_producto"))
    frameworks.push({
      name: "Regla 60/40 marca–activación",
      origin: "Binet & Field (IPA)",
      why: "Para equilibrar construcción de marca a largo plazo con ventas a corto plazo.",
    });
  if (b2b)
    frameworks.push(
      {
        name: "Regla 95-5 y Account-Based Marketing",
        origin: "B2B Institute (LinkedIn) / ITSMA",
        why: "Solo ~5% de las empresas está comprando hoy: hay que estar presentes en la mente del 95% restante y atacar cuentas clave con mensajes a medida.",
      },
    );
  else
    frameworks.push({
      name: "Messy Middle",
      origin: "Google / The Behavioural Architects",
      why: "El consumidor explora y evalúa en bucle: hay que aparecer con pruebas sociales y ofertas en ese momento.",
    });
  if (holding)
    frameworks.push({
      name: "Arquitectura de marca (monolítica, respaldada, independiente)",
      origin: "Aaker & Joachimsthaler",
      why: "Para definir cómo se relaciona la marca del grupo con cada unidad y potenciar su credibilidad cruzada.",
    });
  frameworks.push(
    { name: "Hero · Hub · Help", origin: "YouTube / Google", why: "Para combinar grandes piezas de campaña con contenido recurrente y contenido útil que responde búsquedas." },
    { name: "Objetivos SMART + OKR trimestrales", origin: "Doran / Intel–Google", why: "Para convertir los objetivos en metas medibles y revisables cada trimestre." },
  );

  // --- Pilares ---
  const pillars: Strategy["pillars"] = [];
  if (has("posicionar_marca") || has("reputacion") || holding)
    pillars.push({
      name: holding ? "Marca corporativa del grupo" : "Posicionamiento de marca",
      description: holding
        ? `Construir una plataforma de marca para ${empresa} que dé paraguas, credibilidad y relato común a sus ${unidades.length || "distintas"} unidades de negocio.`
        : `Definir la plataforma de marca de ${empresa} (propósito, promesa, personalidad y mensajes) y aplicarla de forma consistente en todos los puntos de contacto.`,
    });
  if (has("dar_a_conocer_portafolio") || has("lanzar_producto"))
    pillars.push({
      name: "Visibilidad del portafolio",
      description: prioritarios.length
        ? `Campañas y contenido para los productos prioritarios: ${prioritarios.slice(0, 4).join(", ")}.`
        : "Dar a conocer el ecosistema de productos y servicios con contenido explicativo y campañas por línea.",
    });
  if (has("aumentar_ventas") || has("generar_leads") || has("expandir_mercados"))
    pillars.push({
      name: "Generación de demanda",
      description: b2b
        ? "Atraer y calificar oportunidades con contenido experto, LinkedIn, búsquedas en Google y seguimiento comercial en CRM."
        : "Campañas de performance en Meta, Google y TikTok con ofertas claras, remarketing y medición de cada venta.",
    });
  pillars.push({
    name: "Habilitación comercial",
    description: "Dotar al equipo de ventas de materiales, argumentario, CRM y respuestas rápidas para convertir más de lo que ya llega.",
  });
  if (has("fidelizar") || score("comercial") < 50)
    pillars.push({ name: "Fidelización y recompra", description: "Programa de postventa, email/WhatsApp marketing y referidos para aumentar el valor de cada cliente." });
  if (has("employer_branding")) pillars.push({ name: "Marca empleadora", description: "Mostrar la cultura y las personas para atraer y retener talento." });

  // --- Embudo ---
  const funnel: FunnelStage[] = [
    {
      stage: "Ver (descubrimiento)",
      goal: "Que el público objetivo conozca la marca y lo que la hace diferente.",
      tactics: [
        "Campaña de marca con el concepto creativo central",
        holding ? "Serie “Somos parte de " + empresa + "” presentando cada unidad" : "Video manifiesto de marca",
        "Pauta de alcance y video en redes",
        b2b ? "Columnas de opinión y prensa especializada" : "Colaboraciones con creadores de contenido",
      ],
      channels: b2b ? ["LinkedIn", "YouTube", "Prensa especializada", "Ferias"] : ["Instagram", "TikTok", "YouTube", "Meta Ads"],
      kpis: ["Alcance", "Recordación (encuesta)", "Búsquedas de marca", "Crecimiento de seguidores"],
    },
    {
      stage: "Pensar (consideración)",
      goal: "Que nos evalúen como la mejor opción.",
      tactics: [
        "Contenido educativo y demostraciones de producto",
        "Casos de éxito y testimoniales",
        "SEO y Google Ads en búsquedas de intención",
        "Remarketing a quienes ya interactuaron",
      ],
      channels: ["Sitio web / blog", "Google Search", "YouTube", b2b ? "LinkedIn" : "Instagram"],
      kpis: ["Tráfico calificado", "Tiempo en sitio", "Visualizaciones completas", "Descargas de catálogos"],
    },
    {
      stage: "Hacer (conversión)",
      goal: "Convertir el interés en cotizaciones y ventas.",
      tactics: [
        "Landing pages por producto prioritario con formulario y WhatsApp",
        "Campañas de conversión y generación de leads",
        "Respuesta en menos de 1 hora con automatizaciones",
        b2b ? "Secuencias de seguimiento comercial desde el CRM" : "Ofertas por temporada y urgencia",
      ],
      channels: ["Landing pages", "WhatsApp Business", "Google Ads", "Meta Lead Ads", "CRM"],
      kpis: ["Leads", "Costo por lead", "Tasa de cierre", "Ventas atribuidas", "ROAS"],
    },
    {
      stage: "Cuidar (fidelización)",
      goal: "Que el cliente vuelva a comprar y nos recomiende.",
      tactics: ["Onboarding y postventa", "Newsletter y WhatsApp con contenido de valor", "Programa de referidos", "Encuestas NPS"],
      channels: ["Email", "WhatsApp", "Comunidad / eventos"],
      kpis: ["Recompra", "NPS", "Referidos", "Valor de vida del cliente (LTV)"],
    },
  ];

  // --- Mezcla de canales (porcentaje sugerido del presupuesto de pauta) ---
  const mix: Record<string, number> = b2b
    ? { "LinkedIn Ads": 30, "Google Ads (búsqueda)": 30, "Meta Ads": 15, "YouTube": 10, "Contenido / SEO": 15 }
    : { "Meta Ads (Instagram + Facebook)": 35, "Google Ads": 25, "TikTok Ads": 15, "YouTube": 10, "Influencers / creadores": 15 };
  if (str(a, "sector") === "turismo_hoteleria_y_gastronomia" || str(a, "sector") === "retail_y_consumo_masivo") mix["Google Business / Maps"] = 5;
  const total = Object.values(mix).reduce((s, v) => s + v, 0);
  const channelMix = Object.entries(mix).map(([channel, v]) => ({ channel, share: Math.round((v / total) * 100) }));

  const brandHeavy = has("posicionar_marca") || has("reputacion") || has("lanzar_producto");
  const brandActivationSplit = brandHeavy
    ? b2b
      ? { brand: 46, activation: 54, note: "En B2B la referencia es ~46% marca / 54% activación (LinkedIn B2B Institute)." }
      : { brand: 60, activation: 40, note: "La referencia para marcas de consumo es ~60% marca / 40% activación (Binet & Field)." }
    : { brand: 30, activation: 70, note: "Con foco en ventas a corto plazo se prioriza activación, sin abandonar la construcción de marca." };

  // --- Plan de contenidos ---
  const contentPlan: Strategy["contentPlan"] = [
    { format: "Videos cortos (Reels / TikTok / Shorts)", frequency: "3 por semana", idea: "Procesos, detrás de escena, tips del experto y respuestas a preguntas frecuentes." },
    { format: "Carruseles y posts", frequency: "2 por semana", idea: "Beneficios de producto, datos del sector y diferenciales frente a la competencia." },
    { format: "Caso de éxito", frequency: "1 al mes", idea: "Problema → solución → resultado, en video, post y PDF para ventas." },
    { format: "Pieza Hero de campaña", frequency: "1 por trimestre", idea: "Gran idea creativa que concentra la inversión en medios." },
  ];
  if (b2b) contentPlan.push({ format: "Artículo / newsletter de LinkedIn", frequency: "2 al mes", idea: "Liderazgo de opinión de los voceros internos." });
  if (holding) contentPlan.push({ format: "Serie del ecosistema", frequency: "1 unidad por semana", idea: "Presentar cada unidad de negocio bajo el paraguas del grupo." });

  // --- Hoja de ruta 90 días ---
  const roadmap: Strategy["roadmap"] = [
    {
      phase: "Fase 1 · Fundamentos",
      weeks: "Semanas 1 a 4",
      actions: [
        "Taller de descubrimiento y auditoría de marca, competencia y canales",
        holding ? "Definir la arquitectura de marca del grupo" : "Definir la plataforma de marca y los mensajes clave",
        "Instalar medición: GA4, Tag Manager, Meta Pixel y tablero de resultados",
        "Configurar CRM y WhatsApp Business con respuestas automáticas",
        ...dx.quickWins.slice(0, 2),
      ],
    },
    {
      phase: "Fase 2 · Activación",
      weeks: "Semanas 5 a 8",
      actions: [
        "Concepto creativo y lanzamiento de la campaña principal",
        "Calendario editorial mensual y producción de contenido",
        "Landing pages de los productos prioritarios",
        "Campañas de pauta por etapa del embudo",
        "Kit comercial para el equipo de ventas",
      ],
    },
    {
      phase: "Fase 3 · Optimización y escala",
      weeks: "Semanas 9 a 12",
      actions: [
        "Pruebas A/B de creatividades, audiencias y ofertas",
        "Reasignar presupuesto a los canales con mejor costo por resultado",
        "Primer informe trimestral de resultados y OKR del siguiente trimestre",
        "Plan de fechas clave de los próximos 12 meses",
      ],
    },
  ];

  // --- KPIs ---
  const kpis = new Set<string>();
  if (has("posicionar_marca") || has("reputacion")) ["Alcance y frecuencia", "Búsquedas de marca en Google", "Share of voice vs. competencia", "Sentimiento de menciones"].forEach((k) => kpis.add(k));
  if (has("generar_leads") || has("aumentar_ventas") || has("expandir_mercados")) ["Leads calificados por mes", "Costo por lead (CPL)", "Tasa de cierre", "Ventas atribuidas a marketing", "Retorno de la inversión publicitaria (ROAS)"].forEach((k) => kpis.add(k));
  if (has("dar_a_conocer_portafolio") || has("lanzar_producto")) ["Visitas a páginas de producto", "Descargas de catálogo", "Consultas por producto"].forEach((k) => kpis.add(k));
  if (has("fidelizar")) ["Tasa de recompra", "NPS", "LTV"].forEach((k) => kpis.add(k));
  ["Tasa de interacción en redes", "Tiempo de respuesta a consultas"].forEach((k) => kpis.add(k));

  // --- Herramientas ---
  const pro = tier === "alto";
  const tools: ToolCategory[] = [
    {
      category: "Investigación y estrategia",
      tools: [
        { name: "Google Trends", use: "Tendencias de búsqueda y estacionalidad", tier: "Gratis" },
        { name: "Meta Ad Library / Google Ads Transparency", use: "Ver la publicidad activa de la competencia", tier: "Gratis" },
        { name: pro ? "Semrush o Similarweb" : "Ubersuggest", use: "Tráfico y palabras clave de la competencia", tier: pro ? "Pro" : "Básico" },
        { name: "Claude (IA)", use: "Análisis del brief, investigación y borradores estratégicos", tier: "Básico" },
      ],
    },
    {
      category: "Marca y diseño",
      tools: [
        { name: "Figma", use: "Sistema de identidad, plantillas y prototipos web", tier: "Básico" },
        { name: pro ? "Adobe Creative Cloud" : "Canva Pro", use: "Piezas gráficas y plantillas de marca para el equipo", tier: pro ? "Pro" : "Básico" },
        { name: "Adobe Firefly / Midjourney", use: "Exploración visual y moodboards con IA", tier: "Básico" },
      ],
    },
    {
      category: "Contenido y redes",
      tools: [
        { name: pro ? "Sprout Social o Hootsuite" : "Metricool", use: "Calendario, publicación y reportes de redes", tier: pro ? "Pro" : "Básico" },
        { name: "CapCut / Adobe Premiere", use: "Edición de video vertical y largo", tier: "Básico" },
        { name: "Notion o Asana", use: "Calendario editorial y flujo de aprobaciones", tier: "Básico" },
      ],
    },
    {
      category: "Publicidad",
      tools: [
        { name: "Meta Ads Manager", use: "Campañas en Instagram, Facebook y WhatsApp", tier: "Gratis" },
        { name: "Google Ads", use: "Búsqueda, YouTube, Display y Performance Max", tier: "Gratis" },
        ...(b2b ? [{ name: "LinkedIn Campaign Manager", use: "Segmentación por cargo, industria y empresa", tier: "Gratis" as const }] : [{ name: "TikTok Ads Manager", use: "Alcance y conversión en público joven", tier: "Gratis" as const }]),
      ],
    },
    {
      category: "CRM, ventas y automatización",
      tools: [
        { name: pro ? "HubSpot Sales/Marketing Pro o Salesforce" : "HubSpot Free / Starter, Zoho o Pipedrive", use: "Registro de oportunidades, embudo y seguimiento", tier: pro ? "Pro" : "Básico" },
        { name: "WhatsApp Business (app o API)", use: "Catálogo, etiquetas, respuestas rápidas y automatizaciones", tier: "Gratis" },
        { name: "Brevo o Mailchimp", use: "Email marketing y secuencias automáticas", tier: "Básico" },
        { name: "Make o Zapier", use: "Conectar formularios, CRM, WhatsApp y hojas de cálculo", tier: "Básico" },
      ],
    },
    {
      category: "Web y SEO",
      tools: [
        { name: "WordPress / Webflow", use: "Sitio autogestionable y landing pages", tier: "Básico" },
        { name: "Google Search Console", use: "Indexación y rendimiento en búsquedas", tier: "Gratis" },
        { name: "Google Business Profile", use: "Presencia en Google Maps y búsquedas locales", tier: "Gratis" },
      ],
    },
    {
      category: "Medición y reportes",
      tools: [
        { name: "Google Analytics 4 + Tag Manager", use: "Medición de tráfico y conversiones", tier: "Gratis" },
        { name: "Looker Studio", use: "Tablero de resultados para la gerencia", tier: "Gratis" },
        { name: "Microsoft Clarity", use: "Mapas de calor y grabaciones de sesión", tier: "Gratis" },
        ...(has("reputacion") || has("posicionar_marca") ? [{ name: pro ? "Talkwalker o Brandwatch" : "Brand24", use: "Escucha social y reputación", tier: pro ? ("Pro" as const) : ("Básico" as const) }] : []),
      ],
    },
  ];

  // --- Alcance para cotizar ---
  const servicios = new Set(arr(a, "servicios"));
  // El diagnóstico agrega servicios que el cliente no pidió pero necesita
  if (score("datos") < 50) servicios.add("estrategia");
  if (score("marca") < 45) servicios.add("branding");
  if (score("digital") < 45) servicios.add("web");
  if (score("comercial") < 45) servicios.add("crm");
  if (score("contenido") < 50) servicios.add("contenido");
  servicios.add("estrategia");
  const nUnits = Math.max(1, unidades.length);
  const nProd = Math.max(1, productos.length);
  const unitFactor = holding ? 1 + (nUnits - 1) * 0.35 : 1;
  const pedidos = new Set(arr(a, "servicios"));
  const reasonFor = (id: string, fallback: string) => (pedidos.has(id) ? "Solicitado por el cliente." : fallback);
  const catalog: Record<string, Omit<ScopeModule, "reason"> & { why: string }> = {
    estrategia: { id: "estrategia", name: "Diagnóstico y plan estratégico de marketing", type: "Proyecto", hours: Math.round(32 * unitFactor), deliverables: ["Auditoría 360°", "Plan de marketing 12 meses", "OKR y KPIs", "Presentación a gerencia"], why: "Recomendado por el diagnóstico: es la base de todo lo demás." },
    branding: { id: "branding", name: holding ? "Plataforma y arquitectura de marca del grupo" : "Plataforma de marca e identidad", type: "Proyecto", hours: Math.round(48 * unitFactor), deliverables: ["Plataforma de marca", holding ? "Arquitectura de marca" : "Ajuste de identidad visual", "Manual de marca", "Plantillas"], why: "El diagnóstico detectó brechas en marca e identidad." },
    web: { id: "web", name: "Sitio web y landing pages", type: "Proyecto", hours: 60 + Math.min(nProd, 6) * 6, deliverables: ["Arquitectura y diseño UX/UI", "Desarrollo autogestionable", "Landing pages de productos prioritarios", "SEO técnico básico"], why: "El diagnóstico detectó carencias en la presencia digital." },
    redes: { id: "redes", name: "Gestión de redes sociales", type: "Mensual", hours: Math.round(40 * unitFactor), deliverables: ["Calendario editorial", "Diseño y copy", "Publicación y comunidad", "Reporte mensual"], why: "Necesario para sostener visibilidad." },
    pauta: { id: "pauta", name: "Gestión de publicidad digital", type: "Mensual", hours: tier === "alto" ? 40 : 24, deliverables: ["Estrategia de medios", "Configuración y optimización de campañas", "Pruebas A/B", "Reporte de ROAS"], why: "Para acelerar el alcance y las conversiones." },
    seo: { id: "seo", name: "SEO y contenido para buscadores", type: "Mensual", hours: 20, deliverables: ["Investigación de palabras clave", "Optimización on-page", "2-4 artículos al mes"], why: "Para captar demanda que ya busca la solución." },
    contenido: { id: "contenido", name: "Producción audiovisual", type: "Mensual", hours: 32, deliverables: ["Jornada de grabación mensual", "8-12 videos cortos", "Sesión fotográfica", "Casos de éxito"], why: "El diagnóstico detectó poco material propio." },
    crm: { id: "crm", name: "CRM, WhatsApp y automatización", type: "Proyecto", hours: 36, deliverables: ["Implementación de CRM", "Embudo de ventas", "Automatizaciones de WhatsApp y email", "Capacitación"], why: "El diagnóstico detectó oportunidades en el proceso comercial." },
    material_comercial: { id: "material_comercial", name: "Kit de material comercial", type: "Proyecto", hours: 24 + Math.min(nProd, 8) * 3, deliverables: ["Brochure corporativo", "Presentación comercial", "Fichas de producto"], why: "El equipo comercial necesita material." },
    pr: { id: "pr", name: "Relaciones públicas y prensa", type: "Mensual", hours: 20, deliverables: ["Plan de medios ganados", "Notas de prensa", "Gestión de entrevistas"], why: "Para construir reputación." },
    btl: { id: "btl", name: "Eventos, ferias y BTL", type: "Proyecto", hours: 40, deliverables: ["Concepto del stand o activación", "Piezas gráficas", "Coordinación de producción"], why: "Hay ferias o eventos en el calendario." },
    medios_tradicionales: { id: "medios_tradicionales", name: "Planificación de medios tradicionales", type: "Proyecto", hours: 16, deliverables: ["Plan de medios ATL", "Negociación", "Piezas para TV, radio y vía pública"], why: "Para cobertura masiva." },
    influencers: { id: "influencers", name: "Marketing de influencers", type: "Mensual", hours: 16, deliverables: ["Selección de creadores", "Briefs y negociación", "Medición de resultados"], why: "Para ganar alcance y credibilidad." },
    capacitacion: { id: "capacitacion", name: "Capacitación comercial y de marketing", type: "Proyecto", hours: 12, deliverables: ["Taller de argumentario de ventas", "Taller de redes y WhatsApp"], why: "Para que el equipo aproveche las herramientas." },
  };
  if ((scale(a) ?? 5) <= 2) servicios.add("material_comercial");
  if (items(a, "eventos").some((e) => String(e.tipo ?? "").startsWith("feria"))) servicios.add("btl");
  const scope = SERVICIOS.map((s) => s.value)
    .filter((id) => servicios.has(id) && catalog[id])
    .map((id) => {
      const { why, ...rest } = catalog[id];
      return { ...rest, reason: reasonFor(id, why) };
    });

  // --- Resumen y posicionamiento ---
  const objetivosTxt = objetivos.map((o) => optionLabel(OBJETIVOS, o).toLowerCase()).join(", ");
  const summary =
    `${empresa} tiene un nivel de madurez de marketing ${dx.level.toLowerCase()} (${dx.overall}/100). ` +
    (objetivosTxt ? `Sus objetivos son ${objetivosTxt}. ` : "") +
    `Las mayores oportunidades están en ${weakest.map((w) => w.name.toLowerCase()).join(" y ")}. ` +
    `Proponemos una estrategia ${b2b ? "B2B de marca y generación de demanda" : "de marca y performance full-funnel"}${holding ? " con una marca corporativa que actúe como paraguas del ecosistema" : ""}, empezando por fundamentos de medición y conversión para que cada peso invertido se pueda medir.`;
  const deseada = str(a, "percepcion_deseada");
  const pv = str(a, "propuesta_valor");
  const positioning = deseada || pv
    ? `Para ${str(a, "cliente_ideal") || "su cliente ideal"}, ${empresa} es ${deseada || "la mejor opción"}${pv ? `, porque ${lowerFirst(pv.replace(/^porque\s+/i, "").replace(/[.\s]+$/, ""))}` : ""}.`
    : "Se definirá en el taller de descubrimiento.";

  return {
    diagnosis: dx,
    summary,
    positioning,
    pillars,
    frameworks,
    funnel,
    channelMix,
    brandActivationSplit,
    contentPlan,
    roadmap,
    kpis: [...kpis],
    tools,
    scope,
  };
}

function lowerFirst(t: string) {
  return t && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
}

function scale(a: Answers) {
  const v = a.material_ventas;
  return typeof v === "number" ? v : undefined;
}
