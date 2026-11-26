import { describe, expect, it } from "vitest";
import { diagnose } from "../src/engine/diagnosis";
import { buildStrategy } from "../src/engine/strategy";
import { SAMPLE_ANSWERS } from "../src/brief/sample";
import { SECTIONS, visibleSections } from "../src/brief/schema";

describe("diagnóstico", () => {
  it("no falla con un brief vacío", () => {
    const dx = diagnose({});
    expect(dx.dimensions).toHaveLength(6);
    expect(dx.overall).toBeGreaterThanOrEqual(0);
    expect(dx.overall).toBeLessThanOrEqual(100);
  });

  it("puntúa el ejemplo y detecta acciones rápidas", () => {
    const dx = diagnose(SAMPLE_ANSWERS);
    for (const d of dx.dimensions) expect(d.score).toBeGreaterThanOrEqual(0);
    expect(dx.quickWins.some((q) => q.includes("CRM"))).toBe(true);
    expect(dx.quickWins.some((q) => q.includes("Google Business"))).toBe(true);
  });

  it("un cliente maduro puntúa más que uno inicial", () => {
    const maduro = diagnose({
      ...SAMPLE_ANSWERS,
      crm: "hubspot",
      tiempo_respuesta: "minutos",
      manual_marca: "si",
      medicion: ["ga4", "gtm", "pixel", "search_console", "dashboard"],
      frecuencia_publicacion: "diaria",
      material_disponible: 5,
      auto_estrategia: 5,
      auto_digital: 5,
    });
    expect(maduro.overall).toBeGreaterThan(diagnose(SAMPLE_ANSWERS).overall);
  });
});

describe("estrategia", () => {
  it("genera estrategia B2B de holding para el ejemplo", () => {
    const st = buildStrategy(SAMPLE_ANSWERS);
    expect(st.pillars.map((p) => p.name)).toContain("Marca corporativa del grupo");
    expect(st.frameworks.some((f) => f.name.includes("95-5"))).toBe(true);
    expect(st.frameworks.some((f) => f.name.includes("Arquitectura de marca"))).toBe(true);
    expect(st.channelMix.reduce((s, c) => s + c.share, 0)).toBeGreaterThanOrEqual(98);
    expect(st.scope.map((m) => m.id)).toEqual(expect.arrayContaining(["estrategia", "branding", "crm", "btl"]));
  });

  it("genera estrategia con un brief vacío", () => {
    const st = buildStrategy({});
    expect(st.funnel).toHaveLength(4);
    expect(st.scope.length).toBeGreaterThan(0);
  });
});

describe("esquema", () => {
  it("los ids de campos son únicos", () => {
    const ids = SECTIONS.flatMap((s) => s.fields.map((f) => f.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("oculta unidades de negocio si no es holding", () => {
    expect(visibleSections({ es_holding: false }).some((s) => s.id === "unidades")).toBe(false);
    expect(visibleSections({ es_holding: true }).some((s) => s.id === "unidades")).toBe(true);
  });
});
