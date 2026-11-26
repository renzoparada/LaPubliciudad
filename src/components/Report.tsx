import { useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Diagnosis } from "../engine/diagnosis";
import type { Strategy } from "../engine/strategy";
import type { Answers, AnswerValue, Field } from "../brief/types";
import { SECTIONS, optionLabel } from "../brief/schema";

export function ScoreBar({ label, score, level }: { label: string; score: number; level?: string }) {
  const tone = score < 35 ? "low" : score < 55 ? "mid" : score < 75 ? "good" : "top";
  return (
    <div className="scorebar">
      <div className="scorebar-head">
        <span>{label}</span>
        <span className="scorebar-val">
          {score}/100{level ? ` · ${level}` : ""}
        </span>
      </div>
      <div className="scorebar-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={label}>
        <div className={`scorebar-fill ${tone}`} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
    </div>
  );
}

export function DiagnosisView({ dx, detailed = true }: { dx: Diagnosis; detailed?: boolean }) {
  return (
    <section className="panel">
      <div className="dx-hero">
        <div className="dx-ring" style={{ ["--p" as string]: dx.overall }}>
          <span>{dx.overall}</span>
          <small>/100</small>
        </div>
        <div>
          <p className="eyebrow">Madurez de marketing</p>
          <h2>{dx.level}</h2>
          <p className="muted">Calculado a partir de las respuestas en seis dimensiones.</p>
        </div>
      </div>
      <div className="dx-grid">
        {dx.dimensions.map((d) => (
          <div key={d.id} className="dx-dim">
            <ScoreBar label={d.name} score={d.score} level={d.level} />
            {detailed && d.findings.length > 0 && (
              <ul className="findings">
                {d.findings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {dx.quickWins.length > 0 && (
        <>
          <h3>⚡ Acciones rápidas recomendadas</h3>
          <ul className="checklist">
            {dx.quickWins.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </>
      )}
      {detailed && dx.risks.length > 0 && (
        <>
          <h3>⚠️ Riesgos y consideraciones</h3>
          <ul className="findings">
            {dx.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function StrategyView({ st }: { st: Strategy }) {
  return (
    <>
      <section className="panel">
        <p className="eyebrow">Resumen ejecutivo</p>
        <p className="big">{st.summary}</p>
        <h3>Declaración de posicionamiento (borrador)</h3>
        <blockquote>{st.positioning}</blockquote>
      </section>

      <section className="panel">
        <h2>Pilares estratégicos</h2>
        <div className="cards">
          {st.pillars.map((p, i) => (
            <div className="card" key={p.name}>
              <span className="card-num">{String(i + 1).padStart(2, "0")}</span>
              <h4>{p.name}</h4>
              <p>{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Marcos de trabajo aplicados</h2>
        <p className="muted">Metodologías que usan las grandes agencias y consultoras, elegidas según el perfil del cliente.</p>
        <ul className="frameworks">
          {st.frameworks.map((f) => (
            <li key={f.name}>
              <strong>{f.name}</strong> <span className="muted">· {f.origin}</span>
              <br />
              {f.why}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Embudo y tácticas</h2>
        <div className="funnel">
          {st.funnel.map((s, i) => (
            <div className="funnel-stage" key={s.stage} style={{ ["--i" as string]: i }}>
              <h4>{s.stage}</h4>
              <p className="muted">{s.goal}</p>
              <ul>
                {s.tactics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="tags">
                {s.channels.map((c) => (
                  <span className="tag" key={c}>
                    {c}
                  </span>
                ))}
              </p>
              <p className="small">
                <strong>KPIs:</strong> {s.kpis.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel two-col">
        <div>
          <h2>Mezcla de canales pagados</h2>
          <p className="muted small">Distribución sugerida del presupuesto de pauta (punto de partida, se optimiza con datos).</p>
          {st.channelMix.map((c) => (
            <ScoreBar key={c.channel} label={c.channel} score={c.share} />
          ))}
        </div>
        <div>
          <h2>Marca vs. activación</h2>
          <div className="split">
            <div style={{ flex: st.brandActivationSplit.brand }} className="split-brand">
              Marca {st.brandActivationSplit.brand}%
            </div>
            <div style={{ flex: st.brandActivationSplit.activation }} className="split-act">
              Activación {st.brandActivationSplit.activation}%
            </div>
          </div>
          <p className="muted small">{st.brandActivationSplit.note}</p>
          <h3>KPIs del plan</h3>
          <ul className="tags">
            {st.kpis.map((k) => (
              <li className="tag" key={k}>
                {k}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel">
        <h2>Plan de contenidos</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Formato</th>
              <th>Frecuencia</th>
              <th>Idea</th>
            </tr>
          </thead>
          <tbody>
            {st.contentPlan.map((c) => (
              <tr key={c.format}>
                <td>{c.format}</td>
                <td>{c.frequency}</td>
                <td>{c.idea}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Hoja de ruta 90 días</h2>
        <div className="roadmap">
          {st.roadmap.map((r) => (
            <div className="roadmap-phase" key={r.phase}>
              <p className="eyebrow">{r.weeks}</p>
              <h4>{r.phase}</h4>
              <ul className="checklist">
                {r.actions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function ToolsView({ st }: { st: Strategy }) {
  return (
    <section className="panel">
      <h2>Stack de herramientas recomendado</h2>
      <p className="muted">Ajustado al presupuesto declarado. “Gratis” y “Básico” permiten empezar ya; “Pro” cuando el volumen lo justifique.</p>
      <div className="tools">
        {st.tools.map((c) => (
          <div className="card" key={c.category}>
            <h4>{c.category}</h4>
            <ul className="tool-list">
              {c.tools.map((t) => (
                <li key={t.name}>
                  <div>
                    <strong>{t.name}</strong>
                    <span className={`tier tier-${t.tier.toLowerCase()}`}>{t.tier}</span>
                  </div>
                  <span className="muted small">{t.use}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ScopeView({ st }: { st: Strategy }) {
  const [rate, setRate] = useState(35);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(st.scope.map((m) => [m.id, true])));
  const [hours, setHours] = useState<Record<string, number>>(() => Object.fromEntries(st.scope.map((m) => [m.id, m.hours])));
  const money = (n: number) => `USD ${new Intl.NumberFormat("es", { useGrouping: "always", maximumFractionDigits: 0 } as unknown as Intl.NumberFormatOptions).format(n)}`;
  const active = st.scope.filter((m) => selected[m.id]);
  const oneOff = active.filter((m) => m.type === "Proyecto").reduce((s, m) => s + hours[m.id] * rate, 0);
  const monthly = active.filter((m) => m.type === "Mensual").reduce((s, m) => s + hours[m.id] * rate, 0);
  return (
    <section className="panel">
      <h2>Alcance sugerido para la cotización</h2>
      <p className="muted">Combina lo que pidió el cliente con lo que recomienda el diagnóstico. Ajusta horas y tarifa para obtener una estimación.</p>
      <label className="rate">
        Tarifa por hora (USD)
        <input type="number" min={1} value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} />
      </label>
      <table className="table scope">
        <thead>
          <tr>
            <th></th>
            <th>Módulo</th>
            <th>Tipo</th>
            <th>Horas</th>
            <th>Estimado</th>
          </tr>
        </thead>
        <tbody>
          {st.scope.map((m) => (
            <tr key={m.id} className={selected[m.id] ? "" : "off"}>
              <td>
                <input type="checkbox" aria-label={`Incluir ${m.name}`} checked={!!selected[m.id]} onChange={(e) => setSelected({ ...selected, [m.id]: e.target.checked })} />
              </td>
              <td>
                <strong>{m.name}</strong>
                <div className="muted small">{m.deliverables.join(" · ")}</div>
                <div className="small reason">{m.reason}</div>
              </td>
              <td>{m.type === "Mensual" ? "Mensual" : "Proyecto"}</td>
              <td>
                <input className="hours" type="number" min={0} value={hours[m.id]} onChange={(e) => setHours({ ...hours, [m.id]: Number(e.target.value) || 0 })} />
              </td>
              <td>
                {money(hours[m.id] * rate)}
                {m.type === "Mensual" ? "/mes" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals">
        <div>
          <span className="muted">Proyectos (pago único)</span>
          <strong>{money(oneOff)}</strong>
        </div>
        <div>
          <span className="muted">Fee mensual</span>
          <strong>{money(monthly)}/mes</strong>
        </div>
      </div>
      <p className="muted small">La inversión en medios (pauta) se factura aparte y la paga el cliente directamente a las plataformas.</p>
    </section>
  );
}

const fmt = (f: Field, v: AnswerValue): string => {
  if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return "";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (f.type === "select") return optionLabel(f.options, String(v));
  if (f.type === "multiselect" && Array.isArray(v)) return (v as string[]).map((x) => optionLabel(f.options, x)).join(", ");
  if (f.type === "scale") return `${v} / 5`;
  return String(v);
};

export function AnswersView({ answers }: { answers: Answers }) {
  return (
    <section className="panel answers">
      {SECTIONS.filter((s) => !s.showIf || s.showIf(answers)).map((s) => (
        <div key={s.id}>
          <h3>
            {s.icon} {s.title}
          </h3>
          <dl>
            {s.fields.map((f) => {
              const v = answers[f.id];
              if (f.type === "repeater") {
                const list = Array.isArray(v) ? (v as Record<string, AnswerValue>[]) : [];
                if (!list.length) return null;
                return (
                  <div key={f.id} className="answer-repeater">
                    <dt>{f.label}</dt>
                    {list.map((it, i) => (
                      <dd key={i} className="answer-item">
                        {f.fields
                          ?.map((sf) => [sf.label, fmt(sf, it[sf.id])] as const)
                          .filter(([, x]) => x)
                          .map(([l, x]) => (
                            <div key={l}>
                              <span className="muted">{l}:</span> {x}
                            </div>
                          ))}
                      </dd>
                    ))}
                  </div>
                );
              }
              const text = fmt(f, v);
              if (!text) return null;
              return (
                <div key={f.id}>
                  <dt>{f.label}</dt>
                  <dd>{text}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </section>
  );
}

export function AIProposal({ answers, strategy }: { answers: Answers; strategy: Strategy }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [key, setKey] = useState(() => {
    try {
      return sessionStorage.getItem("lp_agency_key") || "";
    } catch {
      return "";
    }
  });
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(text, { async: false }) as string), [text]);

  const run = async () => {
    setState("loading");
    setText("");
    setError("");
    try {
      try {
        sessionStorage.setItem("lp_agency_key", key);
      } catch {
        /* sin almacenamiento */
      }
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-agency-key": key },
        body: JSON.stringify({ answers, strategy }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Error ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setText(acc);
      }
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  };

  return (
    <section className="panel">
      <h2>Propuesta estratégica con IA</h2>
      <p className="muted">
        Claude analiza el brief completo y el diagnóstico, y redacta una propuesta estratégica a medida: insight, concepto creativo, plan por unidad de negocio, campañas,
        presupuesto y KPIs. Úsala como borrador para la presentación al cliente.
      </p>
      <div className="ai-controls no-print">
        <input type="password" placeholder="Clave de agencia (si está configurada)" value={key} onChange={(e) => setKey(e.target.value)} aria-label="Clave de agencia" />
        <button className="btn primary" onClick={run} disabled={state === "loading"}>
          {state === "loading" ? "Generando…" : text ? "Volver a generar" : "Generar propuesta"}
        </button>
        {text && (
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(text)}>
            Copiar Markdown
          </button>
        )}
      </div>
      {state === "loading" && !text && <p className="muted">Analizando el brief… esto puede tardar uno o dos minutos.</p>}
      {state === "error" && <p className="field-error">{error}</p>}
      {text && <article className="markdown" dangerouslySetInnerHTML={{ __html: html }} />}
    </section>
  );
}
